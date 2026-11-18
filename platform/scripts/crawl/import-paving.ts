/**
 * Imports the street paving program from the project owner's map app
 * (github.com/jameshward3/OrangeStreetPaving, index.html seed data) as capital projects.
 * Each funding group (fund + amount + dates + status) becomes one project; each street is
 * drawn by matching its name to the Census road centerlines already loaded (whole street,
 * since project limits are not recorded). Imported as UNVERIFIED pending City Engineering.
 *
 *   tsx scripts/crawl/import-paving.ts <path-to-OrangeStreetPaving/index.html>
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../../src/payload.config'

const file = process.argv[2]
if (!file) { console.error('usage: import-paving.ts <index.html>'); process.exit(1) }
const html = readFileSync(file, 'utf8')
// Extract only the data block (helpers + seed()) and evaluate it in an empty sandbox — no DOM, no network, no require.
const start = html.indexOf('const S = y =>')
const seedAt = html.indexOf('function seed(){', start)
if (start < 0 || seedAt < 0) throw new Error('seed data not found')
let depth = 0, end = -1
for (let i = html.indexOf('{', seedAt); i < html.length; i++) { if (html[i] === '{') depth++; else if (html[i] === '}' && --depth === 0) { end = i + 1; break } }
// The app's own post-processing (past seasons → completed) is re-applied below, so stub it here.
const sandbox: any = { markPastComplete: (l: unknown) => l }
runInNewContext(`${html.slice(start, end)}\nresult = seed();`, sandbox, { timeout: 2000 })
const records: { name: string; ward: string; fund: string; amount: number; status: string; start: string; end: string }[] = sandbox.result
const nowYear = new Date().getFullYear()
for (const r of records) if (Number(r.end.slice(0, 4)) < nowYear && r.status !== 'completed') r.status = 'completed' // same rule as the app

const payload = await getPayload({ config })
const pg = (payload.db as any).pool
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const NOW = new Date().toISOString()
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '')
async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys } as any) as any
  return payload.create({ collection, data, ...sys } as any) as any
}
const src = await upsert('source-records', 'url', {
  title: 'Orange Township Roadway Improvements map (OrangeStreetPaving)', url: 'https://github.com/jameshward3/OrangeStreetPaving',
  owner: 'Project owner (GitHub: jameshward3); map also embedded on jw4o.com', ownerType: 'third_party', retrievedAt: NOW, status: 'captured',
  checksumSha256: createHash('sha256').update(html).digest('hex'),
  notes: `Street list, funding source, program amount, status and dates compiled by the project owner (${records.length} street records, 2012–2026). Imported at the project owner's request. Not an official City record — City Engineering must confirm streets, limits, costs and dates. Street lines are drawn from U.S. Census TIGER centerlines matched by name (whole street).`,
})

// ------------------------------------------------------------------ street name matching to TIGER centerlines
const SUF: Record<string, string> = { street: 'st', avenue: 'ave', av: 'ave', terrace: 'ter', place: 'pl', road: 'rd', court: 'ct', drive: 'dr', boulevard: 'blvd', lane: 'ln', parkway: 'pkwy', highway: 'hwy', way: 'way', circle: 'cir', north: 'n', south: 's', east: 'e', west: 'w' }
const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[.']/g, '').split(/[^a-z0-9]+/).filter(Boolean).map((w) => SUF[w] ?? w).join(' ').trim()
const roads = (await pg.query(`SELECT id, name FROM civic.road_segments WHERE name IS NOT NULL`)).rows as { id: number; name: string }[]
const byName = new Map<string, number[]>()
for (const r of roads) { const k = norm(r.name); byName.set(k, [...(byName.get(k) ?? []), r.id]) }
const baseOf = (k: string) => k.replace(/ (st|ave|ter|pl|rd|ct|dr|blvd|ln|pkwy|way|cir)$/, '')
function segmentsFor(street: string): number[] {
  const k = norm(street)
  if (byName.has(k)) return byName.get(k)!
  const cands = [...byName.keys()].filter((x) => baseOf(x) === baseOf(k))
  return cands.length === 1 ? byName.get(cands[0])! : []
}

// ------------------------------------------------------------------ group into projects
const groups = new Map<string, typeof records>()
for (const r of records) { const key = [r.fund, r.amount, r.status, r.start, r.end].join('|'); groups.set(key, [...(groups.get(key) ?? []), r]) }
const PHASE: Record<string, string> = { completed: 'substantially_complete', approved: 'awarded', pending: 'planned' }
const WARD = (w: string) => w.toLowerCase().split(/[\/,&]| and /).map((x) => x.trim()).filter((x) => ['north', 'south', 'east', 'west'].includes(x))
await pg.query(`DELETE FROM civic.project_geometries WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'paving-%')`)
let projects = 0, matched = 0
const unmatched: string[] = []
for (const [, rows] of groups) {
  const r0 = rows[0]
  const streets = rows.flatMap((r) => r.name.split(/\s+&\s+|\s+and\s+/i).map((n) => ({ name: n.replace(/\(.*?\)/g, '').trim(), ward: r.ward, display: r.name })))
  const year = Number(r0.start.slice(0, 4))
  const done = r0.status === 'completed'
  const listed = rows.map((r) => r.name)
  const p = await upsert('projects', 'slug', {
    slug: slugify(`paving-${r0.fund}-${r0.start}-${r0.amount}`),
    title: `${r0.fund} roadway improvements${listed.length <= 3 ? ` — ${listed.join(', ')}` : ` (${listed.length} streets)`}`,
    projectType: 'paving', phase: PHASE[r0.status] ?? 'planned', programYear: year,
    wards: [...new Set(rows.flatMap((r) => WARD(r.ward)))],
    streets: rows.map((r) => ({ name: r.name })),
    scope: `Roadway improvements funded by ${r0.fund}, covering ${rows.length} street${rows.length === 1 ? '' : 's'}. The program amount covers every street in this group. Street limits were not recorded; the map shows each whole street.`,
    agency: 'City of Orange Township',
    cost: { estimatedCents: Math.round(r0.amount * 100), basis: 'Program amount for this funding group, from the Orange Street Paving map compiled by the project owner. Not yet confirmed by City Engineering or Finance.' },
    funding: [{ source: r0.fund, amountCents: Math.round(r0.amount * 100), status: done || r0.status === 'approved' ? 'appropriated' : 'applied' }],
    milestones: [
      { kind: 'construction_start', label: 'Construction season start', plannedDate: done ? undefined : r0.start, actualDate: done ? r0.start : undefined },
      { kind: 'substantial_completion', label: 'Completion', plannedDate: done ? undefined : r0.end, actualDate: done ? r0.end : undefined },
    ],
    geometryNote: 'Whole street drawn from U.S. Census TIGER centerlines matched by name; project limits not recorded.',
    workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [src.id],
  })
  projects++
  for (const s of streets) {
    const ids = segmentsFor(s.name)
    if (!ids.length) { unmatched.push(s.name); continue }
    matched++
    await pg.query(`INSERT INTO civic.project_geometries (project_id, label, geom, verification)
      SELECT $1, $2, ST_LineMerge(ST_Union(geom)), 'unverified' FROM civic.road_segments WHERE id = ANY($3::int[])`, [p.id, s.name, ids])
  }
}
console.log({ streetRecords: records.length, projects, streetsMatched: matched, unmatched: [...new Set(unmatched)] })
process.exit(0)
