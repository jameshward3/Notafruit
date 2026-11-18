import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Notice, PageBand } from '@/components/ui'
import { findOnePublic, findPublic } from '@/lib/public'
export const dynamic = 'force-dynamic'
export default async function Department({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await findOnePublic('departments', { slug: { equals: slug } }, { depth: 1 })
  if (!d) notFound()
  const services = (await findPublic('services', { where: { department: { equals: d.id } }, limit: 50 })).docs as any[]
  return (<><PageBand eyebrow="Department" title={d.name} crumbs={[{ href: '/', label: 'Home' }, { href: '/departments', label: 'Departments' }, { label: d.name }]} />
    <div className="container section layout-side"><div>
      {d.verificationStatus !== 'verified' && <Notice tone="info" title="Details pending verification">{d.summary}</Notice>}
      <h2>Services</h2>{services.length ? <ul>{services.map((s) => <li key={s.id}><Link href={`/services/${s.slug}`}>{s.title}</Link></li>)}</ul> : <p>No services listed yet.</p>}
    </div><aside className="panel"><dl className="facts">
      <dt>Phone</dt><dd>{d.phone ?? 'Not available'}</dd><dt>Address</dt><dd>{d.address ?? 'Not available'}</dd><dt>Hours</dt><dd>{d.hours ?? 'Not available'}</dd>
    </dl>{d.officialUrl && <p><a href={d.officialUrl}>Current official page</a></p>}</aside></div></>)
}
