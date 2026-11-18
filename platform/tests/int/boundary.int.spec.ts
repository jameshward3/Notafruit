import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { loadBoundary, ORANGE_MUNICIPAL_CENSUS } from '../../scripts/load-boundary'
import { lookupWard, municipalGeoJSON } from '@/lib/gis'
import { payloadForTests } from '../helpers'

let payload: Payload
let versionId: number
const pool = () => (payload.db as any).pool

beforeAll(async () => {
  payload = await payloadForTests()
  const client = await pool().connect()
  try { versionId = (await loadBoundary(client, ORANGE_MUNICIPAL_CENSUS)).id } finally { client.release() }
})
afterAll(async () => {
  // Leave the shared test DB as other specs expect it.
  await pool().query('DELETE FROM civic.municipal_geometries WHERE boundary_version_id=$1', [versionId])
  await pool().query('DELETE FROM civic.boundary_versions WHERE id=$1', [versionId])
})

describe('official municipal boundary (U.S. Census Bureau, GEOID 3401313045)', () => {
  it('loads idempotently with provenance and valid geometry of the expected size', async () => {
    const client = await pool().connect()
    try { expect((await loadBoundary(client, ORANGE_MUNICIPAL_CENSUS)).created).toBe(false) } finally { client.release() }
    const [r] = (await pool().query(`SELECT v.verification, v.checksum_sha256, ST_IsValid(g.geom) ok, ST_Area(g.geom::geography)/1e6 km2
      FROM civic.boundary_versions v JOIN civic.municipal_geometries g ON g.boundary_version_id=v.id WHERE v.id=$1`, [versionId])).rows
    expect(r).toMatchObject({ verification: 'verified', ok: true, checksum_sha256: 'd709b224953816f8a3f16a1259566383d0f2c594c53058192f998ab4116e214e' })
    expect(Number(r.km2)).toBeGreaterThan(5.6)
    expect(Number(r.km2)).toBeLessThan(5.8) // Census AREALAND 5.73 km² + water
  })

  it('serves the boundary for maps', async () => {
    const b = await municipalGeoJSON(payload)
    expect(b?.verification).toBe('verified')
    expect(b?.custodian).toMatch(/Census Bureau/)
  })

  it('still refuses an authoritative ward without verified ward polygons', async () => {
    // Inside the city (near City Hall) — municipal boundary alone never yields a ward.
    expect((await lookupWard(payload, -74.2326, 40.7704)).status).toBe('unavailable')
  })

  it('rejects invalid geometry instead of repairing it', async () => {
    const { writeFileSync } = await import('node:fs')
    writeFileSync('test-results/bowtie.geojson', JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] }))
    const client = await pool().connect()
    try {
      await expect(loadBoundary(client, { ...ORANGE_MUNICIPAL_CENSUS, file: 'test-results/bowtie.geojson' })).rejects.toThrow(/Invalid geometry/)
    } finally { client.release() }
  })
})
