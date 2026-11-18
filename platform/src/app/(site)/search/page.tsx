import Link from 'next/link'
import { SearchAutocomplete } from '@/components/SearchAutocomplete'
import { DemoFlag, Empty, PageBand, human } from '@/components/ui'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { search } from '@/lib/search'
import { fmtShortDate } from '@/lib/time'
import { getLocale, t, wardName } from '@/lib/i18n'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Search' }
const TYPES = ['legislation', 'meeting', 'notice', 'service', 'project', 'place', 'dataset', 'event'] as const
/** Allow only <mark> from ts_headline; escape everything else. */
const safeSnippet = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>')
export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const locale = await getLocale()
  const L = t(locale)
  const sp = await searchParams
  const q = one(sp.q).slice(0, 200), type = pick(one(sp.type), TYPES), page = Math.max(1, Number(one(sp.page)) || 1)
  const ward = pick(one(sp.ward), ['north', 'south', 'east', 'west'] as const)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? one(sp.from) : undefined
  const res = q ? await search(await getClient(), q, { type, ward, from }, page, 20) : { hits: [], total: 0 }
  const base = { q, type, ward, from }
  return (<><PageBand eyebrow={L.search} title={q ? L.resultsFor.replace('{q}', q) : L.searchTitle} /><div className="container section">
    <form className="filters" method="get" role="search" aria-label={L.search}>
      <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="q">{L.keywords}</label><SearchAutocomplete id="q" defaultValue={q} s={L} /></div>
      <div className="field"><label htmlFor="type">{L.filterType}</label><select id="type" name="type" defaultValue={type ?? ''}><option value="">{L.all}</option>{TYPES.map((x) => <option key={x} value={x}>{(L as any)[`type_${x}`] ?? human(x)}</option>)}</select></div>
      <div className="field"><label htmlFor="ward">{L.filterWard}</label><select id="ward" name="ward" defaultValue={ward ?? ''}><option value="">{L.all}</option>{['north', 'south', 'east', 'west'].map((w) => <option key={w} value={w}>{wardName(L, w)}</option>)}</select></div>
      <div className="field"><label htmlFor="from">{L.onOrAfter}</label><input id="from" name="from" type="text" inputMode="numeric" placeholder="YYYY-MM-DD" defaultValue={from} /></div>
      <button className="btn" type="submit">{L.searchSubmit}</button>
    </form>
    {q && <p role="status">{res.total === 1 ? L.resultsOne : L.resultsCount.replace('{n}', String(res.total))}</p>}
    {q && res.hits.length === 0 && <Empty title={L.noResults}><p>{L.noResultsHint} <Link href="/services">{L.services}</Link>.</p></Empty>}
    <ol style={{ listStyle: 'none', padding: 0 }}>{res.hits.map((h) => (
      <li key={`${h.collection}-${h.docId}`} style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}>
        <span className="badge badge--neutral">{(L as any)[`type_${h.contentType}`] ?? human(h.contentType)}</span> <DemoFlag show={!!h.isDemo} text="Sample" />
        <h2 style={{ fontSize: 'var(--fs-h3)', margin: '8px 0' }}><Link href={h.url}>{h.identifier ? `${h.identifier}: ` : ''}{h.title}</Link></h2>
        {h.snippet && <p className="meta" dangerouslySetInnerHTML={{ __html: safeSnippet(h.snippet) }} />}
        {h.date && <p className="meta">{fmtShortDate(h.date, locale)}</p>}
      </li>))}</ol>
    {res.total > page * 20 && <Link className="btn btn--secondary" href={`/search${qs(base, { page: String(page + 1) })}`}>{L.moreResults}</Link>}
  </div></>)
}
