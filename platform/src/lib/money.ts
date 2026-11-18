/**
 * Authoritative amounts are stored as integer cents (Postgres numeric via Payload
 * number fields; never binary floating point for arithmetic). `null` means
 * "not available" and is never coerced to zero.
 */
export type Cents = number | null | undefined

export function parseDollarsToCents(input: string | null | undefined): number | null {
  if (input == null) return null
  const s = String(input).trim().replace(/[$,\s]/g, '')
  if (s === '' || /^(n\/?a|null|-)$/i.test(s)) return null
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-')
  const body = s.replace(/[()\-]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(body)) throw new Error(`Not a valid amount: "${input}"`)
  const [whole, frac = ''] = body.split('.')
  const cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2))
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount too large')
  return Number(neg ? -cents : cents)
}

export function sumCents(values: Cents[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0)
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtExact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatCents(c: Cents, exact = false): string {
  if (c == null) return 'Not available'
  return (exact ? fmtExact : fmt).format(c / 100)
}

/** Percent of total, computed in integer space; null when either side is unavailable. */
export function pct(part: Cents, total: Cents): number | null {
  if (part == null || total == null || total === 0) return null
  return Math.round((part * 1000) / total) / 10
}
