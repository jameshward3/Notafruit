import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { ContactCards, FileList, OutsideSystems } from '@/components/CityContent'
import { DemoFlag, Notice, PageBand } from '@/components/ui'
import { getLocale, t } from '@/lib/i18n'
import { findOnePublic, lacksTranslation } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function Service({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const s = await findOnePublic('services', { slug: { equals: slug } }, { depth: 2, locale })
  if (!s) notFound()
  const fallback = await lacksTranslation('services', s.id, locale)
  const info = s.infoPage && typeof s.infoPage === 'object' ? s.infoPage : null
  return (
    <>
      <PageBand eyebrow="Service" title={s.title} crumbs={[{ href: '/', label: 'Home' }, { href: '/services', label: 'Services' }, { label: s.title }]} />
      <div className="container section layout-side">
        <div className="prose" lang={fallback ? 'en' : locale}>
          {fallback && <Notice tone="info" title={t(locale).notTranslated} />}
          <DemoFlag show={s.verificationStatus === 'demo'} />
          <p className="lede">{s.summary}</p>
          {s.body && <RichText data={s.body} />}
          {info?.body && <RichText data={info.body} />}
          <OutsideSystems links={info?.externalLinks} />
          <FileList files={info?.attachments} />
          {s.externalUrl && !info?.externalLinks?.length && (
            <div className="panel" style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>Continue on {s.externalSystemName ?? 'an external site'}</h2>
              <p>You are leaving this platform. That system is operated separately and has its own privacy terms.</p>
              <a className="btn" href={s.externalUrl} rel="noopener">Go to {s.externalSystemName ?? 'the external site'} <ExternalLink size={18} aria-hidden="true" /></a>
            </div>
          )}
        </div>
        <aside className="panel">
          {s.department && typeof s.department === 'object' && <p>Department: <Link href={`/departments/${s.department.slug}`}>{s.department.name}</Link></p>}
          {info && <ContactCards people={info.contacts} title="Contact" />}
          {info && <p className="meta"><Link href={`/info/${info.slug}`}>Full City page</Link>{info.officialUrl && <> · <a href={info.officialUrl} rel="noopener">orangenj.gov</a></>}</p>}
          <p className="meta">Last updated {fmtShortDate(s.updatedAt)}{s.verificationStatus !== 'verified' ? ' · details pending verification' : ''}</p>
        </aside>
      </div>
    </>
  )
}
