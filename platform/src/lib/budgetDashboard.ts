/**
 * Line-level budget comparison for the budget dashboard. All figures come from the published
 * official datasets loaded by scripts/crawl/import-budget.ts (the City's adopted budgets);
 * rows from the same budget document share row keys, so FY2026 and FY2025 join exactly.
 */
import type { Payload } from 'payload'
import { fcoaFunction } from './fcoa'

export type BudgetRow = {
  key: string; fund: string; direction: 'expenditure' | 'revenue'; section: string; program: string; item: string; account: string | null
  fn: string; fy: number | null; prior: number | null; modified: number | null; paid: number | null
}

const DS = { fy: 'official-fy2026-adopted', prior: 'official-fy2025-as-printed-2026', modified: 'official-fy2025-modified', paid: 'official-fy2025-paid' } as const

async function linesOf(payload: Payload, slug: string) {
  const ds = (await payload.find({ collection: 'budget-datasets', where: { and: [{ slug: { equals: slug } }, { workflowStatus: { equals: 'published' } }] }, limit: 1, depth: 0, overrideAccess: false })).docs[0] as any
  if (!ds) return { ds: null, lines: [] as any[] }
  const lines = (await payload.find({ collection: 'budget-lines', where: { dataset: { equals: ds.id } }, limit: 5000, pagination: false, depth: 0, overrideAccess: false })).docs as any[]
  return { ds, lines }
}

export async function budgetRows(payload: Payload) {
  const [fy, prior, modified, paid] = await Promise.all([linesOf(payload, DS.fy), linesOf(payload, DS.prior), linesOf(payload, DS.modified), linesOf(payload, DS.paid)])
  const rows = new Map<string, BudgetRow>()
  const put = (l: any, k: 'fy' | 'prior' | 'modified' | 'paid') => {
    const r = rows.get(l.rowKey) ?? {
      key: l.rowKey, fund: l.fund, direction: l.direction, section: l.section ?? '', program: l.department ?? '', item: l.description, account: l.account ?? null,
      fn: l.direction === 'revenue' ? l.section ?? 'Revenue' : fcoaFunction(l.account).label, fy: null, prior: null, modified: null, paid: null,
    }
    r[k] = l.amountCents == null ? null : l.amountCents / 100
    rows.set(l.rowKey, r)
  }
  fy.lines.forEach((l) => put(l, 'fy')); prior.lines.forEach((l) => put(l, 'prior')); modified.lines.forEach((l) => put(l, 'modified')); paid.lines.forEach((l) => put(l, 'paid'))
  return { rows: [...rows.values()], dataset: fy.ds, priorDataset: prior.ds, available: !!fy.ds }
}

export const total = (rs: BudgetRow[], k: 'fy' | 'prior' | 'modified' | 'paid') => rs.reduce((a, r) => a + (r[k] ?? 0), 0)
export const change = (fy: number | null, prior: number | null) => ({ amount: (fy ?? 0) - (prior ?? 0), pct: prior ? (((fy ?? 0) - prior) / prior) * 100 : null })

/** Group rows and total each group (sorted by FY amount, largest first). */
export function groupBy(rs: BudgetRow[], key: (r: BudgetRow) => string) {
  const m = new Map<string, BudgetRow[]>()
  for (const r of rs) (m.get(key(r)) ?? m.set(key(r), []).get(key(r))!).push(r)
  return [...m.entries()].map(([name, list]) => ({ name, rows: list, fy: total(list, 'fy'), prior: total(list, 'prior'), modified: total(list, 'modified'), paid: total(list, 'paid') }))
    .sort((a, b) => b.fy - a.fy || b.prior - a.prior)
}

/** Recurring PILOT agreements (one-time settlements are counted separately). */
export const isPilot = (r: BudgetRow) => r.direction === 'revenue' && /PILOT/i.test(r.item) && !/settlement/i.test(r.item)
export const isPilotSettlement = (r: BudgetRow) => r.direction === 'revenue' && /PILOT/i.test(r.item) && /settlement/i.test(r.item)
