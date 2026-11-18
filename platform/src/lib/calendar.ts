import { findPublic } from './public'
export async function upcomingCalendar(days = 120) {
  const from = new Date(Date.now() - 864e5).toISOString(), to = new Date(Date.now() + days * 864e5).toISOString()
  const where = { and: [{ startsAt: { greater_than_equal: from } }, { startsAt: { less_than_equal: to } }] }
  const [m, e] = await Promise.all([findPublic('meetings', { where, sort: 'startsAt', limit: 200 }), findPublic('events', { where, sort: 'startsAt', limit: 200 })])
  return [
    ...(m.docs as any[]).map((x) => ({ kind: 'Meeting', uid: `meeting-${x.id}@orange-platform`, start: x.startsAt, end: null, title: x.title, location: x.location, path: `/government/meetings/${x.slug}`, slug: x.slug, demo: x.verificationStatus === 'demo', timeTbd: x.timeConfirmed === false })),
    ...(e.docs as any[]).map((x) => ({ kind: 'Event', uid: `event-${x.id}@orange-platform`, start: x.startsAt, end: x.endsAt, title: x.title, location: x.location, path: `/calendar#event-${x.slug}`, slug: x.slug, demo: x.verificationStatus === 'demo' })),
  ].sort((a, b) => a.start.localeCompare(b.start))
}
