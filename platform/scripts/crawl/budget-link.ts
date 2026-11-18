/**
 * Connects legislation to the budget (rebuild of the Legislative Tracker's budget logic).
 *  1. Loads the budget figures used by the Orange Legislative Tracker
 *     (budget-dashboard-data.js from github.com/jameshward3/Legislative_tracker, sourced
 *     from github.com/jameshward3/OrangeBudgetDashboard) as budget datasets — labeled as
 *     compiled figures, NOT an official City dataset, until Finance confirms them.
 *  2. Tags every ordinance/resolution with a fiscal amount, kind and budget category
 *     inferred from its official title (largest dollar amount stated; keyword category).
 *
 *   tsx scripts/crawl/budget-link.ts <path-to-budget-dashboard-data.js>
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../../src/payload.config'

const file = process.argv[2]
if (!file) { console.error('usage: budget-link.ts <budget-dashboard-data.js>'); process.exit(1) }
const raw = readFileSync(file, 'utf8')
// The file only assigns a data object to window; evaluate it in an empty sandbox (no require, no globals).
const sandbox: any = { window: {} }
runInNewContext(raw, sandbox, { timeout: 1000 })
const B = sandbox.window.ORANGE_BUDGET_DASHBOARD_DATA
if (!B?.budgetSummary) throw new Error('budget data not found')

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const NOW = new Date().toISOString()
const cents = (d: number) => Math.round(d * 100)
async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys } as any) as any
  return payload.create({ collection, data, ...sys } as any) as any
}

const src = await upsert('source-records', 'url', {
  title: 'Budget figures used by the Orange Legislative Tracker (OrangeBudgetDashboard)', url: 'https://github.com/jameshward3/OrangeBudgetDashboard',
  owner: 'Orange Legislative Tracker / OrangeBudgetDashboard (GitHub: jameshward3)', ownerType: 'third_party', retrievedAt: NOW, status: 'captured',
  checksumSha256: createHash('sha256').update(raw).digest('hex'),
  notes: 'Figures compiled from adopted municipal budget documents by the tracker author; imported at the project owner\'s request. Not an official City dataset — Finance must confirm each figure against the adopted budget before production.',
})
const common = { workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', units: 'US dollars (nominal)', dataUpdatedAt: NOW, sources: [src.id] }
const DEPT_CAT: Record<string, string> = { Police: 'public_safety', Fire: 'public_safety', 'Public Works': 'public_works', Insurance: 'general_government', Finance: 'general_government', Library: 'other' }

async function dataset(slug: string, data: any, lines: any[]) {
  const ds = await upsert('budget-datasets', 'slug', { slug, ...common, ...data })
  await payload.delete({ collection: 'budget-lines', where: { dataset: { equals: ds.id } }, overrideAccess: true })
  for (const l of lines) await payload.create({ collection: 'budget-lines', overrideAccess: true, data: { dataset: ds.id, fund: 'Current fund', ...l } as any })
  return ds
}

// FY2026 operating: department lines + remainder, revenue lines.
const fy = Number(B.fiscalYear)
const s = B.budgetSummary
const listed = B.departmentBudgets.reduce((a: number, d: any) => a + d.approvedBudget, 0)
await dataset(`compiled-fy${fy}-operating-adopted`, {
  title: `FY${fy} municipal budget — department summary (compiled)`, fiscalYear: fy, basis: 'adopted', kind: 'operating',
  sourceDescription: 'Orange Legislative Tracker budget figures (OrangeBudgetDashboard), compiled from the adopted budget',
  definitions: `Total appropriations ${s.totalAppropriations.toLocaleString('en-US')} dollars. Department lines are the departments the tracker lists; "All other appropriations" is total appropriations minus those departments (computed here). Revenue lines: taxes to be raised, miscellaneous revenues and surplus anticipated as listed. Debt service: ${s.debtService.toLocaleString('en-US')} dollars.`,
}, [
  ...B.departmentBudgets.map((d: any) => ({ rowKey: `dept|${d.department}`, direction: 'expenditure', department: d.department, category: DEPT_CAT[d.department] ?? 'other', description: d.department, amountCents: cents(d.approvedBudget) })),
  { rowKey: 'dept|other', direction: 'expenditure', department: 'All other appropriations', category: 'other', description: 'All other appropriations (computed remainder)', amountCents: cents(s.totalAppropriations - listed) },
  { rowKey: 'rev|taxes', direction: 'revenue', category: 'property_taxes', description: 'Amount to be raised by taxation', amountCents: cents(s.taxesToRaise) },
  { rowKey: 'rev|misc', direction: 'revenue', category: 'local_revenues', description: 'Miscellaneous revenues', amountCents: cents(s.miscellaneousRevenues) },
  { rowKey: 'rev|surplus', direction: 'revenue', category: 'other_revenues', description: 'Surplus anticipated', amountCents: cents(s.surplusAnticipated) },
])
// FY2026 capital.
await dataset(`compiled-fy${fy}-capital-adopted`, {
  title: `FY${fy} capital budget (compiled)`, fiscalYear: fy, basis: 'adopted', kind: 'capital',
  sourceDescription: 'Orange Legislative Tracker capital project figures (OrangeBudgetDashboard)',
  definitions: 'Amount is the FY appropriation; total project cost is noted in each description.',
}, B.capitalProjects.map((c: any) => ({ rowKey: `cap|${c.category}`, direction: 'expenditure', department: c.category, category: /fire/i.test(c.category) ? 'public_safety' : 'public_works',
  description: `${c.category} (total project cost $${c.totalProjectCost.toLocaleString('en-US')})`, amountCents: cents(c.approvedBudget) })))
// Revenue history 2020–2025 (expenditure detail not compiled).
for (const h of B.historicalBudget.filter((x: any) => x.year !== fy)) {
  await dataset(`compiled-fy${h.year}-revenues-adopted`, {
    title: `FY${h.year} budget revenues (compiled)`, fiscalYear: h.year, basis: 'adopted', kind: 'revenues',
    sourceDescription: 'Orange Legislative Tracker historical budget figures (OrangeBudgetDashboard)',
    definitions: `Total budget ${h.totalBudget.toLocaleString('en-US')} dollars; debt service ${h.debtService.toLocaleString('en-US')} dollars. Department expenditure detail was not compiled for this year.`,
  }, [
    { rowKey: 'rev|taxes', direction: 'revenue', category: 'property_taxes', description: 'Tax levy', amountCents: cents(h.taxLevy) },
    { rowKey: 'rev|nontax', direction: 'revenue', category: 'local_revenues', description: 'Non-tax revenue', amountCents: cents(h.nonTaxRevenue) },
    { rowKey: 'rev|surplus', direction: 'revenue', category: 'other_revenues', description: 'Surplus anticipated', amountCents: cents(h.surplus) },
  ])
}
console.log('budget datasets loaded')

// ------------------------------------------------------------------ classify legislation
export const CATEGORY_RULES: [string, RegExp][] = [
  ['Bill List (claims)', /\bbill list\b/i], // payments of claims across all departments, not a new authorization
  ['Water/Sewer', /\b(water|sewer|storm ?water|hydrant|meter replacement)\b/i],
  ['Police', /\b(police|public safety|crime|firearm|surveillance|body[- ]?worn|camera|traffic safety|drive sober|crackdown)\b/i],
  ['Fire', /\b(fire|ems|ambulance)\b/i],
  ['Public Works', /\b(public works|dpw|paving|repaving|resurfac|road|street|sidewalk|snow|sweep|vehicle|fleet|fuel|traffic signal|tree|leaf|refuse|garbage|recycl|car wash)\b/i],
  ['Recreation & Parks', /\b(recreation|park|pool|playground|basketball|baseball|volleyball|tennis|field)\b/i],
  ['Health & Community Services', /\b(health|senior|nursing|vital|community services|food|homeless|youth)\b/i],
  ['Library', /\blibrary\b/i],
  ['Insurance', /\b(insurance|workers'? comp|risk management|claims)\b/i],
  ['Legal', /\b(law firm|attorney|counsel|litigation|labor matters|legal services|prosecutor)\b/i],
  ['Finance', /\b(tax|refund|audit|budget|financial|bond|note|appropriation|cancel|bill list|treasurer|collector|transfer)\b/i],
  ['Capital Improvements', /\b(capital|improvement|construction|renovation|redevelopment|acquisition)\b/i],
]
const amountOf = (t: string) => Math.max(0, ...[...t.matchAll(/\$\s?([0-9][0-9,]*(?:\.[0-9]{2})?)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter(Number.isFinite))
const legs = (await payload.find({ collection: 'legislation', limit: 10000, depth: 0, overrideAccess: true, select: { identifier: true, title: true, summary: true, type: true, fiscal: true } as any })).docs as any[]
let tagged = 0
for (const l of legs) {
  const text = `${l.title ?? ''} ${l.summary ?? ''}`
  const amount = amountOf(text)
  const category = CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? 'General Government'
  const revenue = /\b(grant|acceptance of .{0,40}funds|accept(ing)? .{0,30}funds|donation|premium|reimbursement to the city|revenue)\b/i.test(text) && !/\brefund\b/i.test(text)
  const honorific = /\b(honor|recogniz|commend|celebrat|proclaim|memory|gratitude|appoint|reappoint)/i.test(text)
  const kind = amount > 0 ? (revenue ? 'revenue' : 'spending') : honorific ? 'no_cost' : 'unknown'
  const fiscal = { amountCents: amount > 0 ? Math.round(amount * 100) : null, kind, category, basis: 'Inferred from the title (largest dollar amount stated; keyword category). Not reviewed by Finance.' }
  if (JSON.stringify(l.fiscal ?? {}) === JSON.stringify(fiscal)) continue
  await payload.update({ collection: 'legislation', id: l.id, data: { fiscal } as any, ...sys })
  tagged++
}
console.log({ legislation: legs.length, tagged })
process.exit(0)
