/**
 * Loads every active street address in ZIP 07050 from the NJ Office of GIS NG911
 * Address Points service into civic.address_points (address autocomplete + ward lookup).
 * The download is saved to data/layers/njogis-address-points-07050.json (re-used if present;
 * pass --refresh to download again). Idempotent.
 *
 *   tsx scripts/load-addresses.ts [--refresh]
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { normalizeAddress } from '../src/lib/address'

const SERVICE = 'https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/AddressPoints/FeatureServer/0'
const FILE = 'data/layers/njogis-address-points-07050.json'
const FIELDS = 'FULLADDR,ADD_NUMBER,POST_COMM,POST_CODE,INC_MUNI,LONG_,LAT,STATUS'

type Row = { FULLADDR: string; ADD_NUMBER: number | null; POST_COMM: string | null; POST_CODE: string; INC_MUNI: string | null; LONG_: number; LAT: number; STATUS: string }

async function download(): Promise<Row[]> {
  const out: Row[] = []
  for (let offset = 0; ; offset += 2000) {
    const u = new URL(`${SERVICE}/query`)
    for (const [k, v] of Object.entries({ where: "POST_CODE='07050' AND STATUS='A'", outFields: FIELDS, returnGeometry: 'false', orderByFields: 'OBJECTID', resultOffset: String(offset), resultRecordCount: '2000', f: 'json' })) u.searchParams.set(k, v)
    const res = await fetch(u, { signal: AbortSignal.timeout(120_000) })
    const json = await res.json() as { features?: { attributes: Row }[]; exceededTransferLimit?: boolean; error?: unknown }
    if (json.error || !json.features) throw new Error(`service error: ${JSON.stringify(json.error ?? json).slice(0, 300)}`)
    out.push(...json.features.map((f) => f.attributes))
    console.log(`downloaded ${out.length}`)
    if (json.features.length < 2000 && !json.exceededTransferLimit) break
  }
  return out
}

const rows: Row[] = existsSync(FILE) && !process.argv.includes('--refresh') ? JSON.parse(readFileSync(FILE, 'utf8')) : await download()
if (!existsSync(FILE) || process.argv.includes('--refresh')) writeFileSync(FILE, JSON.stringify(rows))
const sha = createHash('sha256').update(readFileSync(FILE)).digest('hex')

// One row per distinct address (apartment units collapse to the building's first point).
const seen = new Map<string, Row>()
for (const r of rows) if (r.FULLADDR && Number.isFinite(r.LONG_) && Number.isFinite(r.LAT) && !seen.has(r.FULLADDR)) seen.set(r.FULLADDR, r)

const payload = await getPayload({ config })
const pg = (payload.db as any).pool
const client = await pg.connect()
try {
  await client.query('BEGIN')
  await client.query("DELETE FROM civic.address_points WHERE post_code='07050'")
  const list = [...seen.values()]
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500)
    const vals: unknown[] = []
    const tuples = chunk.map((r, j) => {
      const norm = normalizeAddress(r.FULLADDR)
      const street = norm.replace(/^\d+[a-z]?(-\d+[a-z]?)?\s+/, '')
      vals.push(r.FULLADDR, norm, street, r.ADD_NUMBER ?? null, r.POST_COMM, r.POST_CODE, r.INC_MUNI, r.LONG_, r.LAT)
      const b = j * 9
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`
    })
    await client.query(`INSERT INTO civic.address_points (full_addr, norm, street_norm, house_number, post_comm, post_code, muni_code, lng, lat) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING`, vals)
  }
  await client.query('COMMIT')
  console.log(`address points: ${list.length} distinct addresses from ${rows.length} active points`)
} catch (e) { await client.query('ROLLBACK'); throw e } finally { client.release() }

const found = await payload.find({ collection: 'source-records', where: { url: { equals: SERVICE } }, limit: 1, overrideAccess: true })
const data = {
  title: 'NG911 Address Points — ZIP 07050 (NJ Office of GIS)', url: SERVICE, owner: 'State of New Jersey, Office of GIS (NJOGIS)', ownerType: 'government',
  retrievedAt: new Date().toISOString(), status: 'captured', checksumSha256: sha,
  notes: 'Active address points with postal code 07050, used for address autocomplete and ward lookup. Units are collapsed to one point per street address. ZIP 07050 can include addresses just outside the City; the ward lookup checks the municipal boundary.',
}
if (found.docs[0]) await payload.update({ collection: 'source-records', id: found.docs[0].id, data, overrideAccess: true } as any)
else await payload.create({ collection: 'source-records', data, overrideAccess: true } as any)
process.exit(0)
