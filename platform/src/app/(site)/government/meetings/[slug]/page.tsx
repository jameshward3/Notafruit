import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, ChevronDown, Clock, MapPin, Printer } from 'lucide-react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { GovTabs } from '@/components/GovTabs'
import { DocumentList } from '@/components/DocumentList'
import { Breadcrumbs, DemoFlag, Notice, StatusBadge, human } from '@/components/ui'
import { one, type SP } from '@/lib/params'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtDate, fmtTime } from '@/lib/time'
import { getLocale, t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
const ts = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default async function Meeting({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const locale = await getLocale()
  const L = t(locale)
  const { slug } = await params
  const tabParam = one((await searchParams).tab)
  const tab = (['agenda', 'minutes', 'video'] as const).find((t) => t === tabParam) ?? 'agenda'
  const m = await findOnePublic('meetings', { slug: { equals: slug } }, { depth: 1 })
  if (!m) notFound()
  const votes = (await findPublic('votes', { where: { meeting: { equals: m.id } }, limit: 100, depth: 1 })).docs as any[]
  const recent = (await findPublic('legislation', { sort: '-updatedAt', limit: 3 })).docs as any[]
  const demo = m.verificationStatus === 'demo'
  return (
    <div className="container section">
      <Breadcrumbs items={[{ href: '/', label: L.home }, { href: '/government/meetings', label: L.meetingsTitle }, { label: m.title }]} />
      <GovTabs current="meetings" />
      <div className="layout-side">
        <article>
          <h1>{m.title} {demo && <DemoFlag text="Sample meeting" />}</h1>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <span><CalendarDays size={20} aria-hidden="true" /> {fmtDate(m.startsAt, {}, locale)}</span>
            <span><Clock size={20} aria-hidden="true" /> {m.timeConfirmed === false ? L.timeSeeAgenda : fmtTime(m.startsAt, locale)}</span>
            <span><MapPin size={20} aria-hidden="true" /> {m.location}</span>
            <span className="badge badge--neutral">{(L as any)[`status_${m.meetingStatus}`] ?? human(m.meetingStatus)}</span>
          </p>
          {m.verificationStatus === 'unverified' && <Notice tone="info" title={L.importedMeetingTitle}>{L.importedMeetingBody}</Notice>}
          <p className="no-print"><a className="btn btn--secondary" href={`/government/meetings/${m.slug}/print`}><Printer size={18} aria-hidden="true" /> {L.printAgenda}</a></p>
          <nav className="tabs" aria-label={L.meetingRecords}>
            <Link href="?tab=agenda" aria-current={tab === 'agenda' ? 'page' : undefined}>{L.tabAgenda}</Link>
            <Link href="?tab=minutes" aria-current={tab === 'minutes' ? 'page' : undefined}>{L.tabMinutes}</Link>
            <Link href="?tab=video" aria-current={tab === 'video' ? 'page' : undefined}>{L.tabVideo}</Link>
          </nav>
          {tab === 'agenda' && <>
            <h2>{L.meetingAgenda}</h2>
            {(m.agendaItems ?? []).length === 0 && <p>{(m.documents ?? []).some((d: any) => d.kind === 'agenda') ? L.agendaAsDoc : L.noWebAgenda}</p>}
            <div className="agenda">{(m.agendaItems ?? []).map((a: any) => (
              <details key={a.id ?? a.number} open={!!a.legislation?.length}>
                <summary><span className="n">{a.number}</span><span><strong>{a.title}</strong><br /><span className="meta">{a.description}</span></span><ChevronDown className="chev" size={22} aria-hidden="true" /></summary>
                <div className="body">
                  {a.legislation?.length ? <ul>{a.legislation.map((l: any) => typeof l === 'object' && <li key={l.id}><Link href={`/government/legislation/${l.slug}`}>{l.identifier}</Link> — {l.title} <StatusBadge status={l.currentStatus} /></li>)}</ul> : <p className="meta">{L.noLinked}</p>}
                  {m.videoUrl && a.videoSeconds != null && <p><a href={`${m.videoUrl}#t=${a.videoSeconds}`}>Watch from {ts(a.videoSeconds)}</a></p>}
                </div>
              </details>
            ))}</div>
            {m.participation && <><h2 style={{ marginTop: 32 }}>{L.publicParticipation}</h2><p>{m.participation}</p></>}
          </>}
          {tab === 'minutes' && <>
            <h2>{L.minutes}</h2>
            {(m.minutes ?? []).length === 0 ? <p>{(m.documents ?? []).some((d: any) => d.kind === 'minutes') ? L.minutesAsDoc : L.minutesNotAvailable}</p> : m.minutes.map((v: any) => (
              <section key={v.id} className="panel" style={{ marginBottom: 16 }}>
                <h3>{v.versionLabel} <StatusBadge status={v.status === 'approved' ? 'adopted' : 'pending'} /></h3>
                {v.status !== 'approved' && <p className="meta">Draft minutes are not the official record until approved by the Council.</p>}
                {v.text && <RichText data={v.text} />}
              </section>
            ))}
            {votes.length > 0 && <><h2>{L.rollCallVotes}</h2>{votes.map((v) => (
              <div key={v.id} className="table-wrap" style={{ marginBottom: 16 }}><table>
                <caption>{v.motion} — {human(v.result)} ({v.yesCount} yes, {v.noCount} no, {v.abstainCount} abstain, {v.absentCount} absent)</caption>
                <thead><tr><th scope="col">Member</th><th scope="col">Vote</th></tr></thead>
                <tbody>{v.entries.map((e: any) => <tr key={e.id ?? e.member}><td>{e.member}</td><td>{human(e.vote)}</td></tr>)}</tbody>
              </table></div>
            ))}</>}
          </>}
          {tab === 'video' && <>
            <h2>{L.videoTranscript}</h2>
            {m.videoUrl ? <p><a href={m.videoUrl}>Watch the meeting video</a> (captions provided by the video host where available).</p> : <p>No video has been published for this meeting.</p>}
            {(m.transcript ?? []).length > 0 ? <ol style={{ listStyle: 'none', padding: 0 }}>{m.transcript.map((t: any) => (
              <li key={t.id ?? t.seconds} style={{ padding: '8px 0', borderBottom: '1px solid var(--divider)' }}><span className="meta tabular">{ts(t.seconds)}</span> <strong>{t.speaker}</strong>: {t.text}</li>
            ))}</ol> : <p>No transcript is available.</p>}
          </>}
          <DocumentList docs={(m.documents ?? []).filter((d: any) => tab === 'agenda' ? !['minutes', 'video'].includes(d.kind) : tab === 'minutes' ? d.kind === 'minutes' : d.kind === 'video')} title={tab === 'minutes' ? L.docsMinutes : tab === 'video' ? L.docsVideo : L.docsAgenda} s={L} locale={locale} />
        </article>
        <aside className="panel">
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>{L.legAtGlance}</h2>
          <p>Each item shows its recorded actions. Outcomes include adopted, defeated, tabled, deferred and withdrawn — not every proposal passes.</p>
          <ul>{recent.map((l) => <li key={l.id}><Link href={`/government/legislation/${l.slug}`}>{l.identifier}</Link> <StatusBadge status={l.currentStatus} /></li>)}</ul>
          <Link className="btn btn--gold" href="/government/legislation" style={{ width: '100%' }}>{L.viewTracker}</Link>
        </aside>
      </div>
    </div>
  )
}
