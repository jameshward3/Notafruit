/**
 * Permanently removes all illustrative demo content (verificationStatus = 'demo')
 * and its demo geometry. Real and imported records are untouched.
 *
 *   tsx scripts/remove-demo.ts
 */
import 'dotenv/config'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const demo = { verificationStatus: { equals: 'demo' } } as const

// Budget lines belong to demo datasets.
const datasets = await payload.find({ collection: 'budget-datasets', where: demo, limit: 1000, depth: 0, overrideAccess: true })
if (datasets.docs.length) {
  const r = await payload.delete({ collection: 'budget-lines', where: { dataset: { in: datasets.docs.map((d) => d.id) } }, ...sys })
  console.log('budget-lines', r.docs.length)
}
// Children before parents (votes → meetings/legislation, updates → projects).
for (const c of ['votes', 'project-updates', 'meetings', 'legislation', 'projects', 'budget-datasets', 'notices', 'events', 'seasonal-features', 'places'] as CollectionSlug[]) {
  const r = await payload.delete({ collection: c, where: demo as any, ...sys })
  console.log(c, r.docs.length, r.errors?.length ? `errors: ${r.errors.map((e: any) => e.message).join('; ')}` : '')
}
const pg = (payload.db as any).pool
console.log('project geometries', (await pg.query(`DELETE FROM civic.project_geometries WHERE verification='demo'`)).rowCount)
console.log('place points', (await pg.query(`DELETE FROM civic.place_points WHERE verification='demo'`)).rowCount)
console.log('search entries', (await pg.query('DELETE FROM civic.search_documents WHERE is_demo')).rowCount)
process.exit(0)
