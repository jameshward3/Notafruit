import { isActiveWindow } from './time'

type Feature = { id: number | string; startsAt: string; endsAt: string; priority?: number | null; audienceWards?: string[] | null }
type Notice = { kind: string; startsAt?: string | null; endsAt?: string | null }

/**
 * Homepage feature selection. Emergency notices always outrank seasonal
 * features; among active features, higher priority wins, then the most
 * recently started. Ward-targeted features only show for that ward.
 */
export function selectHomepage<F extends Feature, N extends Notice>(features: F[], notices: N[], now = new Date(), ward?: string) {
  const emergencies = notices.filter((n) => n.kind === 'emergency' && isActiveWindow(n.startsAt, n.endsAt, now))
  const active = features
    .filter((f) => isActiveWindow(f.startsAt, f.endsAt, now))
    .filter((f) => !f.audienceWards?.length || (ward && f.audienceWards.includes(ward)))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.startsAt.localeCompare(a.startsAt))
  return { emergencies, feature: emergencies.length ? null : (active[0] ?? null) }
}
