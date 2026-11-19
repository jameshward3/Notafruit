import { Download, ExternalLink, Maximize2 } from 'lucide-react'
import { Notice } from '@/components/ui'
import type { DocProbe } from '@/lib/docs'

/** Interactive in-page viewer for a City document (browser PDF viewer: page through, zoom, search, print). */
export function DocViewer({ title, file, original, originalLabel, probe }: { title: string; file: string; original: string; originalLabel: string; probe: DocProbe }) {
  if (!probe.ok) {
    return (
      <Notice tone="warning" title="This document could not be loaded">
        {probe.status === 404 ? 'The City website no longer publishes this file. It may have been replaced by a newer version.' : 'The City website did not return a document we can show. Try again later.'}{' '}
        <a href={original} rel="noopener">Try the original link</a>.
      </Notice>
    )
  }
  return (
    <>
      <div className="viewer__actions">
        {probe.inline && <a className="btn btn--secondary" href={file} target="_blank" rel="noopener"><Maximize2 size={18} aria-hidden="true" /> Open full screen</a>}
        <a className="btn btn--secondary" href={file} download><Download size={18} aria-hidden="true" /> Download</a>
        <a className="btn btn--secondary" href={original} rel="noopener"><ExternalLink size={18} aria-hidden="true" /> Original on {originalLabel}</a>
      </div>
      {probe.inline
        ? probe.type.startsWith('image/') ? <img className="viewer__image" src={file} alt={title} /> : <iframe className="viewer__frame" src={file} title={title} />
        : <Notice tone="info" title="This file opens in Word, Excel or PowerPoint">Use Download to save it. Office files cannot be shown inside a web page.</Notice>}
      <p className="meta" style={{ marginTop: 12 }}>Shown from the City&apos;s files on {originalLabel}. If it does not display on your device, use Download.</p>
    </>
  )
}
