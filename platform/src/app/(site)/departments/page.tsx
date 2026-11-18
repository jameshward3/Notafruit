import Link from 'next/link'
import { PageBand } from '@/components/ui'
import { findPublic } from '@/lib/public'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Departments' }
export default async function Departments() {
  const docs = (await findPublic('departments', { sort: 'name', limit: 100 })).docs as any[]
  return (<><PageBand eyebrow="Government" title="Departments" /><div className="container section"><div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
    <caption>City departments</caption><thead><tr><th scope="col">Department</th><th scope="col">Phone</th><th scope="col">Address</th></tr></thead>
    <tbody>{docs.map((d) => <tr key={d.id}><td><Link href={`/departments/${d.slug}`}>{d.name}</Link></td><td>{d.phone ? <a href={`tel:${d.phone.replace(/\D/g, '')}`}>{d.phone}</a> : 'Not available'}</td><td>{d.address ?? 'Not available'}</td></tr>)}</tbody>
  </table></div></div></>)
}
