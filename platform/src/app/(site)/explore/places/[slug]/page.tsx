import { notFound } from 'next/navigation'
import { CivicMap } from '@/components/CivicMap'
import { DemoFlag, Notice, PageBand, WardChip, human } from '@/components/ui'
import { municipalGeoJSON, placesGeoJSON } from '@/lib/gis'
import { getClient } from '@/lib/payload'
import { findOnePublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
const JUR: Record<string, string> = { municipal: 'City of Orange Township', county: 'Essex County', state: 'State of New Jersey', school_district: 'Orange Board of Education', other: 'Another organization' }

export default async function Place({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await findOnePublic('places', { slug: { equals: slug } }, { depth: 1 })
  if (!p) notFound()
  const payload = await getClient()
  const [pts, boundary] = await Promise.all([placesGeoJSON(payload, [p]), municipalGeoJSON(payload)])
  return (
    <>
      <PageBand eyebrow={human(p.kind)} title={p.name} crumbs={[{ href: '/', label: 'Home' }, { href: '/explore', label: 'Explore Orange' }, { label: p.name }]} />
      <div className="container section layout-side">
        <div>
          <DemoFlag show={p.verificationStatus === 'demo'} text="Illustrative place — not a City record" />
          {p.summary && <p className="lede">{p.summary}</p>}
          {p.jurisdiction !== 'municipal' && <Notice tone="info" title={`Operated by ${JUR[p.jurisdiction]}`}>The City does not operate this place. Contact {JUR[p.jurisdiction]} for permits, maintenance, and hours.</Notice>}
          {p.history && <><h2>History</h2><p>{p.history}</p></>}
          {pts.features.length > 0 && <CivicMap label={`Location of ${p.name}`} places={pts as any} boundary={boundary} illustrative={p.verificationStatus !== 'verified'} />}
          {p.verificationStatus !== 'verified' && pts.features.length > 0 && <p className="meta">Map position is approximate and has not been verified.</p>}
        </div>
        <aside className="panel">
          <dl className="facts">
            <dt>Operated by</dt><dd>{JUR[p.jurisdiction]}</dd>
            <dt>Address</dt><dd>{p.address ?? 'Not available'}</dd>
            <dt>Ward</dt><dd>{p.ward ? <WardChip ward={p.ward} /> : 'Not determined'}</dd>
          </dl>
          {p.sources?.length > 0 && <><h2 style={{ fontSize: 'var(--fs-h3)' }}>Sources</h2><ul>{p.sources.map((s: any) => <li key={s.id}>{s.url ? <a href={s.url}>{s.title}</a> : s.title}</li>)}</ul></>}
        </aside>
      </div>
    </>
  )
}
