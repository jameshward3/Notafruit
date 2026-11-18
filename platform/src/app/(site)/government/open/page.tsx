import Link from 'next/link'
import { CouncilBand } from '@/components/CouncilBand'
import { GovTabs } from '@/components/GovTabs'
import { Notice, StatusBadge, human } from '@/components/ui'
import { CATEGORY_RULES_LIST } from '@/lib/fiscal'
import { getLocale, t } from '@/lib/i18n'
import { formatCents } from '@/lib/money'
import { photoUrl } from '@/lib/officials'
import { budgetConnection, memberScorecards, trackerKpis, trackerRows, trackerYears, voteMatrix } from '@/lib/opengov'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Open government — legislative tracker' }
const STATUSES = ['introduced', 'in_review', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'pending'] as const
const TYPES = ['ordinance', 'resolution', 'bond_ordinance'] as const
const VOTE_MARK: Record<string, { s: string; label: string; cls: string }> = {
  yes: { s: '✓', label: 'Yes', cls: 'vm-yes' }, no: { s: '✕', label: 'No', cls: 'vm-no' }, abstain: { s: 'A', label: 'Abstain', cls: 'vm-abs' },
  absent: { s: '–', label: 'Absent', cls: 'vm-out' }, recused: { s: 'R', label: 'Recused', cls: 'vm-out' },
}
const tally = (r: { yes: number | null; no: number | null; abstain: number | null }) => (r.yes == null ? '—' : `${r.yes}–${r.no}${r.abstain ? `–${r.abstain}` : ''}`)

export default async function OpenGovernment({ searchParams }: { searchParams: SP }) {
  const locale = await getLocale()
  const L = t(locale)
  const sp = await searchParams
  const payload = await getClient()
  const years = await trackerYears(payload)
  const year = one(sp.year) === 'all' ? undefined : (years.includes(one(sp.year)) ? one(sp.year) : years[0])
  const officials = (await findPublic('officials', { where: { category: { equals: 'council' } }, depth: 1, limit: 50, sort: 'sortOrder' })).docs as any[]
  const sponsor = officials.find((o) => o.slug === one(sp.sponsor)) ?? null
  const f = { year, sponsor: sponsor?.slug, category: one(sp.category) || undefined, status: pick(one(sp.status), STATUSES), type: pick(one(sp.type), TYPES), q: one(sp.q).slice(0, 100) || undefined }
  const item = one(sp.item)
  const [kpi, rows, budget, cards, matrix] = await Promise.all([
    trackerKpis(payload, f, sponsor?.name ?? null),
    trackerRows(payload, f, sponsor?.name ?? null),
    budgetConnection(payload, year),
    memberScorecards(payload, year),
    voteMatrix(payload, year),
  ])
  const current = new Set(officials.map((o) => o.name))
  const members = officials.filter((o) => cards.some((c) => c.member === o.name))
  const maxBar = Math.max(1, ...budget.rows.map((r) => Math.max(r.authorizedCents, r.budgetCents ?? 0)))
  const base = { year: one(sp.year) || undefined, sponsor: f.sponsor, category: f.category, status: f.status, type: f.type, q: f.q }

  return (
    <>
      <CouncilBand s={L} />
      <div className="container section">
        <GovTabs current="open" />
        <h2 style={{ marginTop: 8 }}>Open government: legislative tracker{year ? ` — ${year}` : ''}{sponsor ? ` — sponsored by ${sponsor.name}` : ''}</h2>
        <Notice tone="info" title="How this tracker is built">
          Votes, outcomes, movers and sponsors are read automatically from the posted Council minutes (2024 onward, where the minutes are text PDFs). Dollar amounts and budget categories are inferred from each item&rsquo;s official title. Budget figures are the compiled figures used by the Orange Legislative Tracker. None of this has been reviewed by the City Clerk or Finance yet; every item links to its original document.
        </Notice>

        <form className="filters" method="get" aria-label="Filter the tracker" style={{ marginTop: 16 }}>
          <div className="field"><label htmlFor="year">Year</label><select id="year" name="year" defaultValue={one(sp.year) || year || ''}>{years.map((y) => <option key={y} value={y}>{y}</option>)}<option value="all">All years</option></select></div>
          <div className="field"><label htmlFor="sponsor">Sponsor</label><select id="sponsor" name="sponsor" defaultValue={f.sponsor ?? ''}><option value="">Anyone</option>{officials.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>
          <div className="field"><label htmlFor="category">Budget category</label><select id="category" name="category" defaultValue={f.category ?? ''}><option value="">All</option>{CATEGORY_RULES_LIST.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={f.status ?? ''}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{human(s)}</option>)}</select></div>
          <div className="field"><label htmlFor="type">Type</label><select id="type" name="type" defaultValue={f.type ?? ''}><option value="">All</option>{TYPES.map((s) => <option key={s} value={s}>{human(s)}</option>)}</select></div>
          <div className="field"><label htmlFor="og-q">Number or title</label><input id="og-q" name="q" type="search" defaultValue={f.q} /></div>
          <button className="btn" type="submit">{L.apply}</button>
        </form>

        <ul className="og-kpis" aria-label="Summary">
          <li><strong>{kpi.items.toLocaleString('en-US')}</strong><span>items tracked</span></li>
          <li><strong>{kpi.adopted.toLocaleString('en-US')}</strong><span>adopted</span></li>
          <li><strong>{kpi.defeated}</strong><span>defeated</span></li>
          <li><strong>{kpi.pending}</strong><span>introduced / in progress</span></li>
          <li><strong>{kpi.votes.toLocaleString('en-US')}</strong><span>roll-call votes · {kpi.votes ? Math.round((kpi.unanimous / kpi.votes) * 100) : 0}% unanimous</span></li>
          <li><strong>{formatCents(kpi.spendingCents)}</strong><span>spending authorized (adopted items)</span></li>
          <li><strong>{formatCents(kpi.revenueCents)}</strong><span>grants &amp; revenue accepted</span></li>
          {budget.budgetTotalCents && <li><strong>{formatCents(budget.budgetTotalCents)}</strong><span>FY{budget.year} appropriations (compiled)</span></li>}
        </ul>

        <section aria-labelledby="og-budget" style={{ marginTop: 32 }}>
          <h2 id="og-budget">Legislation and the budget{year ? ` (FY${year})` : ''}</h2>
          <p className="meta">Adopted spending items by budget category, next to that department&rsquo;s budget line where the compiled budget has one. Contract amounts are often &ldquo;not to exceed&rdquo; or multi-year, so this shows what the Council authorized, not what was spent. {budget.dataset && <Link href={`/transparency/budget/datasets/${budget.dataset.slug}`}>See the budget dataset</Link>}</p>
          {budget.rows.length === 0 ? <p>No adopted spending items with stated amounts for this year.</p> : (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Budget connection table (scrolls sideways on small screens)"><table className="og-budget">
              <thead><tr><th scope="col">Category</th><th scope="col" className="num">Items</th><th scope="col" className="num">Authorized by legislation</th><th scope="col" className="num">Budget line</th><th scope="col">Comparison</th></tr></thead>
              <tbody>{budget.rows.map((r) => (
                <tr key={r.category}>
                  <th scope="row"><Link href={`/government/open${qs(base, { category: r.category })}`}>{r.category}</Link></th>
                  <td className="num">{r.items}</td><td className="num">{formatCents(r.authorizedCents)}</td><td className="num">{r.budgetCents ? formatCents(r.budgetCents) : 'No line'}</td>
                  <td><span className="og-bar" aria-hidden="true"><i className="og-bar__auth" style={{ width: `${(r.authorizedCents / maxBar) * 100}%` }} />{r.budgetCents ? <i className="og-bar__budget" style={{ width: `${(r.budgetCents / maxBar) * 100}%` }} /> : null}</span>
                    <span className="sr-only">{r.budgetCents ? `${Math.round((r.authorizedCents / r.budgetCents) * 100)}% of the budget line` : 'No matching budget line'}</span></td>
                </tr>))}</tbody>
            </table></div>
          )}
          <p className="meta"><span className="og-key og-key--auth" aria-hidden="true" /> Authorized by legislation <span className="og-key og-key--budget" aria-hidden="true" /> Budget line</p>
        </section>

        {members.length > 0 && (
          <section aria-labelledby="og-members" style={{ marginTop: 32 }}>
            <h2 id="og-members">Council voting records{year ? ` (${year} legislation)` : ''}</h2>
            <p className="meta">Counted per roll call: a consent agenda adopted by one vote counts once. Spending totals add up each item voted on.</p>
            <ul className="og-cards">
              {members.map((o) => { const c = cards.find((x) => x.member === o.name)!; const img = photoUrl(o); return (
                <li key={o.id} className={sponsor?.slug === o.slug ? 'is-on' : undefined}>
                  <div className="og-cards__head">{img ? <img src={img} alt="" width={48} height={48} /> : null}<div><Link href={`/government/officials/${o.slug}`}><strong>{o.name}</strong></Link><br /><span className="meta">{o.office}</span></div></div>
                  <dl>
                    <div><dt>Yes</dt><dd>{c.yes}</dd></div><div><dt>No</dt><dd>{c.no}</dd></div><div><dt>Abstain</dt><dd>{c.abstain}</dd></div><div><dt>Absent</dt><dd>{c.absent}</dd></div><div><dt>Roll calls</dt><dd>{c.total}</dd></div>
                    <div><dt>Present for</dt><dd>{c.participation}%</dd></div><div><dt>Sponsored</dt><dd>{c.sponsored}</dd></div>
                  </dl>
                  <p className="meta">Voted yes on {formatCents(c.supportedCents)} of spending items{c.opposedCents ? `; no on ${formatCents(c.opposedCents)}` : ''}.</p>
                  <Link href={`/government/open${qs(base, { sponsor: o.slug })}#og-items`}>Legislation sponsored</Link>
                </li>
              ) })}
            </ul>
            {cards.some((c) => !current.has(c.member)) && <p className="meta">Former members in this period: {cards.filter((c) => !current.has(c.member)).map((c) => `${c.member} (${c.yes} yes, ${c.no} no)`).join('; ')}.</p>}
          </section>
        )}

        {matrix.votes.length > 0 && (
          <section aria-labelledby="og-matrix" style={{ marginTop: 32 }}>
            <h2 id="og-matrix">Recent divided votes</h2>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Vote matrix (scrolls sideways on small screens)"><table className="og-matrix">
              <thead><tr><th scope="col">Item</th>{members.map((o) => <th key={o.id} scope="col" className="num" title={o.name}>{o.name.replace(/,?\s+(III|II|Jr\.?)$/, '').split(' ').pop()}</th>)}<th scope="col">Result</th></tr></thead>
              <tbody>{matrix.votes.map((v) => (
                <tr key={v.id}>
                  <th scope="row"><Link href={`/government/legislation/${v.slug}`}>{v.identifier}</Link><br /><span className="meta">{fmtShortDate(v.date, locale)}{v.verification === 'needs_review' ? ' · needs review' : ''}</span></th>
                  {members.map((o) => { const vote = matrix.entries.get(v.id)?.get(o.name); const m = vote ? VOTE_MARK[vote] : null; return <td key={o.id} className={`num ${m?.cls ?? ''}`}>{m ? <><span aria-hidden="true">{m.s}</span><span className="sr-only">{m.label}</span></> : '·'}</td> })}
                  <td>{human(v.result)}</td>
                </tr>))}</tbody>
            </table></div>
            <p className="meta">✓ yes · ✕ no · A abstain · – absent. Only roll calls that were not unanimous are shown.</p>
          </section>
        )}

        <section aria-labelledby="og-items" style={{ marginTop: 32 }}>
          <h2 id="og-items">Legislation ({rows.total.toLocaleString('en-US')})</h2>
          {rows.rows.length === 0 ? <p>No legislation matches these filters.</p> : (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Legislation table (scrolls sideways on small screens)"><table className="og-items">
              <thead><tr><th scope="col">Item</th><th scope="col">Title</th><th scope="col">Sponsor</th><th scope="col">Status</th><th scope="col" className="num">Vote</th><th scope="col" className="num">Amount</th><th scope="col">Category</th><th scope="col">Last action</th></tr></thead>
              <tbody>{rows.rows.map((r) => (
                <tr key={r.id} id={`leg-${r.slug}`} className={item === r.slug ? 'is-target' : undefined}>
                  <td><Link href={`/government/legislation/${r.slug}`}>{r.identifier}</Link></td>
                  <td>{r.title.length > 160 ? `${r.title.slice(0, 157)}…` : r.title}</td>
                  <td>{r.sponsors ?? '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="num">{tally(r)}{r.voteVerification === 'needs_review' ? ' *' : ''}</td>
                  <td className="num">{r.amountCents ? `${r.fiscalKind === 'revenue' ? '+' : ''}${formatCents(r.amountCents)}` : '—'}</td>
                  <td>{r.category ?? '—'}</td>
                  <td>{r.lastDate ? fmtShortDate(r.lastDate, locale) : '—'}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          {rows.total > rows.rows.length && <p className="meta">Showing the {rows.rows.length} most recent. Narrow the filters to see others.</p>}
          <p className="meta">* The minutes contradict themselves on this vote; check the original. Vote = yes–no(–abstain) on the most recent roll call.</p>
        </section>
      </div>
    </>
  )
}
