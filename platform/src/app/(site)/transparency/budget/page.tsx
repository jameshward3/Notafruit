import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import { SimpleBars, StackedYears } from '@/components/BudgetChart'
import { DemoFlag, Empty, human } from '@/components/ui'
import { budgetView, capitalByWard, CATEGORY_META, SPEND_CATEGORIES } from '@/lib/budget'
import { formatCents, pct } from '@/lib/money'
import { parseBudgetParams } from '@/lib/budgetParams'
import { qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Budget' }

export default async function Budget({ searchParams }: { searchParams: SP }) {
  const f = parseBudgetParams(await searchParams)
  const payload = await getClient()
  const [v, cap] = await Promise.all([budgetView(payload, f), capitalByWard(payload)])
  const focus = v.byYear.filter((r) => r.fiscalYear === v.focusYear)
  const focusTotal = focus[0]?.total ?? null
  const params = { year: f.year ? String(f.year) : undefined, basis: f.basis, kind: f.kind === 'operating' ? undefined : f.kind, fund: f.fund, department: f.department, category: f.category }
  const chartRows = v.byYear.map((r) => ({ label: r.label, ...Object.fromEntries(SPEND_CATEGORIES.map((c) => [c, r.categories[c]])) }))
  const largest = focus[0] ? SPEND_CATEGORIES.map((c) => [c, focus[0].categories[c]] as const).filter(([, x]) => x != null).sort((a, b) => (b[1] as number) - (a[1] as number))[0] : null
  const latestUpdate = v.datasets.map((d) => d.dataUpdatedAt).sort().pop()

  return (
    <div className="layout-side layout-nav" style={{ display: 'grid' }}>
      <nav className="sidenav" aria-label="Budget & transparency">
        <p className="eyebrow">Budget &amp; transparency</p>
        <ul>
          <li><Link href="/transparency/budget" aria-current="page">Overview <ArrowRight size={18} aria-hidden="true" /></Link></li>
          <li><Link href="#revenues">Revenues</Link></li>
          <li><Link href="#expenditures">Expenditures</Link></li>
          <li><Link href="#capital">Capital by location</Link></li>
          <li><Link href="/transparency/budget?kind=capital">Capital budget</Link></li>
          <li><Link href="/projects">Capital projects</Link></li>
          <li><Link href="/transparency/budget/datasets">Datasets &amp; dictionary</Link></li>
        </ul>
      </nav>
      <div className="container section" style={{ maxWidth: 1180, margin: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 'var(--fs-hero)', margin: 0 }}>Public dollars. Public insight.</h1>
          <DemoFlag show={v.anyDemo} text="ILLUSTRATIVE DATA" />
        </div>
        <p className="lede">Explore how the City plans, invests, and delivers.</p>

        <form className="filters" method="get" aria-label="Budget filters">
          <div className="field"><label htmlFor="year">Fiscal year</label><select id="year" name="year" defaultValue={f.year ?? ''}><option value="">Latest</option>{v.years.map((y) => <option key={y} value={y}>FY {y}</option>)}</select></div>
          <div className="field"><label htmlFor="basis">Basis</label><select id="basis" name="basis" defaultValue={f.basis ?? ''}><option value="">All</option><option value="adopted">Adopted</option><option value="amended">Amended</option><option value="actual">Actual</option></select></div>
          <div className="field"><label htmlFor="kind">Dataset type</label><select id="kind" name="kind" defaultValue={f.kind}>{['operating', 'capital', 'appropriations', 'obligations', 'payments'].map((k) => <option key={k} value={k}>{human(k)}</option>)}</select></div>
          <div className="field"><label htmlFor="fund">Fund</label><select id="fund" name="fund" defaultValue={f.fund ?? ''}><option value="">All funds</option>{v.funds.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="department">Department</label><select id="department" name="department" defaultValue={f.department ?? ''}><option value="">All</option>{v.departments.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={f.category ?? ''}><option value="">All</option>{SPEND_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}</select></div>
          <button className="btn" type="submit">Apply</button>
        </form>
        <p className="meta">Updated: {latestUpdate ? fmtShortDate(latestUpdate) : 'Not available'} · Source: {v.datasets[0]?.sourceDescription ?? 'Not available'} · Verification: {v.datasets.length === 0 ? 'Not available' : v.anyDemo ? 'Illustrative sample data — not verified' : v.datasets.every((d) => d.verificationStatus === 'verified') ? 'Verified against official source' : 'Not yet verified'} · Units: US dollars (nominal), rounded to the dollar in charts ·<a className="cta-link" href={`/data/budget.csv${qs(params, {})}`}><Download size={16} aria-hidden="true" /> Download this data (CSV)</a></p>

        {v.datasets.length === 0 ? <Empty title="No published datasets match these filters.">
          <p>{f.kind !== 'operating' ? `No ${human(f.kind).toLowerCase()} data has been published yet.` : ''} <Link href="/transparency/budget">Reset filters</Link></p></Empty> : <>
          <div className="grid grid-3" style={{ margin: '24px 0' }}>
            <div className="stat"><span className="stat__label">Spending FY {v.focusYear}{focus[0] ? ` (${focus[0].basis})` : ''}</span><span className="stat__value">{formatCents(focusTotal)}</span></div>
            <div className="stat"><span className="stat__label">Largest category</span><span className="stat__value" style={{ fontSize: '1.5rem' }}>{largest ? CATEGORY_META[largest[0]].label : 'Not available'}</span><span className="meta">{largest ? `${pct(largest[1], focusTotal)}% of total` : ''}</span></div>
            <div className="stat"><span className="stat__label">Revenue FY {v.focusYear}</span><span className="stat__value">{formatCents(v.revenueMix.reduce<number | null>((a, m) => (m.cents == null ? a : (a ?? 0) + m.cents), null))}</span></div>
          </div>

          <section id="expenditures" aria-labelledby="spend-h" className="panel" style={{ background: 'var(--white)' }}>
            <h2 id="spend-h">Spending by category</h2>
            <p>{focus[0] && largest ? `In FY ${v.focusYear}, ${CATEGORY_META[largest[0]].label.toLowerCase()} is the largest category at ${formatCents(largest[1])} (${pct(largest[1], focusTotal)}% of ${formatCents(focusTotal)}).` : 'Summary not available.'} Years are rows; categories add up to each year&rsquo;s total.</p>
            <StackedYears title="Spending by category by year" rows={chartRows as any} series={SPEND_CATEGORIES.map((c) => ({ key: c, ...CATEGORY_META[c] }))} />
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)" style={{ marginTop: 16 }}>
              <table>
                <caption>Spending by category and year (same data as the chart)</caption>
                <thead><tr><th scope="col">Year</th>{SPEND_CATEGORIES.map((c) => <th key={c} scope="col" className="num">{CATEGORY_META[c].label}</th>)}<th scope="col" className="num">Total</th></tr></thead>
                <tbody>{v.byYear.map((r) => (
                  <tr key={r.datasetId}><th scope="row">{r.label}</th>{SPEND_CATEGORIES.map((c) => <td key={c} className="num">{formatCents(r.categories[c])}</td>)}<td className="num"><strong>{formatCents(r.total)}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>
            <p className="meta">&ldquo;Not available&rdquo; means no figure was published; it is not zero. Totals include only available figures.</p>
          </section>

          <section id="revenues" aria-labelledby="rev-h" className="panel" style={{ background: 'var(--white)', marginTop: 24 }}>
            <h2 id="rev-h">Where resources come from — FY {v.focusYear}</h2>
            <SimpleBars title="Revenue sources" rows={v.revenueMix.map((m) => ({ label: m.label, cents: m.cents, color: m.color }))} />
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)">
              <table><caption>Revenue sources, FY {v.focusYear}</caption>
                <thead><tr><th scope="col">Source</th><th scope="col" className="num">Amount</th><th scope="col" className="num">Share</th></tr></thead>
                <tbody>{v.revenueMix.map((m) => { const tot = v.revenueMix.reduce((a, x) => a + (x.cents ?? 0), 0); return <tr key={m.key}><th scope="row">{m.label}</th><td className="num">{formatCents(m.cents)}</td><td className="num">{pct(m.cents, tot) ?? 'Not available'}{pct(m.cents, tot) != null ? '%' : ''}</td></tr> })}</tbody>
              </table>
            </div>
          </section>

          <section id="capital" aria-labelledby="cap-h" className="panel" style={{ background: 'var(--white)', marginTop: 24 }}>
            <h2 id="cap-h">Capital investment by location</h2>
            <p>From published street and infrastructure projects. Estimated cost and contract award are different measures and are not added together. Projects in more than one ward are listed once under &ldquo;More than one ward&rdquo;. <DemoFlag show={cap.anyDemo} text="Includes illustrative projects" /></p>
            {cap.rows.length === 0 ? <p>No published projects yet.</p> : <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
              <caption>Published projects by ward</caption>
              <thead><tr><th scope="col">Location</th><th scope="col" className="num">Projects</th><th scope="col" className="num">Estimated cost</th><th scope="col" className="num">Contract awards</th></tr></thead>
              <tbody>{cap.rows.map((r) => (
                <tr key={r.ward}><th scope="row">{r.ward === 'multiple' ? 'More than one ward' : r.ward === 'unassigned' ? 'Ward not assigned' : `${human(r.ward)} Ward`}</th>
                  <td className="num">{r.projects}</td>
                  <td className="num">{formatCents(r.estimatedCents)}{r.missingEstimates > 0 && <span className="meta"> ({r.missingEstimates} without estimate)</span>}</td>
                  <td className="num">{formatCents(r.awardedCents)}</td></tr>
              ))}</tbody>
            </table></div>}
            <p className="meta">Ward assignments come from project records, not from map geometry. <Link href="/projects">View project details</Link></p>
          </section>

          <section aria-labelledby="follow" style={{ marginTop: 32 }}>
            <h2 id="follow">Follow the investment</h2>
            <p>Operating budgets, capital budgets, appropriations, obligations and actual payments are different things. Each dataset page explains its basis.</p>
            <ul>{v.datasets.map((d) => <li key={d.id}><Link href={`/transparency/budget/datasets/${d.slug}`}>{d.title}</Link></li>)}</ul>
          </section>
        </>}
      </div>
    </div>
  )
}
