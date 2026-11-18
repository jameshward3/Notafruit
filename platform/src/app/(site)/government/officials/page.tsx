import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import { Notice, PageBand } from '@/components/ui'
import { CITY_HALL } from '@/lib/facts'
import { CATEGORY_ORDER, allOfficials, photoUrl, telHref } from '@/lib/officials'
import { getLocale, t, wardName } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Officials & contacts' }

export default async function Officials() {
  const locale = await getLocale()
  const L = t(locale)
  const people = await allOfficials()
  const unverified = people.some((p) => p.verificationStatus !== 'verified')
  return (
    <>
      <PageBand eyebrow={L.government} title={L.officialsTitle} crumbs={[{ href: '/', label: L.home }, { href: '/government', label: L.government }, { label: L.officialsTitle }]}>
        <p style={{ color: '#DCE3EA' }}>{L.officialsLede}</p>
      </PageBand>
      <div className="container section">
        {unverified && (
          <Notice tone="info" title={L.importedTitle}>
            {L.importedBody} {L.contact}: <a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a>.
          </Notice>
        )}
        <nav aria-label={L.onThisPage} className="tabs" style={{ marginTop: 16 }}>
          {CATEGORY_ORDER.filter((c) => people.some((p) => p.category === c.key)).map((c) => <a key={c.key} href={`#${c.key}`}>{(L as any)[`cat_${c.key}`]}</a>)}
        </nav>
        {CATEGORY_ORDER.map((c) => {
          const list = people.filter((p) => p.category === c.key)
          if (!list.length) return null
          return (
            <section key={c.key} aria-labelledby={c.key} style={{ marginTop: 32 }}>
              <h2 id={c.key}>{(L as any)[`cat_${c.key}`]}</h2>
              {c.key === 'council' && <p className="meta">{L.councilNote} <Link href="/explore">{L.findWardMap}</Link>.</p>}
              <ul className="people">
                {list.map((p) => {
                  const img = photoUrl(p)
                  return (
                    <li key={p.id} className="person">
                      {img
                        ? <img src={img} alt={p.photo?.alt ?? ''} width={112} height={140} loading="lazy" />
                        : <span className="person__ph" aria-hidden="true">{p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
                      <div>
                        <h3><Link href={`/government/officials/${p.slug}`}>{p.name}</Link></h3>
                        <p className="person__office">{p.office}</p>
                        {p.ward && p.ward !== 'at-large' && <span className={`ward-chip ward-chip--${p.ward}`}>{wardName(L, p.ward)}</span>}
                        {p.ward === 'at-large' && <span className="ward-chip">{L.atLarge}</span>}
                        <ul className="person__contact">
                          {p.email && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${p.email}`}>{p.email}</a></li>}
                          {p.phone && <li><Phone size={16} aria-hidden="true" /><a href={telHref(p.phone)}>{p.phone}</a></li>}
                        </ul>
                        {p.termNote && <p className="meta">{p.termNote}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
