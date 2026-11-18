import Link from 'next/link'
import { DemoFlag, PageBand, human } from '@/components/ui'
import { findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Budget datasets' }

export default async function Datasets() {
  const ds = (await findPublic('budget-datasets', { sort: '-fiscalYear', limit: 200 })).docs as any[]
  return (
    <>
      <PageBand eyebrow="Open data" title="Budget datasets" crumbs={[{ href: '/', label: 'Home' }, { href: '/transparency', label: 'Transparency' }, { href: '/transparency/budget', label: 'Budget' }, { label: 'Datasets' }]} />
      <div className="container section">
        <h2>Data dictionary</h2>
        <dl className="facts" style={{ marginBottom: 32 }}>
          <dt>fiscal_year</dt><dd>City fiscal year the figures belong to.</dd>
          <dt>basis</dt><dd>Adopted (as passed), amended (after transfers/amendments) or actual (as spent/received).</dd>
          <dt>dataset_kind</dt><dd>Operating, capital, appropriations, obligations/encumbrances, or actual payments. These are not interchangeable.</dd>
          <dt>direction</dt><dd>Expenditure or revenue.</dd>
          <dt>amount_usd</dt><dd>Nominal US dollars to the cent. Blank = not available (not zero).</dd>
          <dt>verification</dt><dd>&ldquo;verified&rdquo; against an official source, or &ldquo;ILLUSTRATIVE&rdquo; demo data.</dd>
        </dl>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
          <caption>Published datasets</caption>
          <thead><tr><th scope="col">Dataset</th><th scope="col">Year</th><th scope="col">Basis</th><th scope="col">Type</th><th scope="col">Updated</th></tr></thead>
          <tbody>{ds.map((d) => <tr key={d.id}><td><Link href={`/transparency/budget/datasets/${d.slug}`}>{d.title}</Link> <DemoFlag show={d.verificationStatus === 'demo'} text="Illustrative" /></td><td className="num">{d.fiscalYear}</td><td>{human(d.basis)}</td><td>{human(d.kind)}</td><td>{fmtShortDate(d.dataUpdatedAt)}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}
