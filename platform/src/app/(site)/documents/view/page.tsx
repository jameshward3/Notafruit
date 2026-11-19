import { notFound } from 'next/navigation'
import { DocViewer } from '@/components/DocViewer'
import { PageBand } from '@/components/ui'
import { councilDocUrl, docFileHref, probeUrl } from '@/lib/docs'

export const dynamic = 'force-dynamic'

type SP = Promise<Record<string, string | undefined>>
const titleOf = (u: string, t?: string) => (t?.trim() || decodeURIComponent(u.split('/').pop() ?? '').replace(/\.\w+$/, '').replace(/[-_]+/g, ' ')).slice(0, 160)

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const u = councilDocUrl(sp.u ?? '')
  return { title: u ? titleOf(u, sp.t) : 'City document', robots: { index: false } }
}

/** In-site viewer for a City Council (orangetwpnjcc.org) document: agendas, minutes, ordinances, resolutions. */
export default async function CouncilDocument({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const u = councilDocUrl(sp.u ?? '')
  if (!u) notFound()
  const title = titleOf(u, sp.t)
  return (
    <>
      <PageBand eyebrow="Council document" title={title} crumbs={[{ href: '/', label: 'Home' }, { href: '/government/meetings', label: 'Meetings' }, { label: title }]} />
      <div className="container section"><DocViewer title={title} file={docFileHref(u)!} original={u} originalLabel="orangetwpnjcc.org" probe={await probeUrl(u)} /></div>
    </>
  )
}
