import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { ContactCards, FileList, OutsideSystems, SECTION_LABEL, sectionHref } from '@/components/CityContent'
import { Notice, PageBand } from '@/components/ui'
import { getLocale, t } from '@/lib/i18n'
import { findOnePublic, findPublic, lacksTranslation } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await findOnePublic('info-pages', { slug: { equals: (await params).slug } })
  return { title: p?.title ?? 'City information', description: p?.summary ?? undefined }
}

/** A page carried over from orangenj.gov, shown natively. */
export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const p = await findOnePublic('info-pages', { slug: { equals: slug } }, { depth: 2, locale })
  if (!p) notFound()
  const fallback = await lacksTranslation('info-pages', p.id, locale)
  // Ancestors for the breadcrumb trail.
  const chain: any[] = []
  for (let cur = p.parent, n = 0; cur && n < 4; n++) {
    const doc = typeof cur === 'object' ? cur : await findOnePublic('info-pages', { id: { equals: cur } })
    if (!doc) break
    chain.unshift(doc)
    cur = doc.parent
  }
  const children = (await findPublic('info-pages', { where: { parent: { equals: p.id } }, sort: 'sortOrder', limit: 100, locale })).docs as any[]
  const dept = p.department && typeof p.department === 'object' ? p.department : null
  const crumbs = [{ href: '/', label: 'Home' }, { href: sectionHref(p.section), label: SECTION_LABEL[p.section] ?? 'City information' },
    ...chain.filter((c) => c.title !== SECTION_LABEL[p.section] && !/\/1\/Home$/.test(c.officialUrl ?? '')).map((c) => ({ href: `/info/${c.slug}`, label: c.title })), { label: p.title }]
  return (
    <>
      <PageBand eyebrow={dept?.name ?? SECTION_LABEL[p.section]} title={p.title} crumbs={crumbs} />
      <div className="container section layout-side">
        <div className="prose" lang={fallback ? 'en' : locale}>
          {fallback && <Notice tone="info" title={t(locale).notTranslated} />}
          {p.body ? <RichText data={p.body} /> : (!children.length && <p>{p.summary ?? 'This page has no text of its own on the City website.'}</p>)}
          <OutsideSystems links={p.externalLinks} />
          <FileList files={p.attachments} />
          {children.length > 0 && (
            <section aria-label="In this section" style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>In this section</h2>
              <ul className="subpages">{children.map((c) => <li key={c.id}><Link href={`/info/${c.slug}`}>{c.title}</Link>{c.summary && <p className="meta">{c.summary}</p>}</li>)}</ul>
            </section>
          )}
        </div>
        <aside>
          {(dept || p.contacts?.length > 0) && <div className="panel" style={{ marginBottom: 16 }}>
            {dept && <p>Department: <Link href={`/departments/${dept.slug}`}><strong>{dept.name}</strong></Link></p>}
            {dept?.phone && <p>Phone: <a href={`tel:+1${dept.phone.replace(/\D/g, '').slice(-10)}`}>{dept.phone}</a></p>}
            <ContactCards people={p.contacts} title="Contact" />
          </div>}
          <div className="panel">
            <p className="meta">Carried over from the City website{p.verificationStatus !== 'verified' ? ' and awaiting review by the City' : ''}. Last updated {fmtShortDate(p.updatedAt)}.</p>
            {p.officialUrl && <p className="meta"><a href={p.officialUrl} rel="noopener">Original page on orangenj.gov</a></p>}
          </div>
        </aside>
      </div>
    </>
  )
}
