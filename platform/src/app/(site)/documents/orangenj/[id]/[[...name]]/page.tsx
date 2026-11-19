import { notFound } from 'next/navigation'
import { Download, ExternalLink, Maximize2 } from 'lucide-react'
import { Notice, PageBand } from '@/components/ui'
import { docFileUrl, docOriginalUrl, probeDoc } from '@/lib/docs'

export const dynamic = 'force-dynamic'

const titleFrom = (name?: string[]) => (name?.[0] ? decodeURIComponent(name[0]).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() : '')

export async function generateMetadata({ params }: { params: Promise<{ id: string; name?: string[] }> }) {
  const { id, name } = await params
  return { title: titleFrom(name) || `City document ${id}` }
}

/** In-site viewer for an orangenj.gov Document Center file. */
export default async function DocumentViewer({ params }: { params: Promise<{ id: string; name?: string[] }> }) {
  const { id, name } = await params
  if (!/^\d{1,7}$/.test(id)) notFound()
  const probe = await probeDoc(id)
  const title = titleFrom(name) || probe.filename?.replace(/\.\w+$/, '') || `City document ${id}`
  const file = docFileUrl(id)
  return (
    <>
      <PageBand eyebrow="City document" title={title} crumbs={[{ href: '/', label: 'Home' }, { href: '/info', label: 'City information' }, { label: title }]} />
      <div className="container section">
        {!probe.ok ? (
          <Notice tone="warning" title="This document could not be loaded">
            {probe.status === 404
              ? 'The City website no longer publishes this file. It may have been replaced by a newer version.'
              : 'The City website did not return a document we can show. Try again later, or open it on orangenj.gov.'}{' '}
            <a href={docOriginalUrl(id)} rel="noopener">Try the original link</a>.
          </Notice>
        ) : (
          <>
            <div className="viewer__actions">
              {probe.inline && <a className="btn btn--secondary" href={file} target="_blank" rel="noopener"><Maximize2 size={18} aria-hidden="true" /> Open full screen</a>}
              <a className="btn btn--secondary" href={file} download><Download size={18} aria-hidden="true" /> Download</a>
              <a className="btn btn--secondary" href={docOriginalUrl(id)} rel="noopener"><ExternalLink size={18} aria-hidden="true" /> Original on orangenj.gov</a>
            </div>
            {probe.inline ? (
              probe.type.startsWith('image/')
                ? <img className="viewer__image" src={file} alt={title} />
                : <iframe className="viewer__frame" src={file} title={title} />
            ) : (
              <Notice tone="info" title="This file opens in Word, Excel or PowerPoint">Use Download to save it. Office files cannot be shown inside a web page.</Notice>
            )}
            <p className="meta" style={{ marginTop: 12 }}>Shown from the City&apos;s Document Center on orangenj.gov. If it does not display on your device, use Download.</p>
          </>
        )}
      </div>
    </>
  )
}
