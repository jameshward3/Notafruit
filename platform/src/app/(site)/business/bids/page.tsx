import Link from 'next/link'
import { Notice, PageBand } from '@/components/ui'
import { findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bid opportunities' }

const closing = (b: any) => (b.closesAt ? `${fmtShortDate(b.closesAt)}, ${new Date(b.closesAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}` : b.closesNote ?? '—')

export default async function Bids() {
  const docs = (await findPublic('bids', { sort: 'closesAt', limit: 200 })).docs as any[]
  const open = docs.filter((b) => b.bidStatus === 'open')
  const past = docs.filter((b) => b.bidStatus !== 'open')
  const cats = [...new Set(open.map((b) => b.category || 'Other'))]
  const table = (list: any[], caption: string) => (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={`${caption} (scrolls sideways on small screens)`}>
      <table><caption>{caption}</caption>
        <thead><tr><th scope="col">Bid</th><th scope="col">Status</th><th scope="col">Closes</th></tr></thead>
        <tbody>{list.map((b) => (
          <tr key={b.id}><td><Link href={`/business/bids/${b.slug}`}>{b.title}</Link>{b.summary && <div className="meta">{b.summary.length > 160 ? `${b.summary.slice(0, 157)}…` : b.summary}</div>}</td>
            <td><span className={`badge badge--${b.bidStatus}`}>{b.bidStatus}</span></td><td className="tabular">{closing(b)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
  return (
    <>
      <PageBand eyebrow="Business" title="Bid opportunities" crumbs={[{ href: '/', label: 'Home' }, { href: '/business', label: 'Business' }, { label: 'Bids' }]}>
        <p style={{ color: '#DCE3EA' }}>Current bid and contract opportunities for consultants, service providers, contractors, vendors and suppliers.</p>
      </PageBand>
      <div className="container section">
        <Notice tone="info" title="Check the official posting before you respond">Bids are carried over from orangenj.gov and not yet reviewed by the City. Addenda, deadlines and submission rules on the original posting govern.</Notice>
        {cats.map((c) => <section key={c} style={{ marginTop: 32 }}>{table(open.filter((b) => (b.category || 'Other') === c), c)}</section>)}
        {!open.length && <p>There are no open bids right now.</p>}
        {past.length > 0 && <section style={{ marginTop: 40 }}><h2>Closed, awarded and cancelled</h2>{table(past, 'Past bids')}</section>}
        <p className="meta" style={{ marginTop: 24 }}>To be notified of new bids, sign up on <a href="https://orangenj.gov/list.aspx?Mode=Subscribe#bids" rel="noopener">orangenj.gov Notify Me</a>.</p>
      </div>
    </>
  )
}
