import { notFound } from 'next/navigation'
import { DocViewer } from '@/components/DocViewer'
import { PageBand } from '@/components/ui'
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
  return (
    <>
      <PageBand eyebrow="City document" title={title} crumbs={[{ href: '/', label: 'Home' }, { href: '/info', label: 'City information' }, { label: title }]} />
      <div className="container section"><DocViewer title={title} file={docFileUrl(id)} original={docOriginalUrl(id)} originalLabel="orangenj.gov" probe={probe} /></div>
    </>
  )
}
