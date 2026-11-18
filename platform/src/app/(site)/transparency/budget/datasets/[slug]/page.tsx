import { notFound } from 'next/navigation'
import { DemoFlag, PageBand, human } from '@/components/ui'
import { formatCents, sumCents } from '@/lib/money'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function Dataset({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await findOnePublic('budget-datasets', { slug: { equals: slug } }, { depth: 1 })
  if (!d) notFound()
  const lines = (await findPublic('budget-lines', { where: { dataset: { equals: d.id } }, limit: 500, sort: 'fund' })).docs as any[]
  return (
    <>
      <PageBand eyebrow="Dataset" title={d.title} crumbs={[{ href: '/', label: 'Home' }, { href: '/transparency/budget', label: 'Budget' }, { href: '/transparency/budget/datasets', label: 'Datasets' }, { label: d.title }]} />
      <div className="container section">
        <DemoFlag show={d.verificationStatus === 'demo'} text="Illustrative data — not City figures" />
        <dl className="facts" style={{ margin: '24px 0' }}>
          <dt>Fiscal year</dt><dd>{d.fiscalYear}</dd><dt>Basis</dt><dd>{human(d.basis)}</dd><dt>Type</dt><dd>{human(d.kind)}</dd>
          <dt>Units</dt><dd>{d.units}</dd><dt>Source</dt><dd>{d.sourceDescription}</dd><dt>Data updated</dt><dd>{fmtShortDate(d.dataUpdatedAt)}</dd>
        </dl>
        {d.definitions && <><h2>Definitions</h2><p>{d.definitions}</p></>}
        {d.corrections?.length > 0 && <><h2>Corrections</h2><ul>{d.corrections.map((c: any, i: number) => <li key={i}>{fmtShortDate(c.date)}: {c.note}</li>)}</ul></>}
        <p><a className="cta-link" href={`/data/budget.csv?year=${d.fiscalYear}&basis=${d.basis}&kind=${d.kind}`}>Download CSV</a></p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
          <caption>Rows ({lines.length})</caption>
          <thead><tr><th scope="col">Fund</th><th scope="col">Direction</th><th scope="col">Category</th><th scope="col">Description</th><th scope="col" className="num">Amount</th></tr></thead>
          <tbody>{lines.map((l) => <tr key={l.id}><td>{l.fund}</td><td>{human(l.direction)}</td><td>{human(l.category)}</td><td>{l.description}</td><td className="num">{formatCents(l.amountCents, true)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={4}>Total expenditures (available figures)</th><td className="num"><strong>{formatCents(sumCents(lines.filter((l) => l.direction === 'expenditure').map((l) => l.amountCents)), true)}</strong></td></tr></tfoot>
        </table></div>
      </div>
    </>
  )
}
