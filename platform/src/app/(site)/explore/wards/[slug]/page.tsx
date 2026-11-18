import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DemoFlag, Notice, PageBand, StatusBadge, human } from '@/components/ui'
import { WardMap } from '@/components/WardMap'
import { explorerData } from '@/lib/explorer'
import { CITY_HALL } from '@/lib/facts'
import { findPublic } from '@/lib/public'
import { getLocale, t, wardName } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function Ward({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale()
  const L = t(locale)
  const { slug } = await params
  const ward = (await findPublic('wards', { where: { slug: { equals: slug } }, depth: 1, limit: 1 })).docs[0] as any
  if (!ward) notFound()
  const d = await explorerData()
  const places = d.places.filter((p) => d.wardByPlace.get(p.id) === slug)
  const projects = d.projects.filter((p) => (p.wards ?? []).includes(slug))
  const mapWards = d.wards ? { verification: d.wards.verification, custodian: d.wards.custodian, fc: d.wards.fc } : null
  return (
    <>
      <PageBand eyebrow={L.colWard} title={wardName(L, slug)} crumbs={[{ href: '/', label: L.home }, { href: '/explore', label: L.explore }, { label: wardName(L, slug) }]} />
      <div className="container section">
        {d.wards?.verification !== 'verified' && <Notice tone="info" title={L.wardLinesPending}>{L.wardLinesBody} {CITY_HALL.phone}.</Notice>}
        <WardMap boundary={d.boundary} wards={mapWards as any} stats={d.stats?.stats ?? []} districts={d.districts as any} roads={d.roads as any} places={d.pts as any} projects={d.proj as any} reps={d.reps} initialWard={slug} lockWard strings={L} />
        <div className="grid grid-2" style={{ marginTop: 32 }}>
          <section>
            <h2>{L.allPlaces} ({places.length})</h2>
            {places.length === 0 ? <p>{L.noPlacesWard}</p> : <ul>{places.map((p) => <li key={p.id}><Link href={`/explore/places/${p.slug}`}>{p.name}</Link> <span className="meta">({human(p.kind)})</span> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></li>)}</ul>}
          </section>
          <section>
            <h2>{L.projects} ({projects.length})</h2>
            {projects.length === 0 ? <p>{L.noProjectsWard}</p> : <ul>{projects.map((p) => <li key={p.id}><Link href={`/projects/${p.slug}`}>{p.title}</Link> <StatusBadge status={p.phase} /> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></li>)}</ul>}
          </section>
        </div>
        <p style={{ marginTop: 24 }}><Link href="/government/officials">{L.officialsContacts}</Link> · <Link href="/explore">{L.backToWards}</Link></p>
      </div>
    </>
  )
}
