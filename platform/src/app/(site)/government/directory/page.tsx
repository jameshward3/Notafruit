import Link from 'next/link'
import { Notice, PageBand } from '@/components/ui'
import { allOfficials, telHref } from '@/lib/officials'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff directory' }

/** Every City office and staff member, grouped by department (from the orangenj.gov Staff Directory). */
export default async function StaffDirectory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = ((await searchParams).q ?? '').trim().toLowerCase().slice(0, 80)
  const people = (await allOfficials()).filter((p) => !q || `${p.name} ${p.office} ${p.department?.name ?? ''}`.toLowerCase().includes(q))
  const groups = new Map<string, any[]>()
  for (const p of people) {
    const key = p.category === 'council' ? 'City Council' : p.category === 'clerk' ? 'City Clerk' : p.department?.name ?? (p.category === 'executive' ? "Mayor's Office" : 'Other offices')
    ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(p)
  }
  const order = ["Mayor's Office", 'Administration', 'City Council', 'City Clerk']
  const keys = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b))
  const deptSlug = (list: any[]) => list.find((p) => p.department?.slug)?.department?.slug
  return (
    <>
      <PageBand eyebrow="Government" title="Staff directory" crumbs={[{ href: '/', label: 'Home' }, { href: '/government', label: 'Government' }, { label: 'Staff directory' }]}>
        <p style={{ color: '#DCE3EA' }}>Phone numbers and email addresses for City offices and staff.</p>
      </PageBand>
      <div className="container section">
        <Notice tone="info" title="Carried over from the City website">Names, titles and contact details come from the orangenj.gov Staff Directory and await confirmation by the City. Only published work phone numbers are shown.</Notice>
        <form role="search" action="/government/directory" className="inline-search" style={{ marginTop: 16 }}>
          <label htmlFor="dq">Find a person, title or department</label>
          <input id="dq" name="q" type="search" defaultValue={q} />
          <button className="btn" type="submit">Search</button>
          {q && <Link href="/government/directory">Clear</Link>}
        </form>
        {!q && <nav aria-label="Departments" className="letters letters--wide">{keys.map((k) => <a key={k} href={`#${encodeURIComponent(k)}`}>{k}</a>)}</nav>}
        {keys.map((k) => {
          const list = groups.get(k)!
          const slug = deptSlug(list)
          return (
            <section key={k} id={encodeURIComponent(k)} style={{ marginTop: 32 }}>
              <h2>{slug ? <Link href={`/departments/${slug}`}>{k}</Link> : k}</h2>
              <div className="table-wrap" tabIndex={0} role="region" aria-label={`${k} staff (scrolls sideways on small screens)`}>
                <table>
                  <thead><tr><th scope="col">Name</th><th scope="col">Title</th><th scope="col">Email</th><th scope="col">Phone</th></tr></thead>
                  <tbody>{list.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/government/officials/${p.slug}`}>{p.name}</Link></td><td>{p.office}</td>
                      <td>{p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : '—'}</td>
                      <td className="tabular">{p.phone ? <a href={telHref(p.phone)}>{p.phone}</a> : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )
        })}
        {!people.length && <p>No one matches “{q}”.</p>}
      </div>
    </>
  )
}
