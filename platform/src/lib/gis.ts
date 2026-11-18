/**
 * Ward determination. Authoritative ONLY when a *verified* ward boundary
 * version is effective on the requested date. Unverified or demo geometry can
 * be drawn (labeled) but never yields an authoritative ward.
 */
import type { Payload } from 'payload'
import { q } from './db'

export const BOUNDARY_TOLERANCE_M = 15

export type WardLookup =
  | { status: 'unavailable'; reason: string }
  | { status: 'outside'; message: string }
  | { status: 'ok'; ward: string; authoritative: true; versionId: number; custodian: string }
  | { status: 'ambiguous'; candidates: string[]; message: string; versionId: number }
  | { status: 'illustrative'; ward: string | null; authoritative: false; message: string }

async function effectiveVersion(payload: Payload, kind: 'ward' | 'municipal', verifiedOnly: boolean, onDate: string) {
  const rows = await q(
    payload,
    `SELECT id, verification, custodian FROM civic.boundary_versions
      WHERE kind=$1 AND (effective_from IS NULL OR effective_from <= $2::date)
        AND (effective_to IS NULL OR effective_to > $2::date)
        ${verifiedOnly ? "AND verification='verified'" : ''}
      ORDER BY (verification='verified') DESC, effective_from DESC NULLS LAST, id DESC LIMIT 1`,
    [kind, onDate],
  )
  return rows[0] as { id: number; verification: string; custodian: string } | undefined
}

export async function lookupWard(
  payload: Payload,
  lng: number,
  lat: number,
  opts: { onDate?: string; allowIllustrative?: boolean } = {},
): Promise<WardLookup> {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { status: 'unavailable', reason: 'Invalid coordinates.' }
  }
  const onDate = opts.onDate ?? new Date().toISOString().slice(0, 10)
  const wardV = await effectiveVersion(payload, 'ward', true, onDate)
  const cityV = await effectiveVersion(payload, 'municipal', true, onDate)

  if (!wardV || !cityV) {
    if (opts.allowIllustrative) {
      const demo = await effectiveVersion(payload, 'ward', false, onDate)
      if (demo) {
        const hit = await q(payload,
          `SELECT ward_slug FROM civic.ward_geometries WHERE boundary_version_id=$1 AND ST_Covers(geom, ST_SetSRID(ST_MakePoint($2,$3),4326)) LIMIT 1`,
          [demo.id, lng, lat])
        return { status: 'illustrative', ward: hit[0]?.ward_slug ?? null, authoritative: false,
          message: 'Illustrative development geometry only. This is not an official ward determination.' }
      }
    }
    return { status: 'unavailable', reason: 'Verified ward boundaries have not been published yet. Contact the City Clerk to confirm your ward.' }
  }

  const pt = 'ST_SetSRID(ST_MakePoint($2,$3),4326)'
  const inside = await q(payload, `SELECT 1 FROM civic.municipal_geometries WHERE boundary_version_id=$1 AND ST_Covers(geom, ${pt})`, [cityV.id, lng, lat])
  if (!inside.length) {
    const near = await q(payload,
      `SELECT 1 FROM civic.municipal_geometries WHERE boundary_version_id=$1 AND ST_DWithin(geom::geography, ${pt}::geography, $4)`,
      [cityV.id, lng, lat, BOUNDARY_TOLERANCE_M])
    return { status: 'outside', message: near.length
      ? 'This location is at the edge of the City boundary. Please contact the City Clerk to confirm.'
      : 'This address appears to be outside the City of Orange Township.' }
  }
  const candidates = await q<{ ward_slug: string; covers: boolean }>(payload,
    `SELECT ward_slug, ST_Covers(geom, ${pt}) AS covers FROM civic.ward_geometries
      WHERE boundary_version_id=$1 AND ST_DWithin(geom::geography, ${pt}::geography, $4)`,
    [wardV.id, lng, lat, BOUNDARY_TOLERANCE_M])
  const covering = candidates.filter((c) => c.covers)
  if (candidates.length === 1 && covering.length === 1) {
    return { status: 'ok', ward: covering[0].ward_slug, authoritative: true, versionId: wardV.id, custodian: wardV.custodian }
  }
  if (candidates.length === 0) {
    // Inside the city but in no ward: a data gap. Never guess.
    return { status: 'unavailable', reason: 'No ward covers this location in the published boundary data. Staff have been asked to review.' }
  }
  return { status: 'ambiguous', versionId: wardV.id, candidates: candidates.map((c) => c.ward_slug).sort(),
    message: `This location is within ${BOUNDARY_TOLERANCE_M} m of a ward boundary. Please confirm your ward with the City Clerk.` }
}

/** Validation report for a boundary version: invalid rings, overlaps, gaps vs. municipal outline, containment. */
export async function validateWardVersion(payload: Payload, wardVersionId: number, cityVersionId: number) {
  const [r] = await q(payload,
    `WITH w AS (SELECT ward_slug, geom FROM civic.ward_geometries WHERE boundary_version_id=$1),
          c AS (SELECT ST_Union(geom) g FROM civic.municipal_geometries WHERE boundary_version_id=$2)
     SELECT
       (SELECT count(*) FROM w WHERE NOT ST_IsValid(geom)) AS invalid,
       (SELECT coalesce(sum(ST_Area(ST_Intersection(a.geom,b.geom)::geography)),0) FROM w a JOIN w b ON a.ward_slug < b.ward_slug AND ST_Intersects(a.geom,b.geom)) AS overlap_m2,
       (SELECT ST_Area(ST_Difference(c.g, ST_Union(w.geom))::geography) FROM w, c GROUP BY c.g) AS gap_m2,
       (SELECT ST_Area(ST_Difference(ST_Union(w.geom), c.g)::geography) FROM w, c GROUP BY c.g) AS outside_m2,
       (SELECT count(*) FROM w) AS wards`,
    [wardVersionId, cityVersionId])
  return { invalid: Number(r.invalid), overlapM2: Number(r.overlap_m2), gapM2: Number(r.gap_m2 ?? 0), outsideM2: Number(r.outside_m2 ?? 0), wards: Number(r.wards) }
}

export async function wardGeoJSON(payload: Payload) {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  if (!v) return null
  const rows = await q(payload, `SELECT ward_slug, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.ward_geometries WHERE boundary_version_id=$1`, [v.id])
  return {
    verification: v.verification as 'verified' | 'unverified' | 'demo',
    custodian: v.custodian,
    fc: { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { ward: r.ward_slug }, geometry: r.g })) },
  }
}

export async function projectGeoJSON(payload: Payload, projectIds: number[]) {
  if (!projectIds.length) return { type: 'FeatureCollection', features: [] }
  const rows = await q(payload,
    `SELECT project_id, label, verification, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.project_geometries WHERE project_id = ANY($1::int[])`,
    [projectIds])
  return { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { projectId: r.project_id, label: r.label, verification: r.verification }, geometry: r.g })) }
}

export async function placesGeoJSON(payload: Payload, places: { id: number; slug: string; name: string; jurisdiction: string; kind: string }[]) {
  if (!places.length) return { type: 'FeatureCollection', features: [] }
  const byId = new Map(places.map((p) => [p.id, p]))
  const rows = await q(payload, `SELECT place_id, verification, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.place_points WHERE place_id = ANY($1::int[])`, [places.map((p) => p.id)])
  return { type: 'FeatureCollection', features: rows.map((r) => { const p = byId.get(r.place_id)!; return { type: 'Feature', properties: { slug: p.slug, name: p.name, jurisdiction: p.jurisdiction, kind: p.kind, verification: r.verification }, geometry: r.g } }) }
}

/** Current municipal boundary for display, with its provenance. */
export async function municipalGeoJSON(payload: Payload) {
  const v = await effectiveVersion(payload, 'municipal', false, new Date().toISOString().slice(0, 10))
  if (!v) return null
  const rows = await q(payload, `SELECT ST_AsGeoJSON(ST_Union(geom), 6)::json AS g FROM civic.municipal_geometries WHERE boundary_version_id=$1`, [v.id])
  if (!rows[0]?.g) return null
  return { verification: v.verification as 'verified' | 'unverified' | 'demo', custodian: v.custodian, geometry: rows[0].g as { type: string; coordinates: any } }
}

// ------------------------------------------------------------------ Ward explorer layers
/** Ward of each point, from the current ward version (verified or not). Display only — never an official determination. */
export async function wardOfPlaces(payload: Payload, placeIds: number[]): Promise<Map<number, string>> {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  if (!v || !placeIds.length) return new Map()
  const rows = await q(payload, `SELECT p.place_id, w.ward_slug FROM civic.place_points p JOIN civic.ward_geometries w ON w.boundary_version_id=$1 AND ST_Covers(w.geom, p.geom) WHERE p.place_id = ANY($2::int[])`, [v.id, placeIds])
  return new Map(rows.map((r) => [r.place_id, r.ward_slug]))
}

export async function roadsGeoJSON(payload: Payload) {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  const rows = await q(payload,
    `SELECT r.id, r.name, r.road_class, round(r.length_m) AS length_m, ST_AsGeoJSON(r.geom, 6)::json AS g,
            (SELECT array_agg(DISTINCT w.ward_slug) FROM civic.ward_geometries w WHERE w.boundary_version_id=$1 AND ST_Intersects(w.geom, r.geom)) AS wards
       FROM civic.road_segments r`, [v?.id ?? -1])
  return { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { id: r.id, name: r.name ?? 'Unnamed road', roadClass: r.road_class, lengthM: Number(r.length_m), wards: (r.wards ?? []).join(',') }, geometry: r.g })) }
}

export async function districtsGeoJSON(payload: Payload) {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  if (!v) return null
  const rows = await q(payload, `SELECT ward_slug, district, congressional, legislative, county_commission, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.election_districts WHERE boundary_version_id=$1`, [v.id])
  return { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { ward: r.ward_slug, district: r.district, congressional: r.congressional, legislative: r.legislative, county: r.county_commission }, geometry: r.g })) }
}

export type WardStats = {
  ward: string; areaKm2: number; bbox: [number, number, number, number]
  roadKm: { interstate: number; state_or_county: number; local: number; other: number }; streetNames: number
  districts: string[]; congressional: string[]; legislative: string[]; county: string[]
  places: Record<string, number>; projects: number
}

/** Per-ward figures computed from the current ward version and the loaded layers. */
export async function wardStats(payload: Payload, projectIds: number[] = []): Promise<{ verification: string; custodian: string; stats: WardStats[] } | null> {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  if (!v) return null
  const rows = await q(payload,
    `SELECT w.ward_slug,
            ST_Area(w.geom::geography)/1e6 AS area_km2,
            ST_XMin(w.geom) x0, ST_YMin(w.geom) y0, ST_XMax(w.geom) x1, ST_YMax(w.geom) y1,
            (SELECT json_object_agg(road_class, km) FROM (SELECT r.road_class, sum(ST_Length(ST_Intersection(r.geom, w.geom)::geography))/1000 km
               FROM civic.road_segments r WHERE ST_Intersects(r.geom, w.geom) GROUP BY r.road_class) s) AS roads,
            (SELECT count(DISTINCT lower(r.name)) FROM civic.road_segments r WHERE ST_Intersects(r.geom, w.geom) AND r.name IS NOT NULL) AS street_names,
            (SELECT json_agg(json_build_object('d', e.district, 'c', e.congressional, 'l', e.legislative, 'k', e.county_commission) ORDER BY e.district)
               FROM civic.election_districts e WHERE e.boundary_version_id=w.boundary_version_id AND e.ward_slug=w.ward_slug) AS districts,
            (SELECT count(DISTINCT g.project_id) FROM civic.project_geometries g WHERE g.project_id = ANY($2::int[]) AND ST_Intersects(g.geom, w.geom)) AS projects
       FROM civic.ward_geometries w WHERE w.boundary_version_id=$1 ORDER BY w.ward_slug`, [v.id, projectIds])
  const placeRows = await q(payload,
    `SELECT w.ward_slug, pl.kind, count(*)::int n FROM civic.ward_geometries w
       JOIN civic.place_points p ON ST_Covers(w.geom, p.geom)
       JOIN public.places pl ON pl.id = p.place_id AND pl.workflow_status = 'published'
      WHERE w.boundary_version_id=$1 GROUP BY 1, 2`, [v.id])
  const uniq = (xs: any[]) => [...new Set(xs.filter(Boolean))].sort()
  return {
    verification: v.verification, custodian: v.custodian,
    stats: rows.map((r) => ({
      ward: r.ward_slug, areaKm2: Number(r.area_km2), bbox: [Number(r.x0), Number(r.y0), Number(r.x1), Number(r.y1)],
      roadKm: { interstate: 0, state_or_county: 0, local: 0, other: 0, ...Object.fromEntries(Object.entries(r.roads ?? {}).map(([k, x]) => [k, Number(x)])) },
      streetNames: Number(r.street_names),
      districts: (r.districts ?? []).map((d: any) => d.d), congressional: uniq((r.districts ?? []).map((d: any) => d.c)),
      legislative: uniq((r.districts ?? []).map((d: any) => d.l)), county: uniq((r.districts ?? []).map((d: any) => d.k)),
      places: Object.fromEntries(placeRows.filter((p) => p.ward_slug === r.ward_slug).map((p) => [p.kind, p.n])),
      projects: Number(r.projects),
    })),
  }
}
