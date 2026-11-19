import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import { docFileHref, docHref, viewable } from '@/lib/docs'
import { t, type Locale, type Strings } from '@/lib/strings'
import { fmtShortDate } from '@/lib/time'

type Doc = { id?: string; label: string; kind?: string; url: string; checksumSha256?: string | null; retrievedAt?: string | null; text?: string | null }

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const isPdf = (u: string) => /\.pdf($|\?)/i.test(u) || /DocumentCenter\/View\//i.test(u)

/**
 * Original documents with provenance. City files open in the in-site viewer, and PDFs can be
 * previewed right here (the frame loads only when opened). Machine-extracted text is labeled unofficial.
 */
export function DocumentList({ docs, title, s, locale = 'en' }: { docs: Doc[]; title?: string; s?: Strings; locale?: Locale }) {
  if (!docs?.length) return null
  const L = s ?? t('en')
  const heading = title ?? L.originalDocuments
  return (
    <section aria-label={heading} style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 'var(--fs-h3)' }}>{heading}</h2>
      <ul className="doclist">
        {docs.map((d, i) => {
          const inSite = viewable(d.url)
          const file = inSite && isPdf(d.url) ? docFileHref(d.url) : null
          return (
            <li key={d.id ?? i}>
              {inSite
                ? <Link href={docHref(d.url, d.label)}><FileText size={18} aria-hidden="true" /> {d.label}</Link>
                : <a href={d.url} rel="noopener"><FileText size={18} aria-hidden="true" /> {d.label}</a>}{' '}
              <span className="meta">({isPdf(d.url) ? 'PDF, ' : /\.docx?$/i.test(d.url) ? 'Word, ' : ''}{host(d.url)}{!inSite && <ExternalLink size={12} aria-label={L.opensOfficial} />}{inSite && <> · <a href={d.url} rel="noopener">original</a></>})</span>
              {d.checksumSha256 && <div className="meta tabular">{L.archivedCopy.replace('{h}', d.checksumSha256.slice(0, 16)).replace('{d}', d.retrievedAt ? fmtShortDate(d.retrievedAt, locale) : '—')}</div>}
              {file && (
                <details className="doclist__preview">
                  <summary>Preview here</summary>
                  <iframe src={file} title={d.label} loading="lazy" />
                </details>
              )}
              {d.text && (
                <details className="doclist__text">
                  <summary>{L.readUnofficial}</summary>
                  <p className="meta">{L.unofficialNote}</p>
                  <pre>{d.text}</pre>
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
