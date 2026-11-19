import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { ContactCards, FileList, OutsideSystems } from '@/components/CityContent'
import { Notice, PageBand } from '@/components/ui'
import { telHref } from '@/lib/officials'
import { findOnePublic, findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = await findOnePublic('departments', { slug: { equals: (await params).slug } })
  return { title: d?.name ?? 'Department' }
}

export default async function Department({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await findOnePublic('departments', { slug: { equals: slug } }, { depth: 1 })
  if (!d) notFound()
  const [services, pages, people] = await Promise.all([
    findPublic('services', { where: { department: { equals: d.id } }, limit: 50 }).then((r) => r.docs as any[]),
    findPublic('info-pages', { where: { department: { equals: d.id } }, sort: 'sortOrder', limit: 100, depth: 0 }).then((r) => r.docs as any[]),
    findPublic('officials', { where: { department: { equals: d.id } }, sort: 'sortOrder', limit: 200, depth: 1 }).then((r) => r.docs as any[]),
  ])
  // The department's own page from orangenj.gov (same URL), with its sub-pages listed below.
  const home = pages.find((p) => p.officialUrl === d.officialUrl) ?? null
  const homeFull = home ? await findOnePublic('info-pages', { id: { equals: home.id } }, { depth: 0 }) : null
  const sub = pages.filter((p) => p.id !== home?.id)
  const leaders = people.filter((p) => p.category !== 'staff')
  const staff = people.filter((p) => p.category === 'staff')
  return (
    <>
      <PageBand eyebrow="Department" title={d.name} crumbs={[{ href: '/', label: 'Home' }, { href: '/departments', label: 'Departments' }, { label: d.name }]} />
      <div className="container section layout-side">
        <div className="prose">
          {d.verificationStatus !== 'verified' && <Notice tone="info" title="Details pending verification">Carried over from orangenj.gov and awaiting review by the City.</Notice>}
          {homeFull?.body ? <RichText data={homeFull.body} /> : d.summary && <p className="lede">{d.summary}</p>}
          <OutsideSystems links={homeFull?.externalLinks} />
          <FileList files={homeFull?.attachments} />
          {sub.length > 0 && (
            <section aria-label="Pages" style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>{d.name} pages</h2>
              <ul className="subpages">{sub.map((p) => <li key={p.id}><Link href={`/info/${p.slug}`}>{p.title}</Link>{p.summary && <p className="meta">{p.summary}</p>}</li>)}</ul>
            </section>
          )}
          {services.length > 0 && (
            <section aria-label="Services" style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>Services</h2>
              <ul>{services.map((s) => <li key={s.id}><Link href={`/services/${s.slug}`}>{s.title}</Link></li>)}</ul>
            </section>
          )}
          {staff.length > 0 && (
            <section aria-label="Staff" style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>Staff</h2>
              <ul className="staff-list">{staff.map((p) => (
                <li key={p.id}><Link href={`/government/officials/${p.slug}`}>{p.name}</Link> <span className="meta">{p.office}</span>
                  {p.email && <> · <a href={`mailto:${p.email}`}>{p.email}</a></>}{p.phone && <> · <a href={telHref(p.phone)}>{p.phone}</a></>}</li>
              ))}</ul>
            </section>
          )}
        </div>
        <aside>
          <div className="panel">
            <dl className="facts">
              <dt>Phone</dt><dd>{d.phone ? <a href={telHref(d.phone)}>{d.phone}</a> : 'Not available'}</dd>
              <dt>Address</dt><dd>{d.address ?? 'Not available'}</dd>
              {d.hours && <><dt>Hours</dt><dd>{d.hours}</dd></>}
            </dl>
            <p className="meta"><Link href="/government/directory">Full staff directory</Link></p>
          </div>
          {leaders.length > 0 && <div className="panel" style={{ marginTop: 16 }}><ContactCards people={leaders} title="Leadership" /></div>}
          {d.officialUrl && <p className="meta" style={{ marginTop: 16 }}><a href={d.officialUrl} rel="noopener">Original page on orangenj.gov</a></p>}
        </aside>
      </div>
    </>
  )
}
