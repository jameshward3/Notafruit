import Link from 'next/link'
import type { Where } from 'payload'
import { MapPin, Phone } from 'lucide-react'
import { PageBand } from '@/components/ui'
import { telHref } from '@/lib/officials'
import { findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Business directory' }

const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const letterOf = (name: string) => (/^[a-z]/i.test(name) ? name[0].toUpperCase() : '#')

export default async function BusinessDirectory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const where: Where | undefined = q ? { or: [{ name: { like: q } }, { address: { like: q } }] } : undefined
  const docs = ((await findPublic('business-listings', { where, sort: 'name', limit: 500 })).docs as any[])
    .sort((a, b) => a.name.replace(/^\W+/, '').localeCompare(b.name.replace(/^\W+/, '')))
  const groups = LETTERS.map((l) => [l, docs.filter((d) => letterOf(d.name.replace(/^\W+/, '')) === l)] as const).filter(([, list]) => list.length)
  return (
    <>
      <PageBand eyebrow="Business" title="Business directory" crumbs={[{ href: '/', label: 'Home' }, { href: '/business', label: 'Business' }, { label: 'Directory' }]}>
        <p style={{ color: '#DCE3EA' }}>Businesses and organizations in Orange, as listed in the City&apos;s resource directory.</p>
      </PageBand>
      <div className="container section">
        <form role="search" action="/business/directory" className="inline-search">
          <label htmlFor="bq">Search by name or street</label>
          <input id="bq" name="q" defaultValue={q} type="search" />
          <button className="btn" type="submit">Search</button>
          {q && <Link href="/business/directory">Clear</Link>}
        </form>
        <p className="meta">{docs.length} listing{docs.length === 1 ? '' : 's'}{q ? ` matching “${q}”` : ''}. Listings are carried over from orangenj.gov and may be out of date.</p>
        {!q && <nav aria-label="Jump to letter" className="letters">{groups.map(([l]) => <a key={l} href={`#l-${l}`}>{l}</a>)}</nav>}
        {groups.map(([l, list]) => (
          <section key={l} aria-labelledby={`l-${l}`} style={{ marginTop: 24 }}>
            <h2 id={`l-${l}`}>{l}</h2>
            <ul className="biz-list">{list.map((b) => (
              <li key={b.id}>
                <strong>{b.website ? <a href={b.website} rel="noopener nofollow">{b.name}</a> : b.name}</strong>
                {b.address && <div><MapPin size={14} aria-hidden="true" /> {b.address}</div>}
                {b.phone && <div><Phone size={14} aria-hidden="true" /> <a href={telHref(b.phone)}>{b.phone}</a></div>}
              </li>
            ))}</ul>
          </section>
        ))}
      </div>
    </>
  )
}
