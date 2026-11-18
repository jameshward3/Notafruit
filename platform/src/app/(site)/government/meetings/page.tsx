import Link from 'next/link'
import type { Where } from 'payload'
import { CouncilBand } from '@/components/CouncilBand'
import { GovTabs } from '@/components/GovTabs'
import { SubscribeForm } from '@/components/SubscribeForm'
import { DemoFlag, Empty, human } from '@/components/ui'
import { one, pick, qs, type SP } from '@/lib/params'
import { findPublic } from '@/lib/public'
import { fmtDate, fmtTime, requestNowIso } from '@/lib/time'
import { getLocale, t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Meetings' }
const BODIES = ['city_council', 'planning_board', 'zoning_board', 'other'] as const

export default async function Meetings({ searchParams }: { searchParams: SP }) {
  const locale = await getLocale()
  const L = t(locale)
  const sp = await searchParams
  const when = one(sp.when) === 'past' ? 'past' : 'upcoming'
  const body = pick(one(sp.body), BODIES)
  const page = Math.max(1, Number(one(sp.page)) || 1)
  const now = requestNowIso(-6 * 3600e3)
  const and: Where[] = [when === 'past' ? { startsAt: { less_than: now } } : { startsAt: { greater_than_equal: now } }]
  if (body) and.push({ body: { equals: body } })
  const res = await findPublic('meetings', { where: { and }, sort: when === 'past' ? '-startsAt' : 'startsAt', limit: 20, page })
  return (
    <>
      <CouncilBand s={L} />
      <div className="container section">
        <GovTabs current="meetings" />
        <div className="layout-side">
          <div>
            <form className="filters" method="get" aria-label={L.filterMeetings}>
              <div className="field"><label htmlFor="when">{L.when}</label><select id="when" name="when" defaultValue={when}><option value="upcoming">{L.upcoming}</option><option value="past">{L.past}</option></select></div>
              <div className="field"><label htmlFor="body">{L.body}</label><select id="body" name="body" defaultValue={body ?? ''}><option value="">{L.allBodies}</option>{BODIES.map((b) => <option key={b} value={b}>{(L as any)[`body_${b}`] ?? human(b)}</option>)}</select></div>
              <button className="btn" type="submit">{L.apply}</button>
            </form>
            {res.docs.length === 0 ? <Empty title={L.noMeetings}><p>{L.historicAgendas.split('{a}')[0]}<a href="https://orangetwpnjcc.org/meetings/2026-meetings-2/">{L.councilWebsite}</a>{L.historicAgendas.split('{a}')[1]}</p></Empty> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>{(res.docs as any[]).map((m) => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}>
                  <h2 style={{ fontSize: 'var(--fs-h3)', margin: 0 }}><Link href={`/government/meetings/${m.slug}`}>{m.title}</Link> <DemoFlag show={m.verificationStatus === 'demo'} text="Sample meeting" /></h2>
                  <p className="meta" style={{ margin: 0 }}>{fmtDate(m.startsAt, {}, locale)}{m.timeConfirmed === false ? '' : ` · ${fmtTime(m.startsAt, locale)}`} · {m.location} · {(L as any)[`status_${m.meetingStatus}`] ?? human(m.meetingStatus)}</p>
                </li>
              ))}</ul>
            )}
            <nav className="pagination" aria-label={L.pages}>
              {res.hasPrevPage && <Link className="btn btn--secondary" href={`/government/meetings${qs({ when, body }, { page: String(page - 1) })}`}>{L.previous}</Link>}
              <span className="meta">{L.pageOf.replace('{p}', String(res.page)).replace('{n}', String(Math.max(1, res.totalPages)))}</span>
              {res.hasNextPage && <Link className="btn btn--secondary" href={`/government/meetings${qs({ when, body }, { page: String(page + 1) })}`}>{L.next}</Link>}
            </nav>
          </div>
          <aside className="panel">
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>{L.calendarFeed}</h2>
            <p>{L.calendarFeedBody} <a href="/data/calendar.ics">calendar.ics</a></p>
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>{L.meetingNotifications}</h2>
            <SubscribeForm topicType="meetings" />
          </aside>
        </div>
      </div>
    </>
  )
}
