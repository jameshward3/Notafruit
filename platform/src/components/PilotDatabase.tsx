'use client'
/**
 * Interactive view of the NJ DCA "PILOT Database and Viewer" workbook: pick any municipality to see
 * its PILOT agreements, what they would pay at the normal (2025 total) tax rate, and how it compares
 * with neighbors, its county, its community type and the state; or rank every municipality.
 */
import { useEffect, useMemo, useState } from 'react'

type TownRow = [code: string, name: string, county: string, region: string, type: string, rate: number | null, totalAV: number | null, munShare: number | null, budget: number | null, neighbors: string[]]
type ProjRow = [code: string, project: string, type: string, start: string | null, end: string | null, billing: number | null, av: number | null, ufbYear: number | null]
type Data = { source: { title: string; url: string; page: string; retrieved: string; note: string }; towns: TownRow[]; projects: ProjRow[] }

const $ = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
const pct = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`)
const nameOf = (t: TownRow) => `${t[1].replace(/^City of Orange township$/, 'City of Orange Township')}, ${t[2]} County`

type Totals = { count: number; billing: number; av: number; taxes: number | null; gap: number | null; subsidy: number | null }
function totals(t: TownRow, list: ProjRow[]): Totals {
  const billing = list.reduce((a, p) => a + (p[5] ?? 0), 0)
  const av = list.reduce((a, p) => a + (p[6] ?? 0), 0)
  const taxes = t[5] != null ? (av / 100) * t[5] : null
  const gap = taxes != null ? taxes - billing : null
  return { count: list.length, billing, av, taxes, gap, subsidy: gap != null && t[7] != null ? gap * t[7] : null }
}

type SortKey = 'project' | 'type' | 'billing' | 'av' | 'taxes' | 'ratio' | 'end'
type TownSort = 'name' | 'count' | 'billing' | 'taxes' | 'subsidy' | 'subsidyPct'

export function PilotDatabase({ defaultCode = '0717' }: { defaultCode?: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [code, setCode] = useState(defaultCode)
  const [view, setView] = useState<'town' | 'state'>('town')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'taxes', dir: -1 })
  const [tsort, setTsort] = useState<{ k: TownSort; dir: 1 | -1 }>({ k: 'subsidy', dir: -1 })
  const [county, setCounty] = useState('')

  useEffect(() => { fetch('/data/dca-pilot/pilot-database.json').then((r) => r.json()).then(setData).catch(() => setError(true)) }, [])

  const idx = useMemo(() => {
    if (!data) return null
    const towns = new Map(data.towns.map((t) => [t[0], t]))
    const byTown = new Map<string, ProjRow[]>()
    for (const p of data.projects) (byTown.get(p[0]) ?? byTown.set(p[0], []).get(p[0])!).push(p)
    const tot = new Map(data.towns.map((t) => [t[0], totals(t, byTown.get(t[0]) ?? [])]))
    return { towns, byTown, tot }
  }, [data])

  if (error) return <p className="alert alert--warning">The PILOT database could not be loaded. <a href="https://www.nj.gov/dca/dlgs/misc_docs/PILOT%20Database%20and%20Viewer.xlsx">Download the original workbook from nj.gov</a>.</p>
  if (!data || !idx) return <p aria-live="polite">Loading the PILOT database…</p>

  const town = idx.towns.get(code) ?? data.towns[0]
  const list = idx.byTown.get(town[0]) ?? []
  const t = idx.tot.get(town[0])!
  const avgOf = (codes: string[]) => {
    const rows = codes.map((c) => idx.tot.get(c)).filter((x): x is Totals => !!x && x.count > 0)
    const m = (k: keyof Totals) => (rows.length ? rows.reduce((a, x) => a + ((x[k] as number) ?? 0), 0) / rows.length : null)
    return { n: rows.length, count: m('count'), billing: m('billing'), taxes: m('taxes'), subsidy: m('subsidy') }
  }
  const all = data.towns.map((x) => x[0])
  const groups: [string, ReturnType<typeof avgOf>][] = [
    ['Neighboring towns', avgOf(town[9])], [`${town[2]} County`, avgOf(data.towns.filter((x) => x[2] === town[2]).map((x) => x[0]))],
    [`${town[4]} communities`, avgOf(data.towns.filter((x) => x[4] === town[4]).map((x) => x[0]))], [`${town[3]} Jersey region`, avgOf(data.towns.filter((x) => x[3] === town[3]).map((x) => x[0]))], ['New Jersey', avgOf(all)],
  ]
  const types = [...new Set(list.map((p) => p[2]))].sort()
  const byType = types.map((ty) => ({ ty, ...totals(town, list.filter((p) => p[2] === ty)) }))
  const val = (p: ProjRow, k: SortKey) => k === 'project' ? p[1] : k === 'type' ? p[2] : k === 'billing' ? p[5] ?? -1 : k === 'av' ? p[6] ?? -1 : k === 'end' ? p[4] ?? '' : k === 'taxes' ? ((p[6] ?? 0) / 100) * (town[5] ?? 0) : (p[6] && town[5] ? (p[5] ?? 0) / ((p[6] / 100) * town[5]) : -1)
  const shown = list.filter((p) => (!type || p[2] === type) && (!q || p[1].toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => { const x = val(a, sort.k), y = val(b, sort.k); return (typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)) * sort.dir })
  const th = (k: SortKey, label: string, num = false) => (
    <th scope="col" className={num ? 'num' : undefined} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sortbtn" onClick={() => setSort({ k, dir: sort.k === k ? (sort.dir === 1 ? -1 : 1) : num ? -1 : 1 })}>{label}{sort.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>
  )
  const csv = () => {
    const rows = [['Municipality', 'Project', 'Type', 'Agreement start', 'Agreement end', 'PILOT billing', 'Assessed value', `Taxes at 2025 rate (${town[5]?.toFixed(3)})`, 'UFB year'],
      ...shown.map((p) => [nameOf(town), p[1], p[2], p[3] ?? '', p[4] ?? '', p[5] ?? '', p[6] ?? '', p[6] != null && town[5] != null ? ((p[6] / 100) * town[5]).toFixed(2) : '', p[7] ?? ''])]
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pilots-${town[1].replace(/\W+/g, '-').toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  // ---- statewide ranking
  const counties = [...new Set(data.towns.map((x) => x[2]))].sort()
  const tval = (x: TownRow, k: TownSort) => { const o = idx.tot.get(x[0])!; return k === 'name' ? x[1] : k === 'subsidyPct' ? (o.subsidy != null && x[8] ? o.subsidy / x[8] : -1) : (o[k as keyof Totals] as number) ?? -1 }
  const ranked = data.towns.filter((x) => (idx.tot.get(x[0])?.count ?? 0) > 0 && (!county || x[2] === county))
    .sort((a, b) => { const x = tval(a, tsort.k), y = tval(b, tsort.k); return (typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)) * tsort.dir })
  const tth = (k: TownSort, label: string, num = true) => (
    <th scope="col" className={num ? 'num' : undefined} aria-sort={tsort.k === k ? (tsort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sortbtn" onClick={() => setTsort({ k, dir: tsort.k === k ? (tsort.dir === 1 ? -1 : 1) : num ? -1 : 1 })}>{label}{tsort.k === k ? (tsort.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>
  )

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={view === 'town'} onClick={() => setView('town')}>One municipality</button>
        <button type="button" role="tab" aria-selected={view === 'state'} onClick={() => setView('state')}>All municipalities</button>
      </div>

      {view === 'town' && <>
        <div className="filters">
          <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="pd-town">Municipality</label>
            <select id="pd-town" value={town[0]} onChange={(e) => { setCode(e.target.value); setType(''); setQ('') }}>
              {[...data.towns].sort((a, b) => a[1].localeCompare(b[1])).map((x) => <option key={x[0]} value={x[0]}>{nameOf(x)}{(idx.tot.get(x[0])?.count ?? 0) === 0 ? ' (no PILOTs reported)' : ''}</option>)}
            </select></div>
          <div className="field"><label htmlFor="pd-q">Search projects</label><input id="pd-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="field"><label htmlFor="pd-type">Project type</label><select id="pd-type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{types.map((x) => <option key={x}>{x}</option>)}</select></div>
        </div>
        <h2>{nameOf(town)}</h2>
        <p className="meta">{town[4]} · {town[3]} Jersey · 2025 total tax rate {town[5]?.toFixed(3) ?? '—'} per $100 · municipal share of the levy {pct(town[7])} · 2025 budget {$(town[8])}</p>
        <div className="grid grid-3" style={{ margin: '12px 0 24px' }}>
          <div className="stat"><span className="stat__label">PILOT agreements</span><span className="stat__value">{t.count}</span><span className="meta">{pct(town[6] ? t.av / town[6] : null)} of the tax base ({$(t.av)})</span></div>
          <div className="stat"><span className="stat__label">PILOT payments billed</span><span className="stat__value">{$(t.billing)}</span><span className="meta">{pct(t.taxes ? t.billing / t.taxes : null, 0)} of what conventional taxes would be</span></div>
          <div className="stat"><span className="stat__label">If taxed at the 2025 rate</span><span className="stat__value">{$(t.taxes)}</span><span className="meta">Difference {$(t.gap)} (all taxing bodies)</span></div>
          <div className="stat"><span className="stat__label">Municipal subsidy</span><span className="stat__value">{$(t.subsidy)}</span><span className="meta">The municipality&apos;s share of the difference · {pct(t.subsidy != null && town[8] ? t.subsidy / town[8] : null)} of its 2025 budget</span></div>
        </div>
        {byType.length > 0 && <div className="table-wrap" tabIndex={0} role="region" aria-label="By project type (scrolls sideways on small screens)"><table>
          <caption>By type of project</caption>
          <thead><tr><th scope="col">Type</th><th scope="col" className="num">Number</th><th scope="col" className="num">PILOT billing</th><th scope="col" className="num">Assessed value</th><th scope="col" className="num">Taxes at 2025 rate</th><th scope="col" className="num">Difference</th></tr></thead>
          <tbody>{byType.map((b) => <tr key={b.ty}><th scope="row">{b.ty}</th><td className="num">{b.count}</td><td className="num">{$(b.billing)}</td><td className="num">{$(b.av)}</td><td className="num">{$(b.taxes)}</td><td className="num">{$(b.gap)}</td></tr>)}</tbody>
        </table></div>}
        <h3 style={{ marginTop: 24 }}>Projects ({shown.length})</h3>
        <p><button type="button" className="btn btn--secondary" onClick={csv}>Download these rows (CSV)</button></p>
        {shown.length === 0 ? <p>No PILOT agreements reported{q || type ? ' match these filters' : ''}.</p> : <div className="table-wrap" tabIndex={0} role="region" aria-label="PILOT projects (scrolls sideways on small screens)"><table>
          <thead><tr>{th('project', 'Project')}{th('type', 'Type')}{th('billing', 'PILOT billing', true)}{th('av', 'Assessed value', true)}{th('taxes', 'If taxed at 2025 rate', true)}{th('ratio', 'Paid vs. normal', true)}{th('end', 'Agreement ends')}</tr></thead>
          <tbody>{shown.map((p, i) => { const tx = p[6] != null && town[5] != null ? (p[6] / 100) * town[5] : null; return (
            <tr key={`${p[1]}-${i}`}><th scope="row">{p[1]}</th><td>{p[2]}</td><td className="num">{$(p[5])}</td><td className="num">{p[6] ? $(p[6]) : 'Not reported'}</td><td className="num">{p[6] ? $(tx) : '—'}</td><td className="num">{tx ? pct((p[5] ?? 0) / tx, 0) : '—'}</td><td>{p[4] ?? '—'}</td></tr>) })}</tbody>
        </table></div>}
        <h3 style={{ marginTop: 24 }}>Compared with similar places</h3>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Comparison (scrolls sideways on small screens)"><table>
          <thead><tr><th scope="col">Municipality or group</th><th scope="col" className="num">PILOTs</th><th scope="col" className="num">PILOT billing</th><th scope="col" className="num">Taxes at 2025 rate</th><th scope="col" className="num">Municipal subsidy</th></tr></thead>
          <tbody>
            <tr><th scope="row"><strong>{nameOf(town)}</strong></th><td className="num">{t.count}</td><td className="num">{$(t.billing)}</td><td className="num">{$(t.taxes)}</td><td className="num"><strong>{$(t.subsidy)}</strong></td></tr>
            {town[9].map((c) => { const n = idx.towns.get(c); const o = idx.tot.get(c); return n && o && <tr key={c}><th scope="row"><button type="button" className="linkbtn" onClick={() => setCode(c)}>{nameOf(n)}</button></th><td className="num">{o.count}</td><td className="num">{$(o.billing)}</td><td className="num">{$(o.taxes)}</td><td className="num">{$(o.subsidy)}</td></tr> })}
            {groups.map(([label, a]) => <tr key={label}><th scope="row">{label} — average of {a.n} towns with PILOTs</th><td className="num">{a.count?.toFixed(1) ?? '—'}</td><td className="num">{$(a.billing)}</td><td className="num">{$(a.taxes)}</td><td className="num">{$(a.subsidy)}</td></tr>)}
          </tbody>
        </table></div>
      </>}

      {view === 'state' && <>
        <div className="filters"><div className="field"><label htmlFor="pd-county">County</label><select id="pd-county" value={county} onChange={(e) => setCounty(e.target.value)}><option value="">All counties</option>{counties.map((c) => <option key={c}>{c}</option>)}</select></div></div>
        <p>{ranked.length} municipalities report PILOT agreements. Select a column to sort; select a name to open it.</p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="All municipalities (scrolls sideways on small screens)"><table>
          <thead><tr>{tth('name', 'Municipality', false)}{tth('count', 'PILOTs')}{tth('billing', 'PILOT billing')}{tth('taxes', 'Taxes at 2025 rate')}{tth('subsidy', 'Municipal subsidy')}{tth('subsidyPct', 'Subsidy % of budget')}</tr></thead>
          <tbody>{ranked.map((x) => { const o = idx.tot.get(x[0])!; return (
            <tr key={x[0]} className={x[0] === defaultCode ? 'is-highlight' : undefined}><th scope="row"><button type="button" className="linkbtn" onClick={() => { setCode(x[0]); setView('town'); window.scrollTo({ top: 0 }) }}>{nameOf(x)}</button></th>
              <td className="num">{o.count}</td><td className="num">{$(o.billing)}</td><td className="num">{$(o.taxes)}</td><td className="num">{$(o.subsidy)}</td><td className="num">{pct(o.subsidy != null && x[8] ? o.subsidy / x[8] : null)}</td></tr>) })}</tbody>
        </table></div>
      </>}

      <p className="meta" style={{ marginTop: 24 }}>Source: {data.source.title} (<a href={data.source.url} rel="noopener">original workbook</a>, <a href={data.source.page} rel="noopener">DLGS resources</a>), retrieved {data.source.retrieved}. {data.source.note} The municipal subsidy is the municipality&apos;s share of the difference between taxes at the normal rate and PILOT billing, as defined in the DCA workbook. Where assessed values were not reported, taxes at the normal rate are understated and the subsidy can appear negative.</p>
    </div>
  )
}
