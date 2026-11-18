/**
 * Loads public-government reference layers for the Explore map (idempotent):
 *  - Ward boundaries + election districts: NJ Office of GIS (NJOGIS), statewide
 *    "Ward Boundaries for New Jersey" / "Election Districts for New Jersey".
 *    Loaded as UNVERIFIED until the City Clerk confirms they match the current
 *    ward ordinance (docs/gis-provenance.md).
 *  - Road centerlines: U.S. Census Bureau TIGERweb (public domain), clipped to the
 *    verified municipal boundary.
 *  - Schools: NCES EDGE public (2024–25) and private (2023–24) school locations,
 *    kept only if inside the municipal boundary.
 * Files live in data/boundaries and data/layers with SHA-256 recorded in source-records.
 *
 *   tsx scripts/load-map-layers.ts
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const pg = (payload.db as any).pool
const sys = { overrideAccess: true, context: { system: true } } as const
const now = new Date().toISOString()
const read = (f: string) => { const raw = readFileSync(f, 'utf8'); return { json: JSON.parse(raw), sha: createHash('sha256').update(raw).digest('hex') } }

async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys }) as any
  return payload.create({ collection, data, ...sys } as any) as any
}

// ------------------------------------------------------------------ wards + election districts
const NJ = 'https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services'
const wardsFile = read('data/boundaries/orange-wards-njogis.geojson')
const edFile = read('data/boundaries/orange-election-districts-njogis.geojson')
const wardSrc = await upsert('source-records', 'url', {
  title: 'Ward Boundaries for New Jersey — City of Orange Township (NJ Office of GIS)', url: `${NJ}/Ward_Boundaries_for_New_Jersey/FeatureServer/0`,
  owner: 'State of New Jersey, Office of GIS (NJOGIS)', ownerType: 'government', retrievedAt: now, status: 'captured', checksumSha256: wardsFile.sha,
  notes: 'Statewide dataset compiled from county/municipal election district and ward maps; service last edited 2021-11-24. Four wards for municipality code 0717 (East, North, South, West). NOT yet confirmed by the City Clerk against the current ward ordinance — shown as unverified; not used for authoritative ward lookup.',
})
const edSrc = await upsert('source-records', 'url', {
  title: 'Election Districts for New Jersey — City of Orange Township (NJ Office of GIS)', url: `${NJ}/Election_Districts_for_New_Jersey/FeatureServer/0`,
  owner: 'State of New Jersey, Office of GIS (NJOGIS)', ownerType: 'government', retrievedAt: now, status: 'captured', checksumSha256: edFile.sha,
  notes: 'Election districts with ward, congressional (10), legislative (34) and county commissioner district codes. Service last edited 2021-11-24. Unverified.',
})

const client = await pg.connect()
try {
  await client.query('BEGIN')
  let ver = (await client.query(`SELECT id FROM civic.boundary_versions WHERE kind='ward' AND checksum_sha256=$1`, [wardsFile.sha])).rows[0]
  if (!ver) {
    ver = (await client.query(
      `INSERT INTO civic.boundary_versions (kind,label,custodian,source_url,source_record_id,source_crs,effective_from,verification,checksum_sha256,notes)
       VALUES ('ward',$1,$2,$3,$4,$5,NULL,'unverified',$6,$7) RETURNING id`,
      ['City of Orange Township wards (NJOGIS statewide ward layer)', 'State of New Jersey, Office of GIS (NJOGIS) — compiled from county and municipal ward maps',
        `${NJ}/Ward_Boundaries_for_New_Jersey/FeatureServer/0`, wardSrc.id, 'EPSG:3424 (NJ State Plane ft), delivered reprojected to EPSG:4326 by ArcGIS', wardsFile.sha,
        'Service last edited 2021-11-24. Awaiting City Clerk confirmation against the current ward ordinance.'])).rows[0]
    for (const f of wardsFile.json.features) {
      const slug = String(f.properties.WARD_CODE).toLowerCase()
      const v = (await client.query(`SELECT ST_IsValid(g) ok, ST_IsValidReason(g) why FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) g) s`, [JSON.stringify(f.geometry)])).rows[0]
      if (!v.ok) throw new Error(`Ward ${slug} geometry invalid (${v.why}). Not repaired silently — ask the custodian.`)
      await client.query(`INSERT INTO civic.ward_geometries (boundary_version_id, ward_slug, geom) VALUES ($1,$2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3),4326)))`, [ver.id, slug, JSON.stringify(f.geometry)])
    }
  }
  await client.query('DELETE FROM civic.election_districts WHERE boundary_version_id=$1', [ver.id])
  for (const f of edFile.json.features) {
    const p = f.properties
    await client.query(`INSERT INTO civic.election_districts (boundary_version_id, ward_slug, district, congressional, legislative, county_commission, geom)
      VALUES ($1,$2,$3,$4,$5,$6, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($7),4326))))`,
      [ver.id, String(p.WARD_CODE).toLowerCase(), p.ELECD_CODE, p.CONGR_DIST, p.LEGIS_DIST, p.COCOM_DIST, JSON.stringify(f.geometry)])
  }
  await client.query('COMMIT')
  const { validateWardVersion } = await import('../src/lib/gis')
  const city = (await client.query(`SELECT id FROM civic.boundary_versions WHERE kind='municipal' AND verification='verified' ORDER BY id DESC LIMIT 1`)).rows[0]
  console.log('ward version', ver.id, 'validation vs municipal boundary:', await validateWardVersion(payload, ver.id, city.id))
} catch (e) { await client.query('ROLLBACK'); throw e } finally { client.release() }

// ------------------------------------------------------------------ roads (TIGER)
const roadSrc = await upsert('source-records', 'url', {
  title: 'Road centerlines — U.S. Census Bureau TIGERweb Transportation (primary, secondary, local roads)', url: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer',
  owner: 'U.S. Census Bureau', ownerType: 'government', retrievedAt: now, status: 'captured',
  checksumSha256: createHash('sha256').update(['2', '6', '8'].map((l) => readFileSync(`data/layers/tiger-roads-${l}.geojson`, 'utf8')).join('')).digest('hex'),
  notes: 'Public-domain federal road centerlines (layers 2, 6, 8), clipped to the municipal boundary. Street names as recorded by the Census Bureau; not the City\'s official street list. Jurisdiction (City/County/State) is not encoded.',
})
const roadClass = (mtfcc: string, rttyp: string | null) => mtfcc === 'S1100' && rttyp === 'I' ? 'interstate' : ['S1100', 'S1200'].includes(mtfcc) ? 'state_or_county' : mtfcc === 'S1400' ? 'local' : 'other'
await pg.query('DELETE FROM civic.road_segments')
let roads = 0
for (const l of ['2', '6', '8']) {
  for (const f of JSON.parse(readFileSync(`data/layers/tiger-roads-${l}.geojson`, 'utf8')).features) {
    const p = f.properties
    const r = await pg.query(
      `WITH c AS (SELECT ST_Union(geom) g FROM civic.municipal_geometries m JOIN civic.boundary_versions v ON v.id=m.boundary_version_id WHERE v.verification='verified'),
            s AS (SELECT ST_CollectionExtract(ST_Intersection(ST_SetSRID(ST_GeomFromGeoJSON($1),4326), ST_Buffer(c.g::geography, 3)::geometry), 2) g FROM c)
       INSERT INTO civic.road_segments (source_oid, name, mtfcc, road_class, source_record_id, geom, length_m)
       SELECT $2, $3, $4, $5, $6, ST_Multi(g), ST_Length(g::geography) FROM s WHERE NOT ST_IsEmpty(g) AND ST_Length(g::geography) > 5
       ON CONFLICT (source_oid) DO NOTHING`,
      [JSON.stringify(f.geometry), String(p.OID), p.NAME, p.MTFCC, roadClass(p.MTFCC, p.RTTYP), roadSrc.id])
    roads += r.rowCount ?? 0
  }
}
console.log('road segments inside the City:', roads)

// ------------------------------------------------------------------ schools (NCES EDGE)
const NCES = 'https://nces.ed.gov/opengis/rest/services/K12_School_Locations'
const schoolSets = [
  { file: 'data/layers/nces-PUBLICSCH_2425.geojson', url: `${NCES}/EDGE_GEOCODE_PUBLICSCH_2425/MapServer/0`, title: 'Public school locations 2024–25 — NCES EDGE', id: 'NCESSCH' },
  { file: 'data/layers/nces-PRIVATESCH_2324.geojson', url: `${NCES}/EDGE_GEOCODE_PRIVATESCH_2324/MapServer/0`, title: 'Private school locations 2023–24 — NCES EDGE (Private School Survey)', id: 'PPIN' },
]
const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bOf\b/g, 'of').replace(/\bAnd\b/g, 'and')
let schools = 0
for (const set of schoolSets) {
  const f = read(set.file)
  const src = await upsert('source-records', 'url', { title: set.title, url: set.url, owner: 'U.S. Department of Education, National Center for Education Statistics', ownerType: 'government', retrievedAt: now, status: 'captured', checksumSha256: f.sha,
    notes: 'Geocoded school locations (public domain). Kept only schools whose point falls inside the municipal boundary. Locations are NCES geocodes, not surveyed.' })
  for (const ft of f.json.features) {
    const [lng, lat] = ft.geometry.coordinates
    const inside = (await pg.query(`SELECT 1 FROM civic.municipal_geometries m JOIN civic.boundary_versions v ON v.id=m.boundary_version_id WHERE v.verification='verified' AND ST_Covers(m.geom, ST_SetSRID(ST_MakePoint($1,$2),4326))`, [lng, lat])).rowCount
    if (!inside) continue
    const p = ft.properties
    const isPublic = set.id === 'NCESSCH'
    const district = isPublic && String(p.LEAID) === '3412270'
    await upsert('places', 'slug', {
      name: title(p.NAME), slug: `school-${String(p[set.id]).toLowerCase()}`, kind: 'school',
      jurisdiction: district ? 'school_district' : 'other',
      address: `${title(p.STREET)}, Orange, NJ ${String(p.ZIP ?? '').slice(0, 5)}`.trim(),
      summary: district ? 'Public school operated by the Orange Board of Education (Orange Public Schools), not the City. Contact the school district for enrollment and school matters.'
        : isPublic ? 'Public charter or other public school listed by NCES. Not operated by the City.' : 'Private school listed in the NCES Private School Survey. Not operated by the City.',
      latitude: lat, longitude: lng, verificationStatus: 'unverified', workflowStatus: 'published', publishedAt: now, sources: [src.id],
    })
    schools++
  }
}
console.log('schools inside the City:', schools)
process.exit(0)
