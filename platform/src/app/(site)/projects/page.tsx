import Link from 'next/link'
import type { Where } from 'payload'
import { CivicMap, ProjectLegend } from '@/components/CivicMap'
import { GROUP_STYLE, groupOf } from '@/lib/projectStatus'
import { DemoFlag, Empty, PageBand, StatusBadge, WardChip, human } from '@/components/ui'
import { municipalGeoJSON, projectGeoJSON } from '@/lib/gis'
import { formatCents } from '@/lib/money'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { findPublic } from '@/lib/public'
import { PROJECT_PHASES } from '@/collections/data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Projects' }
const TYPES = ['paving', 'sidewalks', 'water_sewer', 'parks', 'facilities', 'traffic_safety', 'other'] as const
const WARDS = ['north', 'south', 'east', 'west'] as const

export default async function Projects({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = {
    street: one(sp.street).slice(0, 80), ward: pick(one(sp.ward), WARDS), type: pick(one(sp.type), TYPES),
    phase: pick(one(sp.phase), PROJECT_PHASES), year: /^\d{4}$/.test(one(sp.year)) ? one(sp.year) : undefined,
    view: (['list', 'map'] as const).find((v) => v === one(sp.view)) ?? 'default',
  }
  const and: Where[] = []
  if (f.street) and.push({ or: [{ 'streets.name': { like: f.street } }, { title: { like: f.street } }] })
  if (f.ward) and.push({ wards: { in: [f.ward] } })
  if (f.type) and.push({ projectType: { equals: f.type } })
  if (f.phase) and.push({ phase: { equals: f.phase } })
  if (f.year) and.push({ programYear: { equals: Number(f.year) } })
  const res = await findPublic('projects', { where: and.length ? { and } : undefined, sort: '-programYear', limit: 200 })
  const docs = res.docs as any[]
  const allYears = [...new Set(((await findPublic('projects', { limit: 500 })).docs as any[]).map((p) => p.programYear).filter(Boolean))].sort().reverse()
  const payload = await getClient()
  const [geo, boundary] = await Promise.all([projectGeoJSON(payload, docs.map((d) => d.id)), municipalGeoJSON(payload)])
  const byId = new Map(docs.map((d) => [d.id, d]))
  geo.features.forEach((ft: any) => { const p = byId.get(ft.properties.projectId); ft.properties.phase = p?.phase; ft.properties.slug = p?.slug })
  const base = { street: f.street || undefined, ward: f.ward, type: f.type, phase: f.phase, year: f.year }
  const anyDemo = docs.some((d) => d.verificationStatus === 'demo')
  // Street paving program summary (all paving projects, independent of filters).
  const paving = ((await findPublic('projects', { where: { projectType: { equals: 'paving' } }, limit: 500 })).docs as any[])
  const DONE = new Set(['substantially_complete', 'closed_out'])
  const pv = {
    streets: paving.reduce((a, p) => a + (p.streets?.length ?? 0), 0),
    done: paving.filter((p) => DONE.has(p.phase)).reduce((a, p) => a + (p.streets?.length ?? 0), 0),
    cents: paving.reduce((a, p) => a + (p.cost?.estimatedCents ?? 0), 0),
    years: [Math.min(...paving.map((p) => p.programYear)), Math.max(...paving.map((p) => p.programYear))],
  }

  return (
    <>
      <PageBand eyebrow="Capital projects" title="Better streets. Visible progress.">
        <p style={{ color: '#DCE3EA' }}>Follow street and infrastructure work from approval through closeout. Each fact shows its source.</p>
      </PageBand>
      <div className="container section">
        {anyDemo && <p><DemoFlag text="Illustrative projects and geometry — not City data" /></p>}
        {paving.length > 0 && (
          <section className="panel panel--warm" aria-labelledby="paving-program" style={{ marginBottom: 24 }}>
            <h2 id="paving-program" style={{ fontSize: 'var(--fs-h3)' }}>Street paving program {pv.years[0]}–{pv.years[1]}</h2>
            <ul className="og-kpis" style={{ marginTop: 8 }}>
              <li><strong>{pv.streets}</strong><span>streets in the program</span></li>
              <li><strong>{pv.done}</strong><span>completed</span></li>
              <li><strong>{pv.streets - pv.done}</strong><span>approved or pending</span></li>
              <li><strong>{formatCents(pv.cents)}</strong><span>programmed</span></li>
            </ul>
            <p className="meta" style={{ marginTop: 12 }}>From the Orange Street Paving map compiled by the project owner (<a href="https://jameshward3.github.io/OrangeStreetPaving/">original map</a>), not yet confirmed by City Engineering. Each street is drawn in full from U.S. Census centerlines because project limits were not recorded. <Link href={`/projects${qs(base, { type: 'paving' })}`}>Show paving projects only</Link></p>
          </section>
        )}
        <form className="filters" method="get" aria-label="Filter projects">
          <div className="field"><label htmlFor="street">Street</label><input id="street" name="street" type="text" defaultValue={f.street} /></div>
          <div className="field"><label htmlFor="ward">Ward</label><select id="ward" name="ward" defaultValue={f.ward ?? ''}><option value="">All wards</option>{WARDS.map((w) => <option key={w} value={w}>{human(w)}</option>)}</select></div>
          <div className="field"><label htmlFor="type">Type</label><select id="type" name="type" defaultValue={f.type ?? ''}><option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{human(t)}</option>)}</select></div>
          <div className="field"><label htmlFor="phase">Status</label><select id="phase" name="phase" defaultValue={f.phase ?? ''}><option value="">All statuses</option>{PROJECT_PHASES.map((t) => <option key={t} value={t}>{human(t)}</option>)}</select></div>
          <div className="field"><label htmlFor="year">Program year</label><select id="year" name="year" defaultValue={f.year ?? ''}><option value="">All years</option>{allYears.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
          <input type="hidden" name="view" value={f.view} />
          <button className="btn" type="submit">Apply filters</button>
        </form>
        <div className="tabs" role="navigation" aria-label="View">
          <Link href={`/projects${qs(base, { view: undefined })}`} aria-current={f.view !== 'list' ? 'page' : undefined}>Map and list</Link>
          <Link href={`/projects${qs(base, { view: 'list' })}`} aria-current={f.view === 'list' ? 'page' : undefined}>List only</Link>
        </div>
        <p role="status">{docs.length} project{docs.length === 1 ? '' : 's'} match.</p>
        {f.view !== 'list' && docs.length > 0 && (
          <>
            {f.view === 'default' && <Link className="btn btn--secondary map-toggle" href={`/projects${qs(base, { view: 'map' })}`}>Show map</Link>}
            <div className={f.view === 'default' ? 'map-optional' : undefined}>
              <CivicMap label="Project locations" projects={geo as any} boundary={boundary} linkBase="/projects" illustrative={geo.features.some((x: any) => x.properties.verification !== 'verified')} />
              <ProjectLegend />
            </div>
          </>
        )}
        {docs.length === 0 ? <Empty title="No projects match these filters."><p><Link href="/projects">Clear filters</Link></p></Empty> : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)">
            <table>
              <caption>Projects{f.view !== 'list' ? ' (same as the map)' : ''}</caption>
              <thead><tr><th scope="col">Project</th><th scope="col">Phase</th><th scope="col">Ward</th><th scope="col">Year</th><th scope="col" className="num">Estimated cost</th></tr></thead>
              <tbody>{docs.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/projects/${p.slug}`}>{p.title}<span className="sr-only"> — view project details</span></Link><div className="meta">{(p.streets ?? []).map((s: any) => s.name).join(', ')}</div></td>
                  <td><StatusBadge status={p.phase} /><div className="meta">{GROUP_STYLE[groupOf(p.phase)].label.replace(/ \(.*\)/, '')}</div></td>
                  <td>{(p.wards ?? []).map((w: string) => <WardChip key={w} ward={w} />)}{!p.wards?.length && 'Not available'}</td>
                  <td className="num">{p.programYear ?? 'Not available'}</td>
                  <td className="num">{formatCents(p.cost?.estimatedCents)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
