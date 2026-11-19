import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { FileList } from '@/components/CityContent'
import { Notice, PageBand } from '@/components/ui'
import { findOnePublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await findOnePublic('bids', { slug: { equals: (await params).slug } })
  return { title: b ? `Bid: ${b.title}` : 'Bid' }
}

const when = (d?: string | null) => (d ? `${fmtShortDate(d)}, ${new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}` : null)

export default async function Bid({ params }: { params: Promise<{ slug: string }> }) {
  const b = await findOnePublic('bids', { slug: { equals: (await params).slug } }, { depth: 1 })
  if (!b) notFound()
  return (
    <>
      <PageBand eyebrow={b.category ?? 'Bid'} title={b.title} crumbs={[{ href: '/', label: 'Home' }, { href: '/business', label: 'Business' }, { href: '/business/bids', label: 'Bids' }, { label: b.title }]} />
      <div className="container section layout-side">
        <div className="prose">
          {b.bidStatus !== 'open' && <Notice tone="warning" title={`This bid is ${b.bidStatus}`}>It is shown for reference only.</Notice>}
          {b.body ? <RichText data={b.body} /> : <p>{b.summary ?? 'See the bid documents for the full description.'}</p>}
          <FileList files={b.attachments} title="Bid documents" />
        </div>
        <aside className="panel">
          <dl className="facts">
            <dt>Status</dt><dd><span className={`badge badge--${b.bidStatus}`}>{b.bidStatus}</span></dd>
            {b.bidNumber && <><dt>Bid number</dt><dd>{b.bidNumber}</dd></>}
            {b.publishedOn && <><dt>Published</dt><dd>{when(b.publishedOn)}</dd></>}
            <dt>Closes</dt><dd>{when(b.closesAt) ?? b.closesNote ?? 'Not stated'}</dd>
            {b.contact && <><dt>Contact</dt><dd style={{ whiteSpace: 'pre-line' }}>{b.contact}</dd></>}
          </dl>
          {b.officialUrl && <p><a href={b.officialUrl} rel="noopener">Official posting on orangenj.gov</a></p>}
          <p className="meta">Carried over from orangenj.gov; the official posting governs.</p>
        </aside>
      </div>
    </>
  )
}
