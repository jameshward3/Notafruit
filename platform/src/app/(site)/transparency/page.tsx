import Link from 'next/link'
import { PageBand } from '@/components/ui'
export const metadata = { title: 'Transparency' }
export default function Transparency() {
  const items = [
    ['/transparency/budget', 'Budget', 'Operating and capital budgets, revenues and spending by year.'],
    ['/transparency/budget/datasets', 'Open data', 'Download datasets with a data dictionary.'],
    ['/projects', 'Capital projects', 'Street and infrastructure work from approval through closeout.'],
    ['/government/legislation', 'Legislation & votes', 'Every recorded action and roll-call vote.'],
  ]
  return (<><PageBand eyebrow="Transparency" title="Public dollars. Public insight." /><div className="container section grid grid-2">
    {items.map(([h, t, d]) => <div key={h} className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}><Link href={h}>{t}</Link></h2><p>{d}</p></div>)}
  </div></>)
}
