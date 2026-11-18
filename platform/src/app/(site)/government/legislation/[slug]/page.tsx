import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DocumentList } from '@/components/DocumentList'
import { GovTabs } from '@/components/GovTabs'
import { Breadcrumbs, DemoFlag, Notice, StatusBadge, human } from '@/components/ui'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'
import { getLocale, t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
const NEGATIVE = new Set(['defeated', 'withdrawn', 'vetoed', 'tabled'])

export default async function LegislationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale()
  const L = t(locale)
  const { slug } = await params
  const l = await findOnePublic('legislation', { slug: { equals: slug } }, { depth: 1 })
  if (!l) notFound()
  const votes = (await findPublic('votes', { where: { legislation: { equals: l.id } }, limit: 50, depth: 1 })).docs as any[]
  const actions = [...(l.actions ?? [])].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
  const sponsors = (l.sponsors ?? []).filter((s: any) => s.verified)
  return (
    <div className="container section">
      <Breadcrumbs items={[{ href: '/', label: L.home }, { href: '/government/legislation', label: L.legislation }, { label: l.identifier }]} />
      <GovTabs current="legislation" />
      <p className="eyebrow">{human(l.type)}</p>
      <h1>{l.identifier}: {l.title}</h1>
      <p><StatusBadge status={l.currentStatus} /> <DemoFlag show={l.verificationStatus === 'demo'} text="Sample legislation — not a City record" /></p>
      <div className="layout-side">
        <div>
          {l.summary && <p className="lede">{l.summary}</p>}
          <h2>{L.text}</h2>
          {l.verificationStatus === 'unverified' && <Notice tone="info" title={L.importedLegTitle}>{L.importedLegBody}</Notice>}
          {(l.textVersions ?? []).length === 0 ? <p>{(l.documents ?? []).length ? L.readOriginalBelow : L.noTextYet}</p> : l.textVersions.map((v: any) => (
            <section key={v.id} style={{ marginBottom: 24 }}>
              <h3>{v.label}{v.date ? ` (${fmtShortDate(v.date)})` : ''}</h3>
              {!v.reviewedAgainstOriginal && <Notice tone="warning" title={L.unofficialText}>{L.unofficialTextBody}</Notice>}
              <div className="legal-text">{v.text}</div>
              {v.original?.url && <p><a href={v.original.url}>Original document</a></p>}
            </section>
          ))}
          <DocumentList docs={l.documents ?? []} title={L.originalDocuments} s={L} locale={locale} />
          <h2>{L.votes}</h2>
          {votes.length === 0 ? <p>{L.noVotes}</p> : votes.map((v) => (
            <div key={v.id} className="table-wrap" style={{ marginBottom: 16 }}><table>
              <caption>{v.motion} — {human(v.result)}{v.meeting?.startsAt ? `, ${fmtShortDate(v.meeting.startsAt)}` : ''}</caption>
              <thead><tr><th scope="col">Member</th><th scope="col">Vote</th></tr></thead>
              <tbody>{v.entries.map((e: any) => <tr key={e.id ?? e.member}><td>{e.member}</td><td>{human(e.vote)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={2}>{v.yesCount} yes · {v.noCount} no · {v.abstainCount} abstain · {v.absentCount} absent</td></tr></tfoot>
            </table></div>
          ))}
        </div>
        <aside className="panel">
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>{L.everyStep}</h2>
          {actions.length === 0 ? <p>{L.noActions}</p> : <ol className="timeline">{actions.map((a: any, i: number) => (
            <li key={a.id ?? i}><span className={`dot ${NEGATIVE.has(a.action) ? 'dot--negative' : 'dot--done'}`} aria-hidden="true" />
              <strong>{human(a.action)}</strong> — {fmtShortDate(a.date, locale)}
              {a.meeting?.slug && <div><Link href={`/government/meetings/${a.meeting.slug}`}>{a.meeting.title}</Link></div>}
              {a.note && <div className="meta">{a.note}</div>}
              {a.evidenceUrl && <div><a href={a.evidenceUrl}>{L.evidence}</a></div>}
            </li>
          ))}</ol>}
          <dl className="facts">
            <dt>{L.sponsors}</dt><dd>{sponsors.length ? sponsors.map((x: any) => x.name).join(', ') : L.notVerified}</dd>
            <dt>{L.effective}</dt><dd>{l.effectiveDate ? fmtShortDate(l.effectiveDate, locale) : L.notAvailable}</dd>
          </dl>
        </aside>
      </div>
    </div>
  )
}
