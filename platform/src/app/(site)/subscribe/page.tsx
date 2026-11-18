import { SubscribeForm } from '@/components/SubscribeForm'
import { PageBand } from '@/components/ui'
export const metadata = { title: 'Get updates' }
export default function Subscribe() {
  return (<><PageBand eyebrow="Get updates" title="Email updates" /><div className="container section grid grid-2">
    <div className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}>Public notices</h2><SubscribeForm topicType="notices" /></div>
    <div className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}>Meetings</h2><SubscribeForm topicType="meetings" /></div>
    <p className="meta">For a specific project, use the form on that project&rsquo;s page.</p>
  </div></>)
}
