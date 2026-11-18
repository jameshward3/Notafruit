/**
 * Open Government: legislative tracker data (rebuild of github.com/jameshward3/Legislative_tracker
 * inside the platform). Everything is computed from PUBLISHED legislation, votes and budget
 * datasets; machine-inferred values carry their own verification status.
 */
import type { Payload } from 'payload'
import { q } from './db'

export type TrackerFilters = { year?: string; sponsor?: string; category?: string; status?: string; type?: string; q?: string }
export type TrackerRow = {
  id: number; identifier: string; slug: string; title: string; type: string; status: string
  amountCents: number | null; fiscalKind: string | null; category: string | null; sponsors: string | null
  lastDate: string | null; yes: number | null; no: number | null; abstain: number | null; absent: number | null; result: string | null; voteVerification: string | null
}

const PUB = `l.workflow_status = 'published'`

export async function trackerYears(payload: Payload): Promise<string[]> {
  const rows = await q(payload, `SELECT DISTINCT right(identifier, 4) AS y FROM legislation l WHERE ${PUB} AND identifier ~ '-[0-9]{4}$' ORDER BY 1 DESC`)
  return rows.map((r) => r.y).filter((y) => Number(y) >= 2008 && Number(y) <= new Date().getFullYear() + 1)
}

function where(f: TrackerFilters, sponsorName: string | null) {
  const w = [PUB]
  const p: unknown[] = []
  const add = (sql: string, v: unknown) => { p.push(v); w.push(sql.replace(/\?/g, `$${p.length}`)) }
  if (f.year) add(`l.identifier LIKE '%-' || ?`, f.year)
  if (f.category) add(`l.fiscal_category = ?`, f.category)
  if (f.status) add(`l.current_status = ?`, f.status)
  if (f.type) add(`l.type = ?`, f.type)
  if (f.q) add(`(l.identifier ILIKE '%' || ? || '%' OR l.title ILIKE '%' || ? || '%')`, f.q)
  if (sponsorName) add(`EXISTS (SELECT 1 FROM legislation_sponsors s WHERE s._parent_id = l.id AND s.name = ?)`, sponsorName)
  return { sql: w.join(' AND '), params: p }
}

export async function trackerRows(payload: Payload, f: TrackerFilters, sponsorName: string | null, limit = 400): Promise<{ rows: TrackerRow[]; total: number }> {
  const { sql, params } = where(f, sponsorName)
  const rows = await q(payload,
    `SELECT l.id, l.identifier, l.slug, l.title, l.type, l.current_status AS status, l.fiscal_amount_cents AS "amountCents", l.fiscal_kind AS "fiscalKind", l.fiscal_category AS category,
            (SELECT string_agg(s.name, '; ' ORDER BY s._order) FROM legislation_sponsors s WHERE s._parent_id = l.id) AS sponsors,
            (SELECT max(a.date) FROM legislation_actions a WHERE a._parent_id = l.id) AS "lastDate",
            v.yes_count AS yes, v.no_count AS no, v.abstain_count AS abstain, v.absent_count AS absent, v.result, v.verification_status AS "voteVerification",
            count(*) OVER () AS total
       FROM legislation l
       LEFT JOIN LATERAL (SELECT * FROM votes v WHERE v.legislation_id = l.id AND v.workflow_status = 'published' ORDER BY v.created_at DESC LIMIT 1) v ON true
      WHERE ${sql}
      ORDER BY "lastDate" DESC NULLS LAST, l.identifier DESC
      LIMIT ${Math.min(limit, 1000)}`, params)
  return { total: rows[0] ? Number(rows[0].total) : 0, rows: rows.map((r) => ({ ...r, amountCents: r.amountCents == null ? null : Number(r.amountCents), yes: r.yes == null ? null : Number(r.yes), no: r.no == null ? null : Number(r.no), abstain: r.abstain == null ? null : Number(r.abstain), absent: r.absent == null ? null : Number(r.absent), lastDate: r.lastDate ? new Date(r.lastDate).toISOString() : null })) }
}

export async function trackerKpis(payload: Payload, f: TrackerFilters, sponsorName: string | null) {
  const { sql, params } = where(f, sponsorName)
  const [k] = await q(payload,
    `SELECT count(*)::int AS items,
            count(*) FILTER (WHERE l.current_status = 'adopted')::int AS adopted,
            count(*) FILTER (WHERE l.current_status = 'defeated')::int AS defeated,
            count(*) FILTER (WHERE l.current_status IN ('introduced', 'in_review'))::int AS pending,
            coalesce(sum(l.fiscal_amount_cents) FILTER (WHERE l.fiscal_kind = 'spending' AND l.current_status = 'adopted'), 0)::bigint AS spending,
            coalesce(sum(l.fiscal_amount_cents) FILTER (WHERE l.fiscal_kind = 'revenue' AND l.current_status = 'adopted'), 0)::bigint AS revenue,
            (SELECT count(*) FROM votes v JOIN legislation l ON l.id = v.legislation_id WHERE v.workflow_status = 'published' AND ${sql})::int AS votes,
            (SELECT count(*) FROM votes v JOIN legislation l ON l.id = v.legislation_id WHERE v.workflow_status = 'published' AND v.no_count = 0 AND v.abstain_count = 0 AND ${sql})::int AS unanimous
       FROM legislation l WHERE ${sql}`, params)
  return { items: k.items, adopted: k.adopted, defeated: k.defeated, pending: k.pending, spendingCents: Number(k.spending), revenueCents: Number(k.revenue), votes: k.votes, unanimous: k.unanimous }
}

/** Adopted spending by budget category next to the compiled budget's department lines for that year. */
export async function budgetConnection(payload: Payload, year: string | undefined) {
  const y = year ?? String(new Date().getFullYear())
  const spend = await q(payload,
    `SELECT l.fiscal_category AS category, count(*)::int AS items, coalesce(sum(l.fiscal_amount_cents), 0)::bigint AS cents
       FROM legislation l WHERE ${PUB} AND l.identifier LIKE '%-' || $1 AND l.current_status = 'adopted' AND l.fiscal_kind = 'spending'
      GROUP BY 1 ORDER BY 3 DESC`, [y])
  const lines = await q(payload,
    `SELECT bl.department, bl.amount_cents::bigint AS cents, d.slug AS dataset, d.title AS "datasetTitle"
       FROM budget_lines bl JOIN budget_datasets d ON d.id = bl.dataset_id
      WHERE d.workflow_status = 'published' AND d.fiscal_year = $1 AND d.kind = 'operating' AND bl.direction = 'expenditure'`, [Number(y)])
  const total = await q(payload,
    `SELECT coalesce(sum(bl.amount_cents), 0)::bigint AS cents FROM budget_lines bl JOIN budget_datasets d ON d.id = bl.dataset_id
      WHERE d.workflow_status = 'published' AND d.fiscal_year = $1 AND d.kind = 'operating' AND bl.direction = 'expenditure'`, [Number(y)])
  const byDept = new Map(lines.map((l) => [String(l.department).toLowerCase(), l]))
  return {
    year: y,
    budgetTotalCents: Number(total[0]?.cents ?? 0) || null,
    dataset: lines[0] ? { slug: lines[0].dataset, title: lines[0].datasetTitle } : null,
    rows: spend.map((r) => {
      const line = byDept.get(String(r.category).toLowerCase())
      return { category: r.category as string, items: r.items as number, authorizedCents: Number(r.cents), budgetCents: line ? Number(line.cents) : null }
    }),
  }
}

/** Per-member voting record (rebuild of the tracker's member scorecards). */
export async function memberScorecards(payload: Payload, year: string | undefined) {
  const p: unknown[] = []
  let yw = ''
  if (year) { p.push(year); yw = `AND l.identifier LIKE '%-' || $1` }
  // A consent-agenda roll call is stored once per resolution; count it once (rc = roll-call key).
  const rows = await q(payload,
    `SELECT e.member, e.official_id AS "officialId",
            count(DISTINCT rc) FILTER (WHERE e.vote = 'yes')::int AS yes, count(DISTINCT rc) FILTER (WHERE e.vote = 'no')::int AS no,
            count(DISTINCT rc) FILTER (WHERE e.vote = 'abstain')::int AS abstain, count(DISTINCT rc) FILTER (WHERE e.vote IN ('absent', 'recused'))::int AS absent,
            count(DISTINCT rc)::int AS total, count(*) FILTER (WHERE e.vote = 'yes')::int AS "yesItems",
            coalesce(sum(l.fiscal_amount_cents) FILTER (WHERE e.vote = 'yes' AND l.fiscal_kind = 'spending'), 0)::bigint AS "supportedCents",
            coalesce(sum(l.fiscal_amount_cents) FILTER (WHERE e.vote = 'no' AND l.fiscal_kind = 'spending'), 0)::bigint AS "opposedCents"
       FROM votes_entries e JOIN votes v ON v.id = e._parent_id JOIN legislation l ON l.id = v.legislation_id
       CROSS JOIN LATERAL (SELECT CASE WHEN v.motion LIKE 'Consent agenda%' THEN 'c' || v.meeting_id || ':' || e.vote ELSE 'v' || v.id END AS rc) k
      WHERE v.workflow_status = 'published' AND ${PUB} ${yw}
      GROUP BY 1, 2 ORDER BY 1`, p)
  const sponsored = await q(payload,
    `SELECT s.name, count(DISTINCT l.id)::int AS n FROM legislation_sponsors s JOIN legislation l ON l.id = s._parent_id WHERE ${PUB} ${yw} GROUP BY 1`, p)
  const sp = new Map(sponsored.map((s) => [s.name, s.n]))
  return rows.map((r) => ({ ...r, supportedCents: Number(r.supportedCents), opposedCents: Number(r.opposedCents), sponsored: sp.get(r.member) ?? 0, participation: r.total ? Math.round(((r.total - r.absent) / r.total) * 100) : 0 }))
}

/** Recent split (non-unanimous) roll calls for the vote matrix. */
export async function voteMatrix(payload: Payload, year: string | undefined, limit = 12) {
  const p: unknown[] = []
  let yw = ''
  if (year) { p.push(year); yw = `AND l.identifier LIKE '%-' || $1` }
  const votes = await q(payload,
    `SELECT v.id, l.identifier, l.slug, l.title, v.result, v.verification_status AS verification, m.starts_at AS date
       FROM votes v JOIN legislation l ON l.id = v.legislation_id JOIN meetings m ON m.id = v.meeting_id
      WHERE v.workflow_status = 'published' AND ${PUB} AND (v.no_count > 0 OR v.abstain_count > 0) ${yw}
      ORDER BY m.starts_at DESC, l.identifier LIMIT ${limit}`, p)
  if (!votes.length) return { votes: [], entries: new Map<number, Map<string, string>>() }
  const ents = await q(payload, `SELECT _parent_id AS vid, member, vote FROM votes_entries WHERE _parent_id = ANY($1::int[])`, [votes.map((v) => v.id)])
  const entries = new Map<number, Map<string, string>>()
  for (const e of ents) { if (!entries.has(e.vid)) entries.set(e.vid, new Map()); entries.get(e.vid)!.set(e.member, e.vote) }
  return { votes: votes.map((v) => ({ ...v, date: new Date(v.date).toISOString() })), entries }
}

/** Legislation a council member sponsored, newest first (for profiles). */
export async function sponsoredBy(payload: Payload, name: string, limit = 50) {
  return q(payload,
    `SELECT l.identifier, l.slug, l.title, l.current_status AS status, l.fiscal_amount_cents AS "amountCents", l.fiscal_kind AS "fiscalKind",
            (SELECT max(a.date) FROM legislation_actions a WHERE a._parent_id = l.id) AS "lastDate"
       FROM legislation l WHERE ${PUB} AND EXISTS (SELECT 1 FROM legislation_sponsors s WHERE s._parent_id = l.id AND s.name = $1)
      ORDER BY "lastDate" DESC NULLS LAST LIMIT ${limit}`, [name])
}
