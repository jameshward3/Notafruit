import Link from 'next/link'
import type { ReactNode } from 'react'
import { Notice, PageBand } from '@/components/ui'
import { TaxImpact } from '@/components/TaxImpact'
import { budgetRows, change, groupBy, isPilot, isPilotSettlement, total, type BudgetRow } from '@/lib/budgetDashboard'
import { CAPITAL_PROJECTS, CHANGE_ORDERS, COMPILED_SOURCE, HISTORY, SIX_YEAR_PLAN, TAX } from '@/lib/budgetCompiled'
import { docHref } from '@/lib/docs'
import { getClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Budget dashboard 2026' }

const TABS = [
  ['overview', 'Overview'], ['delta', '2025 vs 2026'], ['lines', 'Line items'], ['tax', 'Your property tax'], ['pilot', 'PILOT program'],
  ['grants', 'Grants'], ['capital', 'Capital & 6-year plan'], ['changes', 'Change orders'],
] as const
type Tab = (typeof TABS)[number][0]
const BUDGET_PDF = 'https://orangenj.gov/DocumentCenter/View/6373/2026-Adopted-Budget-62926'

const $ = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)
function Delta({ fy, prior }: { fy: number | null; prior: number | null }) {
  const c = change(fy, prior)
  if (!fy && !prior) return <>—</>
  const cls = c.amount > 0 ? 'delta delta--up' : c.amount < 0 ? 'delta delta--down' : 'delta'
  return <span className={cls}>{c.amount > 0 ? '+' : c.amount < 0 ? '−' : ''}{$(Math.abs(c.amount))}{c.pct != null && <> ({pct(c.pct)})</>}{!prior && fy ? ' new' : ''}{prior && !fy ? ' not budgeted' : ''}</span>
}
/** Horizontal bars with the figures printed (no information only in color or length). */
function Bars({ rows, max }: { rows: { label: ReactNode; value: number; note?: ReactNode }[]; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="hbars">{rows.map((r, i) => (
      <li key={i}><div className="hbars__head"><span>{r.label}</span><strong className="tabular">{$(r.value)}</strong></div>
        <div className="hbars__track" aria-hidden="true"><div className="hbars__fill" style={{ width: `${Math.max(0.5, (Math.max(0, r.value) / m) * 100)}%` }} /></div>
        {r.note && <div className="meta">{r.note}</div>}</li>
    ))}</ul>
  )
}
function Stat({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return <div className="stat"><span className="stat__label">{label}</span><span className="stat__value" style={{ fontSize: '1.6rem' }}>{value}</span>{note && <span className="meta">{note}</span>}</div>
}
const Compiled = () => <p className="meta">Compiled by the <a href={COMPILED_SOURCE.url} rel="noopener">{COMPILED_SOURCE.label}</a>; not part of the adopted budget&apos;s line items and not yet confirmed by the City.</p>

export default async function BudgetDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'overview') as Tab
  const { rows, available } = await budgetRows(await getClient())
  const cfExp = rows.filter((r) => r.fund === 'Current fund' && r.direction === 'expenditure')
  const cfRev = rows.filter((r) => r.fund === 'Current fund' && r.direction === 'revenue')
  const water = rows.filter((r) => r.fund !== 'Current fund' && r.direction === 'expenditure')
  const levy = cfRev.find((r) => r.account === '07-190')
  const surplus = cfRev.find((r) => r.account === '08-101')
  const misc = cfRev.filter((r) => /^Section [A-G]/.test(r.section))
  const pilots = cfRev.filter(isPilot)
  const settlements = cfRev.filter(isPilotSettlement)

  return (
    <>
      <PageBand eyebrow="Budget & transparency" title="Municipal budget dashboard 2026" crumbs={[{ href: '/', label: 'Home' }, { href: '/transparency/budget', label: 'Budget' }, { label: 'Dashboard 2026' }]}>
        <p style={{ color: '#DCE3EA' }}>Every line of the City&apos;s 2026 adopted budget, compared with 2025: departments, salaries and other expenses, revenues, PILOTs, grants and capital.</p>
      </PageBand>
      <div className="container section">
        <nav aria-label="Dashboard sections" className="tabs tabs--scroll">
          {TABS.map(([k, label]) => <Link key={k} href={`/transparency/budget/dashboard?tab=${k}`} aria-current={k === tab ? 'page' : undefined}>{label}</Link>)}
        </nav>
        {!available ? <Notice tone="info" title="The 2026 budget line items have not been published yet." /> : <>
          <p className="meta">Source: <Link href={docHref(BUDGET_PDF, '2026 Adopted Budget')}>2026 Adopted Budget</Link> (City of Orange Township, adopted June 29, 2026). &ldquo;2025&rdquo; is the 2025 column printed in that budget (the adopted 2025 budget plus grants added during the year). Lines were read automatically from the PDF and add up to its printed totals within a few dollars; open the PDF to confirm any figure.</p>

          {tab === 'overview' && <>
            <div className="grid grid-3" style={{ margin: '16px 0 24px' }}>
              <Stat label="Total appropriations 2026" value={$(total(cfExp, 'fy'))} note={<Delta fy={total(cfExp, 'fy')} prior={total(cfExp, 'prior')} />} />
              <Stat label="Raised by property tax" value={$(levy?.fy ?? null)} note={<Delta fy={levy?.fy ?? null} prior={levy?.prior ?? null} />} />
              <Stat label="Miscellaneous revenues" value={$(total(misc, 'fy'))} note={<Delta fy={total(misc, 'fy')} prior={total(misc, 'prior')} />} />
              <Stat label="Surplus used" value={$(surplus?.fy ?? null)} note={<Delta fy={surplus?.fy ?? null} prior={surplus?.prior ?? null} />} />
              <Stat label="Water & sewer utility" value={$(total(water, 'fy'))} note={<>Separate fund paid by water and sewer bills · <Delta fy={total(water, 'fy')} prior={total(water, 'prior')} /></>} />
              <Stat label="PILOT payments" value={$(total(pilots, 'fy'))} note={<>{pilots.filter((p) => p.fy).length} agreements · <Delta fy={total(pilots, 'fy')} prior={total(pilots, 'prior')} /></>} />
            </div>
            <div className="grid grid-2">
              <section className="panel" aria-labelledby="ov-rev"><h2 id="ov-rev">Where the money comes from</h2>
                <Bars rows={groupBy(cfRev, (r) => r.section).filter((g) => g.fy).map((g) => ({ label: g.name, value: g.fy, note: <>{((g.fy / total(cfRev, 'fy')) * 100).toFixed(1)}% · 2025: {$(g.prior)}</> }))} /></section>
              <section className="panel" aria-labelledby="ov-fn"><h2 id="ov-fn">What it pays for</h2>
                <Bars rows={groupBy(cfExp, (r) => r.fn).filter((g) => g.fy).map((g) => ({ label: g.name, value: g.fy, note: <>{((g.fy / total(cfExp, 'fy')) * 100).toFixed(1)}% · 2025: {$(g.prior)}</> }))} /></section>
            </div>
            <section className="panel" style={{ marginTop: 24 }} aria-labelledby="ov-depts"><h2 id="ov-depts">Largest departments and programs</h2>
              <Bars rows={groupBy(cfExp, (r) => r.program || r.fn).slice(0, 12).map((g) => ({ label: <Link href={`/transparency/budget/dashboard?tab=lines&q=${encodeURIComponent(g.name)}`}>{g.name}</Link>, value: g.fy, note: <>2025: {$(g.prior)} · <Delta fy={g.fy} prior={g.prior} /></> }))} /></section>
            <section style={{ marginTop: 24 }} aria-labelledby="ov-hist"><h2 id="ov-hist">Budget over time</h2>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="Budget history (scrolls sideways on small screens)"><table>
                <thead><tr><th scope="col">Year</th><th scope="col" className="num">Total budget</th><th scope="col" className="num">Tax levy</th><th scope="col" className="num">Surplus used</th><th scope="col">Source</th></tr></thead>
                <tbody>
                  {HISTORY.map((h) => <tr key={h.year}><th scope="row">{h.year}</th><td className="num">{$(h.total)}</td><td className="num">{$(h.taxLevy)}</td><td className="num">{$(h.surplus)}</td><td className="meta">Compiled</td></tr>)}
                  <tr><th scope="row">2025</th><td className="num">{$(total(cfExp, 'prior'))}</td><td className="num">{$(levy?.prior ?? null)}</td><td className="num">{$(surplus?.prior ?? null)}</td><td className="meta">2026 Adopted Budget</td></tr>
                  <tr><th scope="row">2026</th><td className="num">{$(total(cfExp, 'fy'))}</td><td className="num">{$(levy?.fy ?? null)}</td><td className="num">{$(surplus?.fy ?? null)}</td><td className="meta">2026 Adopted Budget</td></tr>
                </tbody></table></div><Compiled /></section>
          </>}

          {tab === 'delta' && <>
            <section aria-labelledby="d-sec"><h2 id="d-sec">By budget section</h2><Table groups={groupBy(cfExp, (r) => r.section)} /></section>
            <section style={{ marginTop: 32 }} aria-labelledby="d-fn"><h2 id="d-fn">By function</h2><Table groups={groupBy(cfExp, (r) => r.fn)} /></section>
            <div className="grid grid-2" style={{ marginTop: 32 }}>
              <section aria-labelledby="d-up"><h2 id="d-up">Largest increases (line items)</h2><LineList rows={[...cfExp].sort((a, b) => change(b.fy, b.prior).amount - change(a.fy, a.prior).amount).slice(0, 15)} /></section>
              <section aria-labelledby="d-down"><h2 id="d-down">Largest decreases (line items)</h2><LineList rows={[...cfExp].sort((a, b) => change(a.fy, a.prior).amount - change(b.fy, b.prior).amount).slice(0, 15)} /></section>
            </div>
            <section style={{ marginTop: 32 }} aria-labelledby="d-rev"><h2 id="d-rev">Revenue changes</h2><Table groups={groupBy(cfRev, (r) => r.section)} label="Revenue section" /></section>
          </>}

          {tab === 'lines' && <LineItems rows={rows} q={(sp.q ?? '').slice(0, 80)} fund={sp.fund === 'water' ? 'water' : 'current'} />}

          {tab === 'tax' && <>
            <Notice tone="info" title="How much of your bill is the City budget?">The municipal levy is one part of a property-tax bill; Essex County, the Orange school district and the library are taxed separately. This estimates the change from the City&apos;s 2026 levy.</Notice>
            <div style={{ marginTop: 16 }}><TaxImpact levy2025={levy?.prior ?? 0} levy2026={levy?.fy ?? 0} generalRate2025={TAX.generalRate2025} effectiveRate2025={TAX.effectiveRate2025} estimatedTotalLevy2025={TAX.estimatedTotalLevy2025} balconyUrl={TAX.balconyUrl} /></div>
            <p className="meta">Rates: NJ Division of Taxation, 2025 certified general tax rate 4.030 and effective tax rate 3.765 for Orange City Township. Levy: 2026 Adopted Budget, &ldquo;Local Tax for Municipal Purposes&rdquo;. Taxable base estimated from the 2025 total levy as compiled by the {COMPILED_SOURCE.label}.</p>
          </>}

          {tab === 'pilot' && <>
            <div className="grid grid-3" style={{ margin: '16px 0 24px' }}>
              <Stat label="PILOT revenue 2026" value={$(total(pilots, 'fy'))} note={<Delta fy={total(pilots, 'fy')} prior={total(pilots, 'prior')} />} />
              <Stat label="Agreements paying in 2026" value={String(pilots.filter((p) => p.fy).length)} note={`${pilots.filter((p) => !p.fy && p.prior).length} anticipated in 2025 but not in 2026`} />
              <Stat label="Share of 2026 revenues" value={`${((total(pilots, 'fy') / total(cfRev, 'fy')) * 100).toFixed(1)}%`} note={`Realized in 2025: ${$(total(pilots, 'paid'))}`} />
            </div>
            <p>Payments in lieu of taxes (PILOTs) are negotiated payments from property owners, usually redevelopment or senior housing projects, in place of conventional property taxes. {settlements.length > 0 && <> The 2026 budget also anticipates one-time PILOT settlement revenue: {settlements.map((x) => <span key={x.key}>{x.item} {$(x.fy)}</span>)}, not included in the totals below.</>}</p>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="PILOT agreements (scrolls sideways on small screens)"><table>
              <caption>PILOT agreements in the 2026 budget</caption>
              <thead><tr><th scope="col">Property / agreement</th><th scope="col" className="num">2026 anticipated</th><th scope="col" className="num">2025 anticipated</th><th scope="col" className="num">2025 realized</th><th scope="col">Change</th></tr></thead>
              <tbody>{[...pilots].sort((a, b) => (b.fy ?? 0) - (a.fy ?? 0)).map((p) => <tr key={p.key}><th scope="row">{p.item.replace(/\s*\(PILOT\)\s*/i, '')}</th><td className="num">{$(p.fy)}</td><td className="num">{$(p.prior)}</td><td className="num">{$(p.paid)}</td><td><Delta fy={p.fy} prior={p.prior} /></td></tr>)}</tbody>
              <tfoot><tr><th scope="row">Total</th><td className="num"><strong>{$(total(pilots, 'fy'))}</strong></td><td className="num">{$(total(pilots, 'prior'))}</td><td className="num">{$(total(pilots, 'paid'))}</td><td><Delta fy={total(pilots, 'fy')} prior={total(pilots, 'prior')} /></td></tr></tfoot>
            </table></div>
          </>}

          {tab === 'grants' && <>
            <p>Grants the City expects to receive (revenue) and the matching programs it budgets to spend them (appropriations). Grants added during 2025 appear in the 2025 column.</p>
            <LineTable rows={cfRev.filter((r) => /^Section F/.test(r.section))} caption="Grant revenues (Section F)" />
            <div style={{ marginTop: 24 }}><LineTable rows={cfExp.filter((r) => /^Grant programs/.test(r.section))} caption="Grant programs (appropriations offset by revenues)" /></div>
          </>}

          {tab === 'capital' && <>
            <h2>Capital in the 2026 budget</h2>
            <LineTable rows={[...cfExp.filter((r) => /^Capital|^Municipal debt/.test(r.section)), ...water.filter((r) => /capital|debt/i.test(r.section))]} caption="Capital improvements and debt service (Current Fund and Water & Sewer Utility)" />
            <h2 style={{ marginTop: 32 }}>Capital projects</h2>
            <ul className="grid grid-2" style={{ listStyle: 'none', padding: 0 }}>{CAPITAL_PROJECTS.map((p) => (
              <li key={p.name} className="panel"><h3 style={{ marginTop: 0 }}>{p.name} <span className="badge">{p.status}</span></h3><p>{p.description}</p>
                <dl className="facts"><dt>Total cost</dt><dd>{$(p.total)}</dd><dt>2026 budget</dt><dd>{$(p.budget2026)} ({((p.budget2026 / p.total) * 100).toFixed(1)}%)</dd><dt>Category</dt><dd>{p.category}</dd><dt>Timeline</dt><dd>{p.years} year{p.years > 1 ? 's' : ''}</dd></dl></li>
            ))}</ul>
            <h2 style={{ marginTop: 32 }}>Six-year capital plan, 2026–2031</h2>
            <Bars rows={SIX_YEAR_PLAN.map((y) => ({ label: String(y.year), value: y.general + y.waterSewer, note: <>General capital {$(y.general)} · Water & sewer {$(y.waterSewer)}</> }))} />
            <p>Six-year total: <strong>{$(SIX_YEAR_PLAN.reduce((a, y) => a + y.general + y.waterSewer, 0))}</strong>. See also <Link href="/projects">capital projects on the map</Link>.</p>
            <Compiled />
          </>}

          {tab === 'changes' && <>
            <Notice tone="warning" title="Change orders over 20%">Three change orders approved in 2025 exceeded the 20% threshold that must be reported to the State.</Notice>
            <ul className="grid grid-2" style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>{CHANGE_ORDERS.map((o) => (
              <li key={o.project} className="panel"><h3 style={{ marginTop: 0 }}>{o.project}</h3><p className="meta">Contractor: {o.contractor}</p>
                <dl className="facts"><dt>Original contract</dt><dd>{$(o.original)}</dd><dt>Change order</dt><dd>{$(o.increase)}</dd><dt>Increase</dt><dd><strong>{((o.increase / o.original) * 100).toFixed(1)}%</strong></dd></dl><p>{o.scope}</p></li>
            ))}</ul>
            <Compiled />
          </>}
        </>}
      </div>
    </>
  )
}

function Table({ groups, label = 'Group' }: { groups: { name: string; fy: number; prior: number }[]; label?: string }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={`${label} table (scrolls sideways on small screens)`}><table>
      <thead><tr><th scope="col">{label}</th><th scope="col" className="num">2026</th><th scope="col" className="num">2025</th><th scope="col">Change</th></tr></thead>
      <tbody>{groups.map((g) => <tr key={g.name}><th scope="row">{g.name}</th><td className="num">{$(g.fy)}</td><td className="num">{$(g.prior)}</td><td><Delta fy={g.fy} prior={g.prior} /></td></tr>)}</tbody>
    </table></div>
  )
}

function LineList({ rows }: { rows: BudgetRow[] }) {
  return <ol className="linelist">{rows.map((r) => <li key={r.key}><strong>{r.program || r.fn}</strong> — {r.item}<div className="meta">{$(r.prior)} → {$(r.fy)} · <Delta fy={r.fy} prior={r.prior} /></div></li>)}</ol>
}

function LineTable({ rows, caption }: { rows: BudgetRow[]; caption: string }) {
  if (!rows.length) return <p>No lines in this part of the budget.</p>
  const sorted = [...rows].sort((a, b) => (b.fy ?? 0) - (a.fy ?? 0) || (b.prior ?? 0) - (a.prior ?? 0))
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={`${caption} (scrolls sideways on small screens)`}><table>
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Line</th><th scope="col">Account</th><th scope="col" className="num">2026</th><th scope="col" className="num">2025</th><th scope="col">Change</th><th scope="col" className="num">2025 spent / realized</th></tr></thead>
      <tbody>{sorted.map((r) => <tr key={r.key}><th scope="row">{r.program && r.program !== r.section ? <>{r.program} — </> : null}{r.item}</th><td className="tabular">{r.account ?? '—'}</td><td className="num">{$(r.fy)}</td><td className="num">{$(r.prior)}</td><td><Delta fy={r.fy} prior={r.prior} /></td><td className="num">{$(r.paid)}</td></tr>)}</tbody>
      <tfoot><tr><th scope="row" colSpan={2}>Total</th><td className="num"><strong>{$(total(rows, 'fy'))}</strong></td><td className="num">{$(total(rows, 'prior'))}</td><td><Delta fy={total(rows, 'fy')} prior={total(rows, 'prior')} /></td><td className="num">{$(total(rows, 'paid'))}</td></tr></tfoot>
    </table></div>
  )
}

/** Every appropriation, grouped by department/program, with salaries and other expenses broken out. */
function LineItems({ rows, q, fund }: { rows: BudgetRow[]; q: string; fund: 'current' | 'water' }) {
  const exp = rows.filter((r) => r.direction === 'expenditure' && (fund === 'water' ? r.fund !== 'Current fund' : r.fund === 'Current fund'))
  const needle = q.toLowerCase()
  const shown = needle ? exp.filter((r) => `${r.program} ${r.item} ${r.fn} ${r.section} ${r.account}`.toLowerCase().includes(needle)) : exp
  const groups = groupBy(shown, (r) => r.program || r.fn)
  const sal = total(shown.filter((r) => /^salaries/i.test(r.item)), 'fy')
  const oe = total(shown.filter((r) => /^other expenses/i.test(r.item)), 'fy')
  return (
    <>
      <form className="filters" method="get" action="/transparency/budget/dashboard" aria-label="Filter line items">
        <input type="hidden" name="tab" value="lines" />
        <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="lq">Search departments and lines</label><input id="lq" name="q" type="search" defaultValue={q} placeholder="e.g. Police, overtime, 20-110" /></div>
        <div className="field"><label htmlFor="lf">Fund</label><select id="lf" name="fund" defaultValue={fund}><option value="current">Current Fund (municipal budget)</option><option value="water">Water &amp; Sewer Utility</option></select></div>
        <button className="btn" type="submit">Apply</button>
      </form>
      <p>{groups.length} departments and programs, {shown.length} lines. 2026 total <strong>{$(total(shown, 'fy'))}</strong> (2025: {$(total(shown, 'prior'))}) — salaries and wages {$(sal)}, other expenses {$(oe)}, other lines {$(total(shown, 'fy') - sal - oe)}.{q && <> <Link href="/transparency/budget/dashboard?tab=lines">Clear search</Link></>}</p>
      <div className="dept-list">{groups.map((g) => (
        <details key={g.name} className="dept">
          <summary><span className="dept__name">{g.name}</span><span className="dept__fig tabular">{$(g.fy)}</span><span className="dept__delta"><Delta fy={g.fy} prior={g.prior} /></span></summary>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={`${g.name} lines (scrolls sideways on small screens)`}><table>
            <thead><tr><th scope="col">Line</th><th scope="col">Account</th><th scope="col">Section</th><th scope="col" className="num">2026</th><th scope="col" className="num">2025</th><th scope="col">Change</th><th scope="col" className="num">2025 as modified</th><th scope="col" className="num">2025 paid or charged</th></tr></thead>
            <tbody>{g.rows.map((r) => <tr key={r.key}><th scope="row">{r.item}</th><td className="tabular">{r.account ?? '—'}</td><td>{r.section}</td><td className="num">{$(r.fy)}</td><td className="num">{$(r.prior)}</td><td><Delta fy={r.fy} prior={r.prior} /></td><td className="num">{$(r.modified)}</td><td className="num">{$(r.paid)}</td></tr>)}</tbody>
          </table></div>
        </details>
      ))}</div>
    </>
  )
}
