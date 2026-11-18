/**
 * Infers roll-call votes, outcomes, movers/seconders and sponsors from the
 * posted Council minutes (machine-extracted PDF text), then writes:
 *  - `votes` records (one per motion, or one per resolution for consent-agenda votes)
 *  - legislation actions (adopted / passed first reading / defeated / tabled …) linked to meeting + vote
 *  - legislation sponsors (unverified) and official titles where only a file-name title existed
 * Everything is marked unverified ("needs_review" when the minutes contradict themselves).
 * Idempotent: replaces its own previous output.
 *
 *   tsx scripts/crawl/infer-votes.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
export const NOTE_PREFIX = 'From the posted minutes (machine-read)'
const NOW = new Date().toISOString()

// ------------------------------------------------------------------ roster (current + former members seen in minutes)
const officials = (await payload.find({ collection: 'officials', where: { category: { equals: 'council' } }, limit: 50, depth: 0, overrideAccess: true })).docs as any[]
type Member = { last: string; name: string; officialId?: number }
const ROSTER: Member[] = [
  ...officials.map((o) => ({ last: o.name.replace(/,?\s+(III|II|Jr\.?|Sr\.?)$/i, '').split(/\s+/).pop()!.replace(/,$/, ''), name: o.name, officialId: o.id })),
  ...[
    'Tency A. Eason', 'Jamie B. Summers-Johnson', 'Donna K. Williams', 'Linda Jones-Bell', 'Hassan Abdul-Rasheed', 'Elroy A. Corbitt',
    'April Gaunt-Butler', 'Edward B. Marable, Jr.', 'Harold J. Johnson, Jr.', 'Christopher Jackson',
  ].map((name) => ({ last: name.replace(/,?\s+(Jr|Sr)\.?$/, '').split(/\s+/).pop()!, name })),
]
ROSTER.sort((a, b) => b.last.length - a.last.length)
const lev1 = (a: string, b: string) => {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
/** Current or former council member named in `raw` (full name or surname), else null. */
const memberOf = (raw: string): Member | null => {
  const s = raw.replace(/[^A-Za-z.\-, ]/g, ' ')
  const exact = ROSTER.find((m) => new RegExp(`(^|[^A-Za-z-])${m.last.replace('-', '[-\\s]?')}(?![A-Za-z-])`, 'i').test(s))
  if (exact) return exact
  const words = s.split(/[\s,]+/).filter((w) => w.length >= 6)
  return ROSTER.find((m) => m.last.length >= 6 && words.some((w) => lev1(w.toLowerCase(), m.last.toLowerCase()))) ?? null
}

// ------------------------------------------------------------------ text helpers
const clean = (t: string) => t.replace(/\r/g, '')
  .split('\n').filter((l) => !/City of Orange Township City Council.{0,4}s? Websi/i.test(l) && !/^(REGULAR|CONFERENCE|SPECIAL|BUDGET)[A-Z ]*MEETING [A-Z]+ \d{1,2}, \d{4}\s*$/.test(l.trim())).join('\n')
  .replace(/(\d{1,3})\s?-\s+(\d{4})/g, '$1-$2').replace(/(\d)\s+,\s*(\d{3})/g, '$1,$2').replace(/\$\s+/g, '$')
const flat = (t: string) => t.replace(/\s+/g, ' ')

type Vote = 'yes' | 'no' | 'abstain' | 'absent' | 'recused'
function parseRollCall(rc: string) {
  const entries: { member: string; official?: number; vote: Vote }[] = []
  const seen = new Map<string, Vote>()
  let conflict = false
  const labels: [RegExp, Vote][] = [[/(?:Yeas|Ayes|Yes)\s*:/i, 'yes'], [/(?:Nays|Noes|No)\s*:/i, 'no'], [/Abstain(?:ed|s)?\s*:|Abstentions?\s*:/i, 'abstain'], [/Absent\s*:|Absences?\s*:/i, 'absent'], [/Recus(?:ed|al)\s*:/i, 'recused'], [/Excused\s*:/i, 'absent']]
  const marks = labels.flatMap(([re, v]) => { const m = re.exec(rc); return m ? [{ i: m.index, end: m.index + m[0].length, v }] : [] }).sort((a, b) => a.i - b.i)
  marks.forEach((mk, k) => {
    const seg = rc.slice(mk.end, marks[k + 1]?.i ?? rc.length)
    if (/^\s*(None|Norte|N\/A)\b/i.test(seg)) return
    for (const part of seg.replace(/,\s*(Jr|Sr)\.?/g, ' $1.').split(/Hon\s*[.:'’´,]*\s*|,|\band\b/i)) {
      const m = memberOf(part)
      if (!m) continue
      if (seen.has(m.name)) { if (seen.get(m.name) !== mk.v) conflict = true; continue }
      seen.set(m.name, mk.v)
      entries.push({ member: m.name, official: m.officialId, vote: mk.v })
    }
  })
  return { entries, conflict }
}

const LEG_ID = (kind: 'Ordinance' | 'Resolution', n: string, y: string) => `${kind} ${Number(n)}-${y}`

/** Items in the minutes ("472-2026 A resolution … (Sponsored by …)") → title + sponsor names. */
function parseItems(text: string) {
  const items = new Map<string, { title: string; sponsors: string[]; removed: boolean }>()
  let section: 'ord' | 'res' | null = null
  let cur: { id: string; lines: string[] } | null = null
  const flush = () => {
    if (!cur) return
    const body = flat(cur.lines.join(' '))
    const sp = body.match(/\(?\s*Sponsored by\s+([^)]{3,240}?)\s*(?:\)|$|\.\s)/i)?.[1]
    const sponsors = sp ? [...new Set(sp.split(/\s+and\s+|,\s+(?=Council|Hon)/i).map((x) => memberOf(x)?.name).filter(Boolean) as string[])] : []
    const title = body.replace(/\(?\s*Sponsored by[^)]*\)?/i, '').replace(/\(\s*Postponed[^)]*\)/i, '').replace(/^[*\s]+/, '').trim()
    items.set(cur.id, { title: title.replace(/\(removed[^)]*\)/i, '').trim(), sponsors, removed: /\(?\s*removed (for|from)\b/i.test(body) })
    cur = null
  }
  for (const raw of text.split('\n')) {
    const l = raw.trim()
    if (/^ORDINANCES?\b/i.test(l)) { flush(); section = 'ord'; continue }
    if (/^(RESOLUTIONS?\b|CONSENT AGENDA|REMOVED FROM THE CONSENT)/i.test(l)) { flush(); section = 'res'; continue }
    const m = l.match(/^\*?\s*0*(\d{1,3})-(\d{4})\.?\s+(.*)$/)
    if (m && section) { flush(); cur = { id: LEG_ID(section === 'ord' ? 'Ordinance' : 'Resolution', m[1], m[2]), lines: [m[3]] }; continue }
    if (/^(A )?motion\b/i.test(l) || /^[A-Z][A-Za-z.\- ]+, \d+ [A-Z]/.test(l)) { flush(); continue } // motion or public speaker
    if (cur && cur.lines.length < 12) cur.lines.push(l)
  }
  flush()
  return items
}

type Motion = { subject: string; mover: string; seconder: string; rollCall: string; outcome: string; finalReading?: string; index: number }
function parseMotions(text: string): Motion[] {
  const f = flat(text)
  // "A motion to X was made by M and seconded by S." (2019+) and "Motion to/that X by M, seconded by S." (older).
  const re = /(?:A )?[Mm]otion (?:to|that) (.{3,400}?),?\s+(?:was made )?by (.{3,140}?),?\s+(?:and )?seconded by (.{3,140}?)[.,]?\s*(?:Roll Call\s*:?\s*(.*?))?\s*(?:The )?Motion (?:was )?(?:unanimously )?(Adopted|Failed|Fails|Carried|Carries|Denied|Defeated|Approved|Passed)\b(?:\s*:?\s*Final Reading,?\s*([A-Z][a-z]+ \d{1,2},? \d{4}))?/g
  const out: Motion[] = []
  for (const m of f.matchAll(re)) out.push({ subject: m[1], mover: m[2], seconder: m[3], rollCall: m[4] ?? '', outcome: m[5], finalReading: m[6], index: m.index! })
  const re2 = /Motion to (Adopt|Introduce|Approve|Table|Amend|Postpone)[^:]{0,40}:\s*([A-Z][A-Za-z'\-]+(?:,?\s*Jr\.?)?)\s+Second:\s*([A-Z][A-Za-z'\-]+(?:,?\s*Jr\.?)?)\s+(?:The roll call[^:]{0,60}?:\s*)?((?:Yeas|Ayes)\s*:.*?)\s*(?:Council President [A-Za-z-]+ ruled (?:that )?the Motion (?:was )?|The Motion (?:was )?)(carried|adopted|approved|defeated|failed)/gi
  for (const m of f.matchAll(re2)) {
    const window = f.slice(Math.max(0, m.index! - 1500), m.index!)
    const items = [...window.matchAll(/(Ordinance|Resolution)s?\s*(?:No\.?\s*|#\s*)?0*(\d{1,3})-(\d{4})/gi)]
    const last = items[items.length - 1]
    if (!last) continue
    const tail = window.slice(last.index!)
    const verb = /introduce/i.test(m[1]) || /first reading/i.test(tail) ? 'introduce on first reading' : m[1].toLowerCase()
    out.push({ subject: `${verb} ${last[1][0].toUpperCase()}${last[1].slice(1).toLowerCase()} ${last[2]}-${last[3]}`, mover: m[2], seconder: m[3], rollCall: m[4], outcome: m[5], index: m.index! })
  }
  out.sort((a, b) => a.index - b.index)
  return out
}

// ------------------------------------------------------------------ run
const meetings = (await payload.find({ collection: 'meetings', where: { 'documents.kind': { equals: 'minutes' } }, limit: 2000, depth: 0, overrideAccess: true, sort: 'startsAt' })).docs as any[]
const legCache = new Map<string, any>()
async function legislation(identifier: string, type: 'ordinance' | 'resolution', title: string | undefined, sources: number[]) {
  if (legCache.has(identifier)) return legCache.get(identifier)
  let doc = (await payload.find({ collection: 'legislation', where: { identifier: { equals: identifier } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
  if (!doc) {
    doc = await payload.create({ collection: 'legislation', ...sys, data: {
      identifier, slug: identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-'), type, title: (title || identifier).slice(0, 250),
      summary: 'Recorded in the posted Council minutes. See the minutes for the official text.', workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources,
    } as any })
  }
  legCache.set(identifier, doc)
  return doc
}
const pendingActions = new Map<number, any[]>() // legislation id → new inferred actions
const pendingMeta = new Map<number, { title?: string; sponsors?: string[] }>()
const stats = { meetings: 0, motions: 0, votes: 0, conflicts: 0, consentItems: 0, sponsors: 0 }

for (const mt of meetings) {
  const minutes = (mt.documents ?? []).filter((d: any) => d.kind === 'minutes' && d.text && d.text.length > 500)
  if (!minutes.length) continue
  stats.meetings++
  const date = new Date(mt.startsAt).toISOString().slice(0, 10)
  const sources = (mt.sources ?? []).map((x: any) => (typeof x === 'object' ? x.id : x))
  await payload.delete({ collection: 'votes', where: { and: [{ meeting: { equals: mt.id } }, { verificationStatus: { not_equals: 'verified' } }] }, ...sys })
  for (const doc of minutes) {
    const text = clean(doc.text)
    const items = parseItems(text)
    for (const [id, it] of items) {
      const isOrd = id.startsWith('Ordinance')
      const leg = await legislation(id, isOrd ? 'ordinance' : 'resolution', it.title, sources)
      const meta = pendingMeta.get(leg.id) ?? {}
      if (it.sponsors.length) { meta.sponsors = it.sponsors; stats.sponsors++ }
      if (it.title.length > 20 && !/^(A|An|This)\s+(resolution|ordinance)|^(Resolution|Ordinance)\b/i.test(leg.title)) meta.title = it.title.slice(0, 250)
      pendingMeta.set(leg.id, meta)
    }
    const motions = parseMotions(text)
    const explicit = new Set<string>()
    const resolved: { m: Motion; targets: string[]; kind: string; consent: boolean }[] = []
    for (const m of motions) {
      const s = m.subject
      let targets: string[] = []
      let consent = false
      const ord = s.match(/Ordinance\s*(?:No\.?\s*)?0*(\d{1,3})-(\d{4})/i)
      const res = s.match(/Resolutions?\s*(?:No\.?\s*|#\s*)?\*?\s*0*(\d{1,3})-(\d{4})(?:\s*(?:through|thru|to|-)\s*\*?\s*0*(\d{1,3})-(\d{4}))?/i)
      if (ord) targets = [LEG_ID('Ordinance', ord[1], ord[2])]
      else if (res) {
        const a = Number(res[1]), b = res[3] ? Number(res[3]) : a
        for (let n = a; n <= b && n - a < 200; n++) targets.push(LEG_ID('Resolution', String(n), res[2]))
      } else if (/consent agenda/i.test(s)) {
        consent = true
        const before = flat(text).slice(0, m.index)
        const ranges = [...before.matchAll(/RESOLUTIONS?\s*(?:NO\.?|NOS\.?|NUMBERS?)?\s*\*?\s*0*(\d{1,3})-(\d{4})\s*(?:THROUGH|THRU|TO|-|–)\s*\*?\s*0*(\d{1,3})-(\d{4})/gi)]
        const r = ranges[ranges.length - 1]
        if (r) for (let n = Number(r[1]); n <= Number(r[3]) && n - Number(r[1]) < 300; n++) targets.push(LEG_ID('Resolution', String(n), r[2]))
      }
      if (!targets.length) continue
      if (!consent) targets.forEach((t) => explicit.add(t))
      const kind = /\b(table|tabled)\b/i.test(s) ? 'tabled' : /\b(postpone|carry|continue|defer)/i.test(s) ? 'deferred' : /\bamend/i.test(s) && !/\badopt/i.test(s) ? 'amended' : /first reading|introduction/i.test(s) ? 'first' : 'adopt'
      resolved.push({ m, targets, kind, consent })
    }
    for (const { m, targets, kind, consent } of resolved) {
      stats.motions++
      const carried = /Adopted|Carri|Approved|Passed/i.test(m.outcome)
      const { entries, conflict } = parseRollCall(m.rollCall)
      if (conflict) stats.conflicts++
      const mover = memberOf(m.mover)?.name ?? m.mover.trim()
      const seconder = memberOf(m.seconder)?.name ?? m.seconder.trim()
      const action = kind === 'first' ? (carried ? 'introduced' : 'defeated') : kind === 'adopt' ? (carried ? 'adopted' : 'defeated') : kind
      for (const target of consent ? targets.filter((t) => !explicit.has(t) && !items.get(t)?.removed) : targets) {
        const isOrd = target.startsWith('Ordinance')
        const leg = await legislation(target, isOrd ? 'ordinance' : 'resolution', undefined, sources)
        let voteId: number | undefined
        if (entries.length) {
          const v = await payload.create({ collection: 'votes', ...sys, data: {
            meeting: mt.id, legislation: leg.id,
            motion: `${consent ? `Consent agenda — ${target}` : `Motion to ${m.subject.replace(/\s+/g, ' ').slice(0, 160)}`} (moved by ${mover}, seconded by ${seconder})${conflict ? ' — the minutes list a member in two vote columns; check the original' : ''}`,
            result: carried ? 'carried' : 'failed', entries,
            workflowStatus: 'published', publishedAt: NOW, verificationStatus: conflict ? 'needs_review' : 'unverified', sources,
          } as any })
          voteId = v.id as number
          stats.votes++
        }
        if (consent) stats.consentItems++
        const list = pendingActions.get(leg.id) ?? []
        list.push({ date, action, meeting: mt.id, vote: voteId,
          note: `${NOTE_PREFIX}: ${kind === 'first' ? (carried ? 'passed on first reading' : 'failed on first reading') : kind === 'adopt' ? (carried ? 'adopted' : 'failed') : action}${consent ? ' on the consent agenda' : ''}; moved by ${mover}, seconded by ${seconder}${m.finalReading ? `; final reading ${m.finalReading}` : ''}.`,
          evidenceUrl: doc.url })
        pendingActions.set(leg.id, list)
      }
    }
  }
}

// ------------------------------------------------------------------ write legislation actions / sponsors / titles
const ids = new Set([...pendingActions.keys(), ...pendingMeta.keys()])
let updated = 0
for (const id of ids) {
  const leg = (await payload.findByID({ collection: 'legislation', id, depth: 0, overrideAccess: true })) as any
  const keep = (leg.actions ?? []).filter((a: any) => !String(a.note ?? '').startsWith(NOTE_PREFIX)).map(({ id: _i, ...a }: any) => a)
  const add = pendingActions.get(id) ?? []
  // Agenda listings ("Listed for …") on a date with a recorded outcome are superseded by that outcome.
  const day = (d: unknown) => String(d).slice(0, 10)
  const filtered = keep.filter((a: any) => !(String(a.note ?? '').startsWith('Listed for') && add.some((x) => x.date === day(a.date))))
  const meta = pendingMeta.get(id) ?? {}
  // Sort by calendar day; within a day, recorded outcomes come last so the derived status reflects them.
  const rank = (a: any) => (String(a.note ?? '').startsWith(NOTE_PREFIX) ? 1 : 0)
  const data: any = { actions: [...filtered, ...add].map((a) => ({ ...a, date: day(a.date) })).sort((a, b) => a.date.localeCompare(b.date) || rank(a) - rank(b)) }
  if (meta.sponsors?.length) data.sponsors = meta.sponsors.map((name) => ({ name, verified: false }))
  if (meta.title) data.title = meta.title
  await payload.update({ collection: 'legislation', id, data, ...sys })
  updated++
}
console.log({ ...stats, legislationUpdated: updated })
process.exit(0)
