import { ConcernForm } from '@/components/ConcernForm'
import { Notice, PageBand } from '@/components/ui'
export const metadata = { title: 'Report a concern' }
export default function Report() {
  return (<><PageBand eyebrow="Services" title="Report a concern" /><div className="container section layout-side"><div>
    <Notice tone="warning" title="Emergencies: call 911">This form is for non-emergency issues. Your report is stored privately and is never published.</Notice>
    <ConcernForm />
  </div><aside className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}>What happens next</h2><p>You receive a reference number immediately. Staff review requests and route them to the responsible department.</p><p className="meta">Prototype: routing to department work-order systems is not yet connected.</p></aside></div></>)
}
