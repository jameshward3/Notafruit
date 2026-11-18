import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Notice, PageBand } from '@/components/ui'
import { formatCents } from '@/lib/money'
import { photoUrl, telHref } from '@/lib/officials'
import { sponsoredBy } from '@/lib/opengov'
import { getClient } from '@/lib/payload'
import { StatusBadge } from '@/components/ui'
import { fmtShortDate } from '@/lib/time'
import { findOnePublic } from '@/lib/public'
import { getLocale, t, wardName } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const o = await findOnePublic('officials', { slug: { equals: (await params).slug } })
  return { title: o ? `${o.name}, ${o.office}` : 'Official' }
}

export default async function Official({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale()
  const L = t(locale)
  const { slug } = await params
  const o = await findOnePublic('officials', { slug: { equals: slug } }, { depth: 1 })
  if (!o) notFound()
  const img = o.photo?.approvalStatus === 'approved' ? o.photo.url : photoUrl(o)
  const sources = (o.sources ?? []).filter((s: any) => typeof s === 'object')
  const sponsored = o.category === 'council' ? await sponsoredBy(await getClient(), o.name, 25) : []
  const og = (extra = '') => `/government/open?year=all&sponsor=${o.slug}${extra}`
  return (
    <>
      <PageBand eyebrow={o.office} title={o.name} crumbs={[{ href: '/', label: L.home }, { href: '/government/officials', label: L.officialsTitle }, { label: o.name }]} />
      <div className="container section layout-side">
        <div>
          {o.verificationStatus !== 'verified' && <Notice tone="info" title={L.profileImported}>{L.profileImportedBody}</Notice>}
          {o.bio ? o.bio.split(/\n{2,}/).map((para: string, i: number) => <p key={i}>{para}</p>) : <p>{L.noBio}</p>}
          {o.ward && o.ward !== 'at-large' && <p><Link href={`/explore?ward=${o.ward}`}>{L.seeWardOnMap}</Link></p>}
          {o.category === 'council' && (
            <section aria-labelledby="sponsored" style={{ marginTop: 32 }}>
              <h2 id="sponsored"><Link href={og('#og-items')}>Legislation sponsored ({sponsored.length})</Link></h2>
              <p className="meta">Sponsors as printed on posted agendas and minutes (read automatically; not yet confirmed by the City Clerk). Select an item to see it in the Open Government tracker with its votes and budget connection.</p>
              {sponsored.length === 0 ? <p>No sponsored legislation has been found in the posted agendas and minutes yet.</p> : (
                <ul className="sponsored-list">{sponsored.map((l: any) => (
                  <li key={l.slug}>
                    <Link href={og(`&item=${l.slug}#leg-${l.slug}`)}><strong>{l.identifier}</strong></Link> <StatusBadge status={l.status} />
                    <div>{l.title.length > 180 ? `${l.title.slice(0, 177)}…` : l.title}</div>
                    <div className="meta">{l.lastDate ? fmtShortDate(l.lastDate, locale) : ''}{l.amountCents ? ` · ${formatCents(Number(l.amountCents))}` : ''}</div>
                  </li>))}</ul>
              )}
              <p><Link className="btn btn--secondary" href={og('#og-members')}>Voting record in the Open Government tracker</Link></p>
            </section>
          )}
        </div>
        <aside className="panel">
          {img && <img src={img} alt={o.photo?.alt ?? `Portrait of ${o.name}`} width={240} height={300} style={{ width: '100%', maxWidth: 280, height: 'auto', marginBottom: 16 }} />}
          <dl className="facts">
            <dt>{L.office}</dt><dd>{o.office}</dd>
            {o.ward && <><dt>{L.represents}</dt><dd>{o.ward === 'at-large' ? L.wholeCityAtLarge : <span className={`ward-chip ward-chip--${o.ward}`}>{wardName(L, o.ward)}</span>}</dd></>}
            {o.email && <><dt>{L.email}</dt><dd><a href={`mailto:${o.email}`}>{o.email}</a></dd></>}
            {o.phone && <><dt>{L.phone}</dt><dd><a href={telHref(o.phone)}>{o.phone}</a></dd></>}
            {o.address && <><dt>{L.officeAddress}</dt><dd>{o.address}</dd></>}
            {o.termNote && <><dt>{L.term}</dt><dd>{o.termNote.replace(/^Term /, '')}</dd></>}
          </dl>
          {o.contactUrl && <p><a href={o.contactUrl}>{L.officialProfile}</a></p>}
          {sources.length > 0 && <p className="meta">{L.source}: {[...new Set(sources.map((s: any) => s.owner))].join('; ')}.</p>}
        </aside>
      </div>
    </>
  )
}
