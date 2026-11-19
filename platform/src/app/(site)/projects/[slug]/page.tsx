import { notFound } from 'next/navigation'
import { docHref } from '@/lib/docs'
import { CivicMap, ProjectLegend } from '@/components/CivicMap'
import { SubscribeForm } from '@/components/SubscribeForm'
import { DemoFlag, PageBand, StatusBadge, WardChip, human } from '@/components/ui'
import { municipalGeoJSON, projectGeoJSON } from '@/lib/gis'
import { formatCents } from '@/lib/money'
import { getClient } from '@/lib/payload'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function Project({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await findOnePublic('projects', { slug: { equals: slug } }, { depth: 1 })
  if (!p) notFound()
  const updates = (await findPublic('project-updates', { where: { project: { equals: p.id } }, sort: '-date', limit: 20 })).docs as any[]
  const payload = await getClient()
  const [geo, boundary] = await Promise.all([projectGeoJSON(payload, [p.id]), municipalGeoJSON(payload)])
  geo.features.forEach((f: any) => { f.properties.phase = p.phase })
  const demo = p.verificationStatus === 'demo'
  return (
    <>
      <PageBand eyebrow="Project" title={p.title} crumbs={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: p.title }]}>
        <p><StatusBadge status={p.phase} /> {(p.wards ?? []).map((w: string) => <WardChip key={w} ward={w} />)}</p>
      </PageBand>
      <div className="container section layout-side">
        <div>
          {demo && <p><DemoFlag text="Illustrative project — not City data" /></p>}
          <h2>Scope</h2>
          <p>{p.scope}</p>
          {p.streets?.length > 0 && <ul>{p.streets.map((s: any, i: number) => <li key={i}>{s.name}{s.limits ? ` — ${s.limits}` : ''}</li>)}</ul>}
          {geo.features.length > 0 && <><CivicMap label={`Location of ${p.title}`} projects={geo as any} boundary={boundary} illustrative={geo.features.some((x: any) => x.properties.verification !== 'verified')} /><ProjectLegend /></>}
          <h2 style={{ marginTop: 32 }}>Milestones</h2>
          <p className="meta">Approval, funding, scheduling, construction, substantial completion and closeout are recorded separately.</p>
          <ol className="timeline">
            {(p.milestones ?? []).map((m: any, i: number) => (
              <li key={i}>
                <span className={`dot ${m.actualDate ? 'dot--done' : ''}`} aria-hidden="true" />
                <strong>{m.label || human(m.kind)}</strong> — {m.actualDate ? <>completed {fmtShortDate(m.actualDate)}</> : m.plannedDate ? <>planned {fmtShortDate(m.plannedDate)}</> : 'date not available'}
                {m.evidenceUrl && <> · <a href={m.evidenceUrl}>evidence</a></>}
              </li>
            ))}
            {!p.milestones?.length && <li><span className="dot" aria-hidden="true" />No milestones recorded yet.</li>}
          </ol>
          {p.impacts && <><h2>Impacts</h2><p>{p.impacts}</p></>}
          <h2>Updates</h2>
          {updates.length === 0 ? <p>No updates yet.</p> : updates.map((u) => (
            <article key={u.id} style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 16, marginBottom: 16 }}>
              <h3>{u.title}</h3><p className="meta">{fmtShortDate(u.date)}</p><p>{u.body}</p>
            </article>
          ))}
        </div>
        <aside className="panel" aria-label="Project facts">
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>Costs</h2>
          <dl className="facts tabular">
            <dt>Estimated</dt><dd>{formatCents(p.cost?.estimatedCents)}</dd>
            <dt>Awarded</dt><dd>{formatCents(p.cost?.awardedCents)}</dd>
            <dt>Actual to date</dt><dd>{formatCents(p.cost?.actualCents)}</dd>
          </dl>
          {p.cost?.basis && <p className="meta">Basis: {p.cost.basis}</p>}
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>Funding</h2>
          {p.funding?.length ? <ul>{p.funding.map((f: any, i: number) => <li key={i}>{f.source}: {formatCents(f.amountCents)} ({f.status})</li>)}</ul> : <p>Not available.</p>}
          <dl className="facts">
            <dt>Agency</dt><dd>{p.agency ?? 'Not available'}</dd>
            <dt>Program year</dt><dd>{p.programYear ?? 'Not available'}</dd>
            <dt>Contact</dt><dd>{p.contact ?? 'City Hall'}</dd>
            <dt>Last updated</dt><dd>{fmtShortDate(p.updatedAt)}</dd>
          </dl>
          {p.sources?.length > 0 && <><h2 style={{ fontSize: 'var(--fs-h3)' }}>Sources</h2><ul>{p.sources.map((s: any) => <li key={s.id}>{s.url ? <a href={docHref(s.url, s.title)}>{s.title}</a> : s.title}</li>)}</ul></>}
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>Get updates</h2>
          <SubscribeForm topicType="project" topicId={String(p.id)} />
        </aside>
      </div>
    </>
  )
}
