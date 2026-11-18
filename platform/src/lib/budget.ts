/**
 * Budget view model. Chart, table and CSV export all derive from the SAME
 * filtered line set returned here, so they cannot disagree. Access control is
 * enforced (overrideAccess:false) so only rows of published datasets appear.
 */
import type { Payload, Where } from 'payload'
import { sumCents } from './money'

export const CATEGORY_META = {
  public_safety: { label: 'Public safety', short: 'Safety', color: '#0B2035' },
  public_works: { label: 'Public works', short: 'Works', color: '#54718A' },
  parks_recreation: { label: 'Parks & recreation', short: 'Parks', color: '#9A752F' },
  general_government: { label: 'General government', short: 'Gen. govt', color: '#737F8C' },
  other: { label: 'Other', short: 'Other', color: '#B8C1CB' },
} as const
export type SpendCategory = keyof typeof CATEGORY_META
export const SPEND_CATEGORIES = Object.keys(CATEGORY_META) as SpendCategory[]

export const REVENUE_META = {
  property_taxes: { label: 'Property taxes', color: '#0B2035' },
  local_revenues: { label: 'Local revenues', color: '#54718A' },
  state_aid: { label: 'State aid', color: '#9A752F' },
  other_revenues: { label: 'Other revenues', color: '#B8C1CB' },
} as const

export type BudgetFilters = { year?: number; basis?: string; kind?: string; fund?: string; department?: string; category?: string }

export async function budgetView(payload: Payload, f: BudgetFilters) {
  const dsWhere: Where[] = [{ workflowStatus: { equals: 'published' } }]
  if (f.basis) dsWhere.push({ basis: { equals: f.basis } })
  dsWhere.push({ kind: { equals: f.kind ?? 'operating' } })
  const datasets = (await payload.find({ collection: 'budget-datasets', where: { and: dsWhere }, sort: '-fiscalYear', limit: 50, depth: 0, overrideAccess: false })).docs
  const allYears = [...new Set(datasets.map((d) => d.fiscalYear))].sort((a, b) => b - a)

  const lineWhere: Where[] = [{ dataset: { in: datasets.map((d) => d.id).length ? datasets.map((d) => d.id) : [-1] } }]
  if (f.fund) lineWhere.push({ fund: { equals: f.fund } })
  if (f.department) lineWhere.push({ department: { equals: f.department } })
  if (f.category) lineWhere.push({ category: { equals: f.category } })
  const lines = (await payload.find({ collection: 'budget-lines', where: { and: lineWhere }, limit: 50_000, pagination: false, depth: 0, overrideAccess: false })).docs
  const dsById = new Map(datasets.map((d) => [d.id, d]))

  const spend = lines.filter((l) => l.direction === 'expenditure')
  const revenue = lines.filter((l) => l.direction === 'revenue')

  // One row per dataset (year + basis); categories are segments.
  const byYear = datasets.map((d) => {
    const mine = spend.filter((l) => l.dataset === d.id)
    const categories = Object.fromEntries(SPEND_CATEGORIES.map((c) => [c, sumCents(mine.filter((l) => l.category === c).map((l) => l.amountCents))])) as Record<SpendCategory, number | null>
    return { datasetId: d.id, label: `FY ${d.fiscalYear} (${d.basis[0].toUpperCase()}${d.basis.slice(1)})`, fiscalYear: d.fiscalYear, basis: d.basis, isDemo: d.verificationStatus === 'demo', categories, total: sumCents(Object.values(categories)) }
  })

  const focusYear = f.year ?? allYears[0]
  const focus = datasets.filter((d) => d.fiscalYear === focusYear)
  const focusIds = new Set(focus.map((d) => d.id))
  const revFocus = revenue.filter((l) => focusIds.has(l.dataset as number))
  const revenueMix = Object.entries(REVENUE_META).map(([k, m]) => ({ key: k, ...m, cents: sumCents(revFocus.filter((l) => l.category === k).map((l) => l.amountCents)) }))

  return {
    datasets, years: allYears, focusYear, byYear,
    lines: lines.map((l) => ({ ...l, dataset: dsById.get(l.dataset as number) })),
    revenueMix,
    funds: [...new Set(lines.map((l) => l.fund))].sort(),
    departments: [...new Set(lines.map((l) => l.department).filter(Boolean) as string[])].sort(),
    anyDemo: datasets.some((d) => d.verificationStatus === 'demo'),
  }
}

/**
 * Capital investment by location (guide §5), from published projects.
 * Estimated and awarded costs are different measures and are never added together.
 * Multi-ward projects are reported separately so ward rows are not double-counted.
 */
export async function capitalByWard(payload: Payload) {
  const projects = (await payload.find({ collection: 'projects', limit: 1000, pagination: false, depth: 0, overrideAccess: false, user: null } as any)).docs as any[]
  const wards = ['north', 'south', 'east', 'west', 'unassigned', 'multiple'] as const
  const bucket = (p: any) => (!p.wards?.length ? 'unassigned' : p.wards.length > 1 ? 'multiple' : p.wards[0])
  return {
    anyDemo: projects.some((p) => p.verificationStatus === 'demo'),
    rows: wards.map((w) => {
      const mine = projects.filter((p) => bucket(p) === w)
      return { ward: w, projects: mine.length, estimatedCents: sumCents(mine.map((p) => p.cost?.estimatedCents)), awardedCents: sumCents(mine.map((p) => p.cost?.awardedCents)), missingEstimates: mine.filter((p) => p.cost?.estimatedCents == null).length }
    }).filter((r) => r.projects > 0),
  }
}
