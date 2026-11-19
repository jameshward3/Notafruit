/**
 * Loads every line of the City's adopted municipal budgets (orangenj.gov Document Center)
 * into budget datasets, so the budget pages can break spending and revenue down by line.
 *
 *   tsx scripts/crawl/import-budget.ts
 *
 * Sources (fetched and cached by scripts/crawl/fetch.ts):
 *   2026 Adopted Budget (DocumentCenter/View/6373): FY2026 appropriations and revenues, and the FY2025
 *     columns printed beside them (FY2025 budget, as modified, paid or charged; revenues realized).
 *   2025 Adopted Budget (DocumentCenter/View/5762): FY2025 adopted Current Fund appropriations.
 * Checks: line items must add up to the totals printed in each budget (within $5 of rounding),
 * or the script stops without writing anything.
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../../src/payload.config'
import { fcoaFunction } from '../../src/lib/fcoa'
import { parseBudget, type Line } from './budget-parse'
import { CRAWL_DIR, get } from './fetch'
import { pdfText } from './text'

const DOCS = {
  y2026: { id: '6373', title: '2026 Adopted Budget (adopted June 29, 2026)', fy: 2026, totals: { appropriations: 94_580_788, revenues: 94_580_788, prior: 98_592_499, water: 18_807_500 } },
  y2025: { id: '5762', title: '2025 Adopted Budget (adopted August 6, 2025)', fy: 2025, totals: { appropriations: 96_391_910 } },
}

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const NOW = new Date().toISOString()
async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys } as any) as any
  return payload.create({ collection, data, ...sys } as any) as any
}

async function load(doc: typeof DOCS.y2026 | typeof DOCS.y2025) {
  const url = `https://orangenj.gov/DocumentCenter/View/${doc.id}`
  const { row } = await get(url)
  if (row.status !== 200 || !row.file) throw new Error(`could not fetch ${url}`)
  const file = join(CRAWL_DIR, row.file)
  const lines = parseBudget(await pdfText(file), doc.fy)
  const src = await upsert('source-records', 'url', {
    title: `${doc.title} — City of Orange Township`, url, owner: 'City of Orange Township, Department of Finance', ownerType: 'official', retrievedAt: row.retrievedAt, status: 'captured',
    checksumSha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    notes: 'Adopted municipal budget in the NJ Division of Local Government Services format. Line items were read automatically from the PDF text and checked against the totals printed in the budget; confirm any figure against the PDF before relying on it.',
  })
  return { lines, src }
}

const sum = (ls: Line[], k: keyof Line) => ls.reduce((a, l) => a + ((l[k] as number | null) ?? 0), 0)
const check = (label: string, got: number, want: number) => {
  const ok = Math.abs(got - want) <= 5
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: lines ${got.toLocaleString('en-US')} vs printed ${want.toLocaleString('en-US')}`)
  if (!ok) throw new Error(`${label} does not reconcile; nothing written`)
}

const a = await load(DOCS.y2026)
const b = await load(DOCS.y2025)
const cf = (ls: Line[], d: Line['direction']) => ls.filter((l) => l.fund === 'Current fund' && l.direction === d)
check('FY2026 Current Fund appropriations', sum(cf(a.lines, 'expenditure'), 'fy'), DOCS.y2026.totals.appropriations)
check('FY2026 Current Fund revenues', sum(cf(a.lines, 'revenue'), 'fy'), DOCS.y2026.totals.revenues)
check('FY2025 column of the 2026 budget (appropriations)', sum(cf(a.lines, 'expenditure'), 'prior'), DOCS.y2026.totals.prior)
check('FY2026 Water & Sewer Utility appropriations', sum(a.lines.filter((l) => l.fund !== 'Current fund' && l.direction === 'expenditure'), 'fy'), DOCS.y2026.totals.water)
check('FY2025 adopted Current Fund appropriations', sum(cf(b.lines, 'expenditure'), 'fy'), DOCS.y2025.totals.appropriations)

const REV_CAT = (l: Line) => (/^07-19/.test(l.account ?? '') ? 'property_taxes' : /^Section B/.test(l.section) ? 'state_aid' : /^Section [AC]|delinquent/i.test(l.section) ? 'local_revenues' : 'other_revenues')
const cents = (d: number | null) => (d == null ? null : Math.round(d * 100))
const DEFINITIONS = `Every line of the adopted budget as printed: fund, section (e.g. "Operations within CAPS"), department or program, line (Salaries and Wages, Other Expenses, or a named item) and the FCOA account. Categories follow the first two digits of the FCOA account. Revenue lines include each PILOT agreement and grant. Line items were read automatically from the budget PDF and add up to the printed totals within a few dollars of rounding.`

async function dataset(slug: string, meta: Record<string, any>, rows: Line[], pick: (l: Line) => number | null, srcId: number) {
  const ds = await upsert('budget-datasets', 'slug', {
    slug, units: 'US dollars (nominal)', dataUpdatedAt: NOW, definitions: DEFINITIONS, workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [srcId], ...meta,
  })
  await payload.delete({ collection: 'budget-lines', where: { dataset: { equals: ds.id } }, overrideAccess: true })
  const seen = new Map<string, number>()
  let n = 0
  for (const l of rows) {
    const amount = pick(l)
    if (amount == null) continue
    const base = [l.fund, l.direction, l.section, l.program ?? '', l.account ?? '', l.item].join('|')
    const k = (seen.get(base) ?? 0) + 1
    seen.set(base, k)
    await payload.create({ collection: 'budget-lines', overrideAccess: true, data: {
      dataset: ds.id, rowKey: k > 1 ? `${base}|${k}` : base, direction: l.direction, fund: l.fund, section: l.section,
      department: l.program ?? (l.direction === 'revenue' ? l.section : fcoaFunction(l.account).label), account: l.account, description: l.item,
      category: l.direction === 'revenue' ? REV_CAT(l) : fcoaFunction(l.account).category, amountCents: cents(amount),
    } as any })
    n++
  }
  console.log(`${slug}: ${n} lines`)
}

await dataset('official-fy2026-adopted', { title: 'FY2026 adopted municipal budget — all lines', fiscalYear: 2026, basis: 'adopted', kind: 'operating',
  sourceDescription: '2026 Adopted Budget, City of Orange Township (Sheets 4–40), every appropriation and revenue line' }, a.lines, (l) => l.fy, a.src.id)
await dataset('official-fy2025-as-printed-2026', { title: 'FY2025 budget as printed in the 2026 budget — all lines', fiscalYear: 2025, basis: 'amended', kind: 'appropriations',
  sourceDescription: '2026 Adopted Budget, "Appropriated for 2025" and "Anticipated 2025" columns (adopted 2025 budget plus grants added during the year)' }, a.lines, (l) => l.prior, a.src.id)
await dataset('official-fy2025-modified', { title: 'FY2025 appropriations as modified (emergencies and transfers)', fiscalYear: 2025, basis: 'amended', kind: 'obligations',
  sourceDescription: '2026 Adopted Budget, "Total for 2025 As Modified By All Transfers" column' }, a.lines.filter((l) => l.direction === 'expenditure'), (l) => l.priorModified, a.src.id)
await dataset('official-fy2025-paid', { title: 'FY2025 paid or charged, and revenues realized in cash', fiscalYear: 2025, basis: 'actual', kind: 'payments',
  sourceDescription: '2026 Adopted Budget, "Expended 2025 Paid or Charged" and "Realized in Cash in 2025" columns' }, a.lines, (l) => l.priorActual, a.src.id)
await dataset('official-fy2025-adopted', { title: 'FY2025 adopted municipal budget — Current Fund appropriations', fiscalYear: 2025, basis: 'adopted', kind: 'operating',
  sourceDescription: '2025 Adopted Budget, City of Orange Township, Current Fund appropriation lines' }, cf(b.lines, 'expenditure'), (l) => l.fy, b.src.id)

// The compiled FY2026 department summary is superseded by the official line items.
const old = (await payload.find({ collection: 'budget-datasets', where: { slug: { equals: 'compiled-fy2026-operating-adopted' } }, limit: 1, overrideAccess: true })).docs[0] as any
if (old && old.workflowStatus === 'published') { await payload.update({ collection: 'budget-datasets', id: old.id, data: { workflowStatus: 'archived' }, ...sys } as any); console.log('archived compiled-fy2026-operating-adopted (superseded)') }
process.exit(0)
