import Link from 'next/link'
import { ExternalLink, FileText, Mail, Phone } from 'lucide-react'
import { docHref, orangenjDocId } from '@/lib/docs'
import { photoUrl, telHref } from '@/lib/officials'

type File = { id?: string; label: string; url: string }
type Outside = { id?: string; label: string; url: string; provider?: string | null }

/** Forms and documents; City files open in the in-site viewer. */
export function FileList({ files, title = 'Forms & documents' }: { files?: File[] | null; title?: string }) {
  if (!files?.length) return null
  return (
    <section aria-label={title} style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 'var(--fs-h3)' }}>{title}</h2>
      <ul className="doclist">
        {files.map((f, i) => {
          const inSite = !!orangenjDocId(f.url)
          return (
            <li key={f.id ?? i}>
              {inSite
                ? <Link href={docHref(f.url, f.label)}><FileText size={18} aria-hidden="true" /> {f.label}</Link>
                : <a href={f.url} rel="noopener"><FileText size={18} aria-hidden="true" /> {f.label} <ExternalLink size={14} aria-label="(opens another website)" /></a>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Vendor systems (payments, permits, the City Code). They refuse to be embedded, so residents get a clear hand-off. */
export function OutsideSystems({ links, title = 'Online services' }: { links?: Outside[] | null; title?: string }) {
  if (!links?.length) return null
  return (
    <section aria-label={title} style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 'var(--fs-h3)' }}>{title}</h2>
      <p className="meta">These services are run by the City&apos;s vendors. They open in a new tab because the vendors do not allow their pages to be shown inside other websites.</p>
      <ul className="handoff-grid">
        {links.map((l, i) => (
          <li key={l.id ?? i} className="handoff">
            <a href={l.url} target="_blank" rel="noopener noreferrer">
              <span className="handoff__label">{l.label}</span>
              <span className="handoff__provider">{l.provider ?? new URL(l.url).hostname} <ExternalLink size={14} aria-label="(opens in a new tab)" /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Compact contact cards (photo only when the portrait is approved). */
export function ContactCards({ people, title = 'Contacts' }: { people?: any[] | null; title?: string }) {
  const list = (people ?? []).filter((p) => p && typeof p === 'object')
  if (!list.length) return null
  return (
    <section aria-label={title}>
      <h2 style={{ fontSize: 'var(--fs-h3)' }}>{title}</h2>
      <ul className="contact-list">
        {list.map((p) => {
          const img = photoUrl(p)
          return (
            <li key={p.id}>
              {img ? <img src={img} alt="" width={56} height={70} loading="lazy" /> : <span className="contact-list__ph" aria-hidden="true">{p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</span>}
              <div>
                <Link href={`/government/officials/${p.slug}`}><strong>{p.name}</strong></Link>
                <div className="meta">{p.office}</div>
                {p.email && <div><Mail size={14} aria-hidden="true" /> <a href={`mailto:${p.email}`}>{p.email}</a></div>}
                {p.phone && <div><Phone size={14} aria-hidden="true" /> <a href={telHref(p.phone)}>{p.phone}</a></div>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export const SECTION_LABEL: Record<string, string> = {
  residents: 'Residents', business: 'Business', uez: 'Urban Enterprise Zone', 'how-do-i': 'How do I…', government: 'City government', departments: 'Departments',
}

export const sectionHref = (s: string) => (s === 'business' || s === 'uez' ? '/business' : `/info#${s}`)
