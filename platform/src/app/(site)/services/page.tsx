import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { PageBand, human } from '@/components/ui'
import { getLocale } from '@/lib/i18n'
import { findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Services' }

export default async function Services() {
  const locale = await getLocale()
  const docs = (await findPublic('services', { sort: 'title', limit: 200, locale })).docs as any[]
  const groups = Object.entries(docs.reduce<Record<string, any[]>>((a, s) => ((a[s.category] ??= []).push(s), a), {}))
  return (
    <>
      <PageBand eyebrow="Services" title="How can we help?" />
      <div className="container section">
        <p><Link href="/report-a-concern">Report a concern</Link> · <Link href="/departments">Departments</Link></p>
        {groups.map(([cat, items]) => (
          <section key={cat} style={{ marginBottom: 32 }}>
            <h2>{human(cat)}</h2>
            <ul className="grid grid-2" style={{ listStyle: 'none', padding: 0 }}>{items.map((s) => (
              <li key={s.id} className="panel"><h3><Link href={`/services/${s.slug}`}>{s.title}</Link></h3><p>{s.summary}</p>{s.externalUrl && <p className="meta"><ExternalLink size={14} aria-hidden="true" /> Uses {s.externalSystemName ?? 'an external system'}</p>}</li>
            ))}</ul>
          </section>
        ))}
      </div>
    </>
  )
}
