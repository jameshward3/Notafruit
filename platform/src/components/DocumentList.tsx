import { ExternalLink, FileText } from 'lucide-react'
import { t, type Locale, type Strings } from '@/lib/strings'
import { fmtShortDate } from '@/lib/time'

type Doc = { id?: string; label: string; kind?: string; url: string; checksumSha256?: string | null; retrievedAt?: string | null; text?: string | null }

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }

/** Original documents with provenance; machine-extracted text is clearly labeled unofficial. */
export function DocumentList({ docs, title, s, locale = 'en' }: { docs: Doc[]; title?: string; s?: Strings; locale?: Locale }) {
  if (!docs?.length) return null
  const L = s ?? t('en')
  const heading = title ?? L.originalDocuments
  return (
    <section aria-label={heading} style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 'var(--fs-h3)' }}>{heading}</h2>
      <ul className="doclist">
        {docs.map((d, i) => (
          <li key={d.id ?? i}>
            <a href={d.url} rel="noopener"><FileText size={18} aria-hidden="true" /> {d.label}</a>{' '}
            <span className="meta">({/\.pdf($|\?)/i.test(d.url) ? 'PDF, ' : ''}{host(d.url)}<ExternalLink size={12} aria-label={L.opensOfficial} />)</span>
            {d.checksumSha256 && <div className="meta tabular">{L.archivedCopy.replace('{h}', d.checksumSha256.slice(0, 16)).replace('{d}', d.retrievedAt ? fmtShortDate(d.retrievedAt, locale) : '—')}</div>}
            {d.text && (
              <details className="doclist__text">
                <summary>{L.readUnofficial}</summary>
                <p className="meta">{L.unofficialNote}</p>
                <pre>{d.text}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
