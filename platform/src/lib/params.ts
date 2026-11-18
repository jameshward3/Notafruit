/** Shareable URL filter helpers: allow-listed values only. */
export type SP = Promise<Record<string, string | string[] | undefined>>
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
export const pick = <T extends string>(v: string, allowed: readonly T[]): T | undefined => (allowed as readonly string[]).includes(v) ? (v as T) : undefined
export const qs = (base: Record<string, string | undefined>, patch: Record<string, string | undefined>) => {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) u.set(k, v)
  const s = u.toString()
  return s ? `?${s}` : ''
}
