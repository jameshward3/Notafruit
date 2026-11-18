import { SPEND_CATEGORIES } from './budget'
import { one, pick } from './params'

export function parseBudgetParams(sp: Record<string, string | string[] | undefined>) {
  return {
    year: /^\d{4}$/.test(one(sp.year)) ? Number(one(sp.year)) : undefined,
    basis: pick(one(sp.basis), ['adopted', 'amended', 'actual'] as const),
    kind: pick(one(sp.kind), ['operating', 'capital', 'appropriations', 'obligations', 'payments', 'revenues'] as const) ?? 'operating',
    fund: one(sp.fund).slice(0, 100) || undefined,
    department: one(sp.department).slice(0, 100) || undefined,
    category: pick(one(sp.category), SPEND_CATEGORIES),
  }
}

