import Link from 'next/link'
import { SECTION_LABEL } from '@/components/CityContent'
import { PageBand } from '@/components/ui'
import { getLocale } from '@/lib/i18n'
import { findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'City information' }

const ORDER = ['residents', 'how-do-i', 'business', 'uez', 'government', 'departments']

/** Every page carried over from orangenj.gov, grouped like the original site. */
export default async function InfoIndex() {
  const locale = await getLocale()
  const docs = (await findPublic('info-pages', { sort: 'sortOrder', limit: 500, depth: 0, locale })).docs as any[]
  const byId = new Map(docs.map((d) => [d.id, d]))
  const kids = new Map<number | null, any[]>()
  for (const d of docs) {
    const parent = typeof d.parent === 'object' ? d.parent?.id : d.parent
    const key = parent && byId.has(parent) ? parent : null
    ;(kids.get(key) ?? kids.set(key, []).get(key)!).push(d)
  }
  const tree = (d: any, depth = 0): React.ReactNode => (
    <li key={d.id}><Link href={`/info/${d.slug}`}>{d.title}</Link>
      {depth < 6 && kids.get(d.id)?.length ? <ul>{kids.get(d.id)!.map((c) => tree(c, depth + 1))}</ul> : null}
    </li>
  )
  return (
    <>
      <PageBand eyebrow="City information" title="Everything from the City website">
        <p style={{ color: '#DCE3EA' }}>Every page from orangenj.gov, brought into this site with its forms, contacts and links.</p>
      </PageBand>
      <div className="container section">
        <nav aria-label="Sections" className="tabs">{ORDER.map((s) => <a key={s} href={`#${s}`}>{SECTION_LABEL[s]}</a>)}</nav>
        <div className="grid grid-2">
          {ORDER.map((s) => {
            const roots = (kids.get(null) ?? []).filter((d) => d.section === s)
            // A section's own landing page (e.g. "Residents") lists its children directly.
            const items = roots.flatMap((r) => (r.title === SECTION_LABEL[s] || r.title === 'How Do I...' || r.title === 'UEZ Program' && s === 'uez' ? kids.get(r.id) ?? [r] : [r]))
            return (
              <section key={s} id={s} className="panel">
                <h2>{SECTION_LABEL[s]}</h2>
                {items.length ? <ul className="sitemap">{items.map((d) => tree(d))}</ul> : <p>No pages.</p>}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
