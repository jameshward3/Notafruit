import Link from 'next/link'
import type { Where } from 'payload'
import { CouncilBand } from '@/components/CouncilBand'
import { GovTabs } from '@/components/GovTabs'
import { DemoFlag, Empty, StatusBadge, human } from '@/components/ui'
import { one, pick, type SP } from '@/lib/params'
import { findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Legislation' }
const STATUSES = ['pending', 'introduced', 'in_review', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed'] as const
const TYPES = ['ordinance', 'resolution', 'bond_ordinance'] as const

export default async function LegislationList({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  if (one(sp.view) === 'votes') {
    const votes = (await findPublic('votes', { sort: '-createdAt', limit: 50, depth: 1 })).docs as any[]
    return (<><CouncilBand /><div className="container section"><GovTabs current="votes" />
      <h2>Recorded votes</h2>
      {votes.length === 0 ? <Empty title="No votes published yet." /> : <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
        <caption>Roll-call votes</caption>
        <thead><tr><th scope="col">Motion</th><th scope="col">Meeting</th><th scope="col">Result</th><th scope="col" className="num">Yes</th><th scope="col" className="num">No</th><th scope="col" className="num">Abstain</th><th scope="col" className="num">Absent</th></tr></thead>
        <tbody>{votes.map((v) => <tr key={v.id}><td>{v.legislation?.slug ? <Link href={`/government/legislation/${v.legislation.slug}`}>{v.motion}</Link> : v.motion} <DemoFlag show={v.verificationStatus === 'demo'} text="Sample" /></td>
          <td>{v.meeting?.slug ? <Link href={`/government/meetings/${v.meeting.slug}`}>{fmtShortDate(v.meeting.startsAt)}</Link> : 'Not available'}</td><td>{human(v.result)}</td>
          <td className="num">{v.yesCount}</td><td className="num">{v.noCount}</td><td className="num">{v.abstainCount}</td><td className="num">{v.absentCount}</td></tr>)}</tbody>
      </table></div>}
    </div></>)
  }
  const status = pick(one(sp.status), STATUSES), type = pick(one(sp.type), TYPES), q = one(sp.q).slice(0, 100)
  const and: Where[] = []
  if (status) and.push({ currentStatus: { equals: status } })
  if (type) and.push({ type: { equals: type } })
  if (q) and.push({ or: [{ identifier: { like: q } }, { title: { like: q } }] })
  const res = await findPublic('legislation', { where: and.length ? { and } : undefined, sort: '-updatedAt', limit: 50, depth: 1 })
  return (
    <>
      <CouncilBand />
      <div className="container section">
        <GovTabs current="legislation" />
        <form className="filters" method="get" aria-label="Filter legislation">
          <div className="field"><label htmlFor="q">Number or title</label><input id="q" name="q" type="text" defaultValue={q} /></div>
          <div className="field"><label htmlFor="type">Type</label><select id="type" name="type" defaultValue={type ?? ''}><option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{human(t)}</option>)}</select></div>
          <div className="field"><label htmlFor="status">Current status</label><select id="status" name="status" defaultValue={status ?? ''}><option value="">All</option>{STATUSES.map((t) => <option key={t} value={t}>{human(t)}</option>)}</select></div>
          <button className="btn" type="submit">Apply</button>
        </form>
        <h2>Recent legislative activity</h2>
        {res.docs.length === 0 ? <Empty title="No legislation matches." /> : <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
          <caption>Legislation ({res.totalDocs})</caption>
          <thead><tr><th scope="col">Item</th><th scope="col">Topic</th><th scope="col">Status</th><th scope="col">Latest action</th></tr></thead>
          <tbody>{(res.docs as any[]).map((l) => { const last = [...(l.actions ?? [])].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date))).pop(); return (
            <tr key={l.id}><td><Link href={`/government/legislation/${l.slug}`}>{l.identifier}</Link> <DemoFlag show={l.verificationStatus === 'demo'} text="Sample" /></td><td>{l.title}</td><td><StatusBadge status={l.currentStatus} /></td>
              <td>{last ? <>{human(last.action)} · {fmtShortDate(last.date)}{last.meeting?.slug && <> · <Link href={`/government/meetings/${last.meeting.slug}`}>meeting</Link></>}</> : 'None recorded'}</td></tr>) })}</tbody>
        </table></div>}
      </div>
    </>
  )
}
