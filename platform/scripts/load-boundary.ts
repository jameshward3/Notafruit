/**
 * Load an official boundary file into civic.boundary_versions + geometry tables.
 * Refuses invalid geometry (never "fixes" source data silently) and is
 * idempotent by checksum. See docs/gis-provenance.md.
 *
 *   tsx scripts/load-boundary.ts --kind municipal --file data/boundaries/x.geojson \
 *     --custodian "..." --source-url "..." --source-crs "EPSG:4269" --verification verified [--ward north]
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'

export async function loadBoundary(client: pg.Client | pg.PoolClient, o: { kind: 'municipal' | 'ward'; file: string; custodian: string; sourceUrl: string; sourceCrs: string; verification: 'verified' | 'unverified' | 'demo'; label: string; ward?: string; notes?: string; effectiveFrom?: string }) {
  const raw = readFileSync(o.file, 'utf8')
  const checksum = createHash('sha256').update(raw).digest('hex')
  const existing = await client.query('SELECT id FROM civic.boundary_versions WHERE checksum_sha256=$1 AND kind=$2', [checksum, o.kind])
  if (existing.rows[0]) return { id: existing.rows[0].id as number, created: false }
  const fc = JSON.parse(raw)
  const geom = fc.type === 'FeatureCollection' ? fc.features[0].geometry : fc.type === 'Feature' ? fc.geometry : fc
  const v = await client.query(`SELECT ST_IsValid(g) ok, ST_IsValidReason(g) why FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) g) s`, [JSON.stringify(geom)])
  if (!v.rows[0].ok) throw new Error(`Invalid geometry in ${o.file}: ${v.rows[0].why}. Ask the custodian; do not repair silently.`)
  await client.query('BEGIN')
  try {
    const ver = await client.query(
      `INSERT INTO civic.boundary_versions (kind,label,custodian,source_url,source_crs,effective_from,verification,checksum_sha256,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [o.kind, o.label, o.custodian, o.sourceUrl, o.sourceCrs, o.effectiveFrom ?? null, o.verification, checksum, o.notes ?? null])
    const id = ver.rows[0].id as number
    if (o.kind === 'municipal') {
      await client.query(`INSERT INTO civic.municipal_geometries (boundary_version_id, geom) VALUES ($1, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2),4326)))`, [id, JSON.stringify(geom)])
    } else {
      await client.query(`INSERT INTO civic.ward_geometries (boundary_version_id, ward_slug, geom) VALUES ($1,$2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3),4326)))`, [id, o.ward, JSON.stringify(geom)])
    }
    await client.query('COMMIT')
    return { id, created: true }
  } catch (e) { await client.query('ROLLBACK'); throw e }
}

export const ORANGE_MUNICIPAL_CENSUS = {
  kind: 'municipal' as const,
  file: 'data/boundaries/orange-municipal-census-3401313045.geojson',
  label: 'City of Orange township (Census GEOID 3401313045)',
  custodian: 'U.S. Census Bureau — TIGERweb County Subdivisions (legal boundaries reported by the municipality through the Boundary and Annexation Survey)',
  sourceUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/1/query?where=GEOID='3401313045'&outFields=*&outSR=4326&f=geojson",
  sourceCrs: 'EPSG:4269 (NAD83), delivered reprojected to EPSG:4326 by TIGERweb',
  verification: 'verified' as const,
  notes: 'Retrieved 2026-11-17. Official federal record of the legal municipal boundary; not a cadastral survey. Compared with the ZIP 07050 polygon used on jw4o.com: 98% overlap, max edge gap 79 m.',
}

if (process.argv[1]?.endsWith('load-boundary.ts')) {
  const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const o = arg('file') ? { kind: arg('kind') as any, file: arg('file')!, label: arg('label') ?? arg('file')!, custodian: arg('custodian')!, sourceUrl: arg('source-url')!, sourceCrs: arg('source-crs')!, verification: (arg('verification') ?? 'unverified') as any, ward: arg('ward') } : ORANGE_MUNICIPAL_CENSUS
  console.log(await loadBoundary(client, o))
  await client.end()
}
