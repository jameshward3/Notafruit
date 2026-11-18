import Link from 'next/link'
import { PageBand } from '@/components/ui'
export const metadata = { title: 'Government' }
export default function Government() {
  const items = [
    ['/government/meetings', 'Meetings & agendas', 'Upcoming and past meetings with web-native agendas, minutes and votes.'],
    ['/government/legislation', 'Legislation', 'Ordinances and resolutions with every recorded action and vote.'],
    ['/government/officials', 'Officials & contacts', 'Mayor, City Council, City Clerk and department leaders, with photos and contact details.'],
    ['/departments', 'Departments', 'Contact information and services by department.'],
    ['/notices', 'Public notices', 'Legal and general notices.'],
    ['/calendar', 'Calendar', 'Meetings and public events.'],
  ]
  return (<><PageBand eyebrow="Government" title="How Orange is governed" /><div className="container section grid grid-2">
    {items.map(([h, t, d]) => <div key={h} className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}><Link href={h}>{t}</Link></h2><p>{d}</p></div>)}
  </div></>)
}
