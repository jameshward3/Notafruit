import Link from 'next/link'
import { DemoFlag, Empty, PageBand } from '@/components/ui'
import { upcomingCalendar } from '@/lib/calendar'
import { civilDate, fmtDate, fmtTime } from '@/lib/time'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Calendar' }
export default async function Calendar() {
  const items = await upcomingCalendar()
  const byDay = Object.entries(items.reduce<Record<string, typeof items>>((a, i) => ((a[civilDate(i.start)] ??= []).push(i), a), {}))
  return (<><PageBand eyebrow="Calendar" title="Meetings and events" /><div className="container section">
    <p>Subscribe in your calendar app: <a href="/data/calendar.ics">calendar.ics</a></p>
    {byDay.length === 0 ? <Empty title="Nothing scheduled in the next 120 days." /> : byDay.map(([day, list]) => (
      <section key={day} style={{ marginBottom: 24 }}><h2 style={{ fontSize: 'var(--fs-h3)' }}>{fmtDate(list[0].start)}</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>{list.map((i) => <li key={i.uid} id={i.kind === 'Event' ? `event-${i.slug}` : undefined} style={{ padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
          <span className="meta tabular">{(i as any).timeTbd ? 'Time TBA' : fmtTime(i.start)}</span> · <span className="badge badge--neutral">{i.kind}</span> {i.kind === 'Meeting' ? <Link href={i.path}>{i.title}</Link> : <strong>{i.title}</strong>} <DemoFlag show={i.demo} text="Sample" />{i.location && <div className="meta">{i.location}</div>}</li>)}</ul></section>))}
  </div></>)
}
