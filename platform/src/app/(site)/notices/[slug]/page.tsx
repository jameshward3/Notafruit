import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { DemoFlag, Notice, PageBand, human } from '@/components/ui'
import { getLocale, t } from '@/lib/i18n'
import { findOnePublic, lacksTranslation } from '@/lib/public'
import { fmtDate, fmtShortDate, fmtTime } from '@/lib/time'
export const dynamic = 'force-dynamic'
export default async function NoticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const n = await findOnePublic('notices', { slug: { equals: slug } }, { depth: 1, locale })
  if (!n) notFound()
  const fallback = await lacksTranslation('notices', n.id, locale)
  return (<><PageBand eyebrow={human(n.kind)} title={n.title} crumbs={[{ href: '/', label: 'Home' }, { href: '/notices', label: 'Notices' }, { label: n.title }]} />
    <div className="container section prose" lang={fallback ? 'en' : locale}>
      {fallback && <Notice tone="info" title={t(locale).notTranslated} />}
      <DemoFlag show={n.verificationStatus === 'demo'} text="Sample notice — not a City announcement" />
      <p className="lede">{n.summary}</p>
      {n.startsAt && <p><strong>Applies:</strong> {fmtDate(n.startsAt)} {fmtTime(n.startsAt)}{n.endsAt ? ` – ${fmtDate(n.endsAt)} ${fmtTime(n.endsAt)}` : ''}</p>}
      {n.body && <RichText data={n.body} />}
      <p className="meta">Published {fmtShortDate(n.publishedAt)}{n.department?.name ? ` by ${n.department.name}` : ''}</p>
    </div></>)
}
