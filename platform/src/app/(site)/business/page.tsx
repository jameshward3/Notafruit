import Link from 'next/link'
import { Briefcase, Building2, ExternalLink, FileText, Gavel, Landmark, Receipt, Store } from 'lucide-react'
import { PageBand } from '@/components/ui'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Business' }

/** Business hub: everything under the orangenj.gov "Business" and "UEZ Program" tabs. */
export default async function Business() {
  const open = (await findPublic('bids', { where: { bidStatus: { equals: 'open' } }, sort: 'closesAt', limit: 6 })) as any
  const listings = await findPublic('business-listings', { limit: 1 })
  const page = (title: string) => findOnePublic('info-pages', { title: { equals: title } })
  const [forms, assessor, collector, uez, planning, redevelopment] = await Promise.all([
    page('Forms, Permits & License Applications'), page('Tax Assessor'), page('Tax Collector'), page('UEZ Program'), page('Planning & Economic Development'), page('Redevelopment Information'),
  ])
  const uezKids = uez ? ((await findPublic('info-pages', { where: { parent: { equals: uez.id } }, sort: 'sortOrder', limit: 50 })).docs as any[]) : []
  const tiles = [
    { href: '/business/bids', icon: Gavel, title: 'Bid opportunities', text: `${open.totalDocs} open bids, RFPs and RFQs for consultants, contractors, vendors and suppliers.` },
    { href: '/business/directory', icon: Store, title: 'Business directory', text: `${listings.totalDocs} businesses and organizations operating in Orange.` },
    forms && { href: `/info/${forms.slug}`, icon: FileText, title: 'Forms, permits & licenses', text: 'Construction, zoning, food, salon, tobacco, raffle, special-event and other applications.' },
    assessor && { href: `/info/${assessor.slug}`, icon: Landmark, title: 'Tax Assessor', text: 'Assessments, exemptions, tax appeals and the tax map.' },
    collector && { href: `/info/${collector.slug}`, icon: Receipt, title: 'Tax Collector', text: 'Property tax bills, due dates and how to pay.' },
    uez && { href: `/info/${uez.slug}`, icon: Briefcase, title: 'Urban Enterprise Zone (UEZ)', text: 'Reduced sales tax and incentives for qualified Orange businesses.' },
    planning && { href: `/info/${planning.slug}`, icon: Building2, title: 'Planning & economic development', text: 'Zoning, building, code enforcement and development review.' },
    redevelopment && { href: `/info/${redevelopment.slug}`, icon: Building2, title: 'Redevelopment', text: 'Redevelopment areas, the development pipeline and completed projects.' },
  ].filter(Boolean) as { href: string; icon: any; title: string; text: string }[]
  return (
    <>
      <PageBand eyebrow="Business" title="Doing business in Orange" crumbs={[{ href: '/', label: 'Home' }, { label: 'Business' }]}>
        <p style={{ color: '#DCE3EA' }}>Bids and contracts, the local business directory, licenses and permits, property taxes and the Urban Enterprise Zone.</p>
      </PageBand>
      <div className="container section">
        <ul className="grid grid-3 tiles">
          {tiles.map((t) => (
            <li key={t.href} className="panel tile"><t.icon size={28} aria-hidden="true" /><h2><Link href={t.href}>{t.title}</Link></h2><p>{t.text}</p></li>
          ))}
          <li className="panel tile"><Briefcase size={28} aria-hidden="true" /><h2><a href="https://orangenj.gov/Jobs.aspx" rel="noopener">City job postings <ExternalLink size={16} aria-label="(orangenj.gov)" /></a></h2><p>Current openings with the City, on orangenj.gov.</p></li>
        </ul>
        {open.docs.length > 0 && (
          <section style={{ marginTop: 40 }} aria-labelledby="open-bids">
            <h2 id="open-bids">Closing soon</h2>
            <ul className="bidlist">{open.docs.map((b: any) => (
              <li key={b.id}><Link href={`/business/bids/${b.slug}`}><strong>{b.title}</strong></Link>
                <div className="meta">{b.category} · {b.closesAt ? `Closes ${fmtShortDate(b.closesAt)}` : b.closesNote ?? 'Open'}</div></li>
            ))}</ul>
            <p><Link className="btn btn--secondary" href="/business/bids">All bid opportunities</Link></p>
          </section>
        )}
        {uezKids.length > 0 && (
          <section style={{ marginTop: 40 }} aria-labelledby="uez">
            <h2 id="uez">Urban Enterprise Zone</h2>
            <ul className="subpages">{uezKids.map((c) => <li key={c.id}><Link href={`/info/${c.slug}`}>{c.title}</Link></li>)}</ul>
          </section>
        )}
      </div>
    </>
  )
}
