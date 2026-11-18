/**
 * Converts posted Council agenda documents (PDF/DOCX on orangetwpnjcc.org) into
 * web-native agendas for recent meetings: ordered sections, linked legislation
 * with the agenda's official titles, sponsors (unverified), readings, and the
 * meeting time/location/participation rules stated on the agenda.
 *
 *   tsx scripts/crawl/web-agendas.ts [months=4]
 *
 * Also called at the end of `import-council.ts meetings` so re-imports keep the
 * web agendas. Documents posted only as Adobe Acrobat share links cannot be
 * downloaded and are reported as skipped.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import type { Payload } from 'payload'
import { CRAWL_DIR, get } from './fetch'
import { decode, pdfText } from './text'

const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const

async function agendaText(url: string): Promise<string> {
  const { row } = await get(url)
  if (row.status !== 200 || !row.file) return ''
  const file = join(CRAWL_DIR, row.file)
  if (/\.pdf$/i.test(file)) return pdfText(file)
  if (/\.docx$/i.test(file)) {
    try {
      // .docx is a zip: Windows ships bsdtar (reads zip); elsewhere use unzip. (GNU tar cannot read zip.)
      const [cmd, args] = process.platform === 'win32'
        ? [join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-xOf', file, 'word/document.xml']]
        : ['unzip', ['-p', file, 'word/document.xml']]
      const xml = execFileSync(cmd, args, { maxBuffer: 50 * 1024 * 1024 }).toString('utf8')
      return decode(xml.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim()
    } catch { return '' }
  }
  return ''
}

const HEADING = /^(PLEDGE OF ALLEGIANCE|ROLL CALL|RECOGNITION|MOMENT OF SILENCE|SPECIAL NOTICE|SUNSHINE LAW|APPROVAL OF (MEETING )?MINUTES|REPORTS?\b|DEPARTMENT|OPRA|COMMUNICATIONS|CITIZENS?'? COMMENTS?|PUBLIC (COMMENT|HEARING|PORTION)|COUNCIL COMMENTS|ORDINANCES?\b|RESOLUTIONS?\b|CONSENT AGENDA|MATTERS FOR DISCUSSION|DISCUSSION|LEGISLATION|PRESENTATIONS?|PROCLAMATIONS?|NEW BUSINESS|OLD BUSINESS|UNFINISHED BUSINESS|EXECUTIVE SESSION|CLOSED SESSION|BILL LIST|CLAIMS|MAYOR|BUSINESS ADMINISTRATOR|ADMINISTRATION|ADJOURNMENT|MOTION TO ADJOURN|BUDGET|HEARING)/
const NOISE = [/^(REGULAR|CONFERENCE|SPECIAL|BUDGET)[A-Z ]* MEETING [A-Z]+ \d{1,2}, \d{4}$/, /P a g e/, /orangetwpnjcc\.org\s*$/i, /^_+$/,/^MOTION:?\s*SECOND:?$/i, /^Warning:/]
const LEG = /^\*?\s*0*(\d{1,3})-(\d{4})\s+(.*)$/
const isUpper = (l: string) => { const letters = l.replace(/[^A-Za-z]/g, ''); return letters.length >= 4 && letters === letters.toUpperCase() }
const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Of|And|To|The|For|On|In|At|By|Or|A|An)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase()).replace(/\bOpra\b/, 'OPRA')

type Item = { identifier: string; type: 'ordinance' | 'resolution'; text: string; reading?: 'introduced' | 'second_reading'; consent: boolean; finalReading?: string }
type Section = { title: string; lines: string[]; items: Item[] }

export function parseAgenda(text: string) {
  // PDF bullets arrive as private-use glyphs (e.g. U+F0B7) or symbol characters; drop them.
  const lines = text.split('\n').map((l) => l.replace(/[-•▪■●◦]/g, ' ').replace(/\s+/g, ' ').replace(/\s*PRESENT\s+ABSENT\s*$/, '').replace(/:\s*$/, '').trim()).filter((l) => l && !NOISE.some((r) => r.test(l)))
  const preamble = lines.slice(0, 12).join(' ')
  const sections: Section[] = []
  let cur: Section | null = null
  let item: Item | null = null
  let inCaps = false // inside an all-caps paragraph (e.g. the consent-agenda explanation): its lines are not headings
  for (const line of lines) {
    const upper = isUpper(line)
    const head: boolean = upper && !inCaps && line.length <= 90 && !LEG.test(line) && HEADING.test(line.replace(/^[^A-Z]+/, ''))
    inCaps = upper && !head && line.length > 55 && !/[.]$/.test(line)
      ? true
      : head && /^CONSENT AGENDA$/.test(line) ? false : inCaps && upper && !/[.]$/.test(line)
    if (head) {
      item = null
      const base = line.replace(/\s+continued$/i, '').trim()
      if (/continued$/i.test(line) && cur) continue
      // "RESOLUTIONS NO *518-2026 THROUGH *549-2026" stays inside the consent agenda.
      if (cur && /^RESOLUTIONS NO/i.test(base) && /CONSENT/i.test(cur.title)) { cur.lines.push(titleCase(base).replace(/No \*/, 'Nos. ').replace(/\*/g, '')); continue }
      cur = { title: base, lines: [], items: [] }
      sections.push(cur)
      continue
    }
    if (!cur) continue
    const m = line.match(LEG)
    const legSection = /ORDINANCE|RESOLUTION|CONSENT/i.test(cur.title)
    if (m && legSection) {
      const isOrd = /ORDINANCE/i.test(cur.title)
      item = { identifier: `${isOrd ? 'Ordinance' : 'Resolution'} ${Number(m[1])}-${m[2]}`, type: isOrd ? 'ordinance' : 'resolution', text: m[3],
        reading: isOrd ? (/SECOND|FINAL|HEARING/i.test(cur.title) ? 'second_reading' : /INTRODUCTION|FIRST/i.test(cur.title) ? 'introduced' : undefined) : undefined,
        consent: line.trim().startsWith('*') || /CONSENT/i.test(cur.title) }
      cur.items.push(item)
      continue
    }
    if (/^[a-d]\)\s/i.test(line)) {
      const fr = line.match(/Final Reading\s+(.+)$/i)
      if (fr && item) item.finalReading = fr[1]
      continue // motion placeholders
    }
    if (/^MOTION\b.*SECOND:?$/i.test(line)) continue
    if (item) item.text += ` ${line}`
    else cur.lines.push(line)
  }
  const time = preamble.match(/\bAT (\d{1,2}):?(\d{2})?\s*([AP])\.?M/i)
  const where = preamble.match(/(?:AT|HELD AT)\s+(CITY HALL,[^,]+(?:,\s*ORANGE)?(?:, NEW JERSEY)?)/i)?.[1]
  return { sections, time: time ? { h: (Number(time[1]) % 12) + (time[3].toUpperCase() === 'P' ? 12 : 0), m: Number(time[2] ?? 0) } : null, location: where ? titleCase(where).replace(/\bNorth Day\b/, 'North Day') : null }
}

const nyIso = (date: string, h: number, m: number) => {
  for (const off of ['-05:00', '-04:00']) {
    const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${off}`)
    const hh = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(d)) % 24
    if (hh === h) return d.toISOString()
  }
  return null
}

const describe = (s: Section) => {
  if (/ROLL CALL/.test(s.title)) return s.lines.filter((l) => /^Hon\./.test(l)).map((l) => l.replace(/\s*_+.*$/, '')).join('; ')
  return s.lines.filter((l) => !/^Hon\./.test(l) && !/^_+/.test(l)).join(' ').replace(/^ALL ITEMS LISTED WITH AN ASTERISK[^.]*\.[^.]*\.[^.]*\./i, 'Items marked with an asterisk are routine and are enacted by one motion unless a Council member asks to discuss one separately.').slice(0, 900)
}
const splitSponsor = (t: string) => {
  const m = t.match(/\(Sponsored by ([^)]+)\)/i)
  return { title: t.replace(/\s*\(Sponsored by [^)]+\)\s*/i, ' ').trim(), sponsors: m ? m[1].replace(/\s+and the City of Orange Township Municipal Council/i, '').split(/\s+and\s+|,\s*(?=Council)/i).map((x) => x.trim()).filter(Boolean) : [] }
}

export async function buildWebAgendas(payload: Payload, months = 4) {
  const since = new Date(); since.setMonth(since.getMonth() - months)
  const until = new Date(Date.now() + 45 * 864e5)
  const meetings = (await payload.find({ collection: 'meetings', where: { and: [{ body: { equals: 'city_council' } }, { startsAt: { greater_than_equal: since.toISOString() } }, { startsAt: { less_than: until.toISOString() } }] }, limit: 200, depth: 0, overrideAccess: true, sort: 'startsAt' })).docs as any[]
  const report = { converted: [] as string[], skipped: [] as string[] }
  for (const mt of meetings) {
    const doc = (mt.documents ?? []).find((d: any) => d.kind === 'agenda')
    if (!doc) { report.skipped.push(`${mt.slug}: no agenda posted`); continue }
    if (!/orangetwpnjcc\.org\/.+\.(pdf|docx)$/i.test(doc.url)) { report.skipped.push(`${mt.slug}: agenda is an external viewer link (${new URL(doc.url).hostname}), not a downloadable file`); continue }
    const text = await agendaText(doc.url)
    if (text.length < 200) { report.skipped.push(`${mt.slug}: no extractable text (scanned?)`); continue }
    const { sections, time, location } = parseAgenda(text)
    if (!sections.length) { report.skipped.push(`${mt.slug}: no agenda sections recognised`); continue }
    const date = new Date(mt.startsAt).toISOString().slice(0, 10)
    const agendaItems: any[] = []
    let n = 0
    for (const s of sections) {
      if (/^(ALSO PRESENT|SUNSHINE LAW)$/.test(s.title)) continue
      n++
      const legIds: number[] = []
      for (const it of s.items) {
        const { title, sponsors } = splitSponsor(it.text.trim())
        const existing = (await payload.find({ collection: 'legislation', where: { identifier: { equals: it.identifier } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
        const action = it.reading ? { date, action: it.reading, meeting: mt.id, note: `Listed for ${it.reading === 'introduced' ? 'introduction (first reading)' : 'second reading and public hearing'} on the agenda${it.finalReading ? `; final reading scheduled ${it.finalReading}` : ''}. Outcome not yet recorded.`, evidenceUrl: doc.url } : null
        const actions = [...(existing?.actions ?? []).map((a: any) => ({ ...a, meeting: typeof a.meeting === 'object' ? a.meeting?.id : a.meeting, vote: typeof a.vote === 'object' ? a.vote?.id : a.vote }))
          .filter((a: any) => !(a.date?.slice(0, 10) === date && a.action === action?.action)), ...(action ? [action] : [])]
        const documents = [...(existing?.documents ?? []).map(({ id: _id, ...d }: any) => d)]
        if (!documents.some((d: any) => d.url === doc.url)) documents.push({ label: `Agenda listing — ${mt.title} (${date})`, kind: 'agenda', url: doc.url })
        const data: any = {
          title: title.slice(0, 250), type: existing?.type === 'bond_ordinance' ? 'bond_ordinance' : it.type,
          summary: `${title}${it.consent ? ' (Consent agenda.)' : ''}`.slice(0, 2000),
          sponsors: sponsors.map((name) => ({ name, verified: false })), actions, documents,
        }
        const saved = existing
          ? await payload.update({ collection: 'legislation', id: existing.id, data, ...sys } as any)
          : await payload.create({ collection: 'legislation', data: { ...data, identifier: it.identifier, slug: it.identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-'), workflowStatus: 'published', publishedAt: new Date().toISOString(), verificationStatus: 'unverified', sources: (mt.sources ?? []).map((x: any) => (typeof x === 'object' ? x.id : x)) }, ...sys } as any)
        legIds.push((saved as any).id)
      }
      const desc = describe(s)
      agendaItems.push({ number: String(n), title: titleCase(s.title), description: s.items.length ? (desc || `${s.items.length} item${s.items.length === 1 ? '' : 's'}`) : desc || undefined, legislation: legIds })
    }
    const comments = sections.find((s) => /CITIZEN|SPECIAL NOTICE|PUBLIC COMMENT/i.test(s.title))
    const update: any = { agendaItems }
    if (location) update.location = location
    if (time) { const iso = nyIso(date, time.h, time.m); if (iso) { update.startsAt = iso; update.timeConfirmed = true } }
    if (comments?.lines.length) update.participation = comments.lines.join(' ').slice(0, 1200)
    await payload.update({ collection: 'meetings', id: mt.id, data: update, ...sys } as any)
    report.converted.push(`${mt.slug}: ${agendaItems.length} sections, ${agendaItems.reduce((a, x) => a + x.legislation.length, 0)} linked records${time ? `, ${time.h}:${String(time.m).padStart(2, '0')}` : ''}`)
  }
  return report
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('crawl/web-agendas.ts')) {
  await import('dotenv/config')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  const r = await buildWebAgendas(payload, Number(process.argv[2] ?? 4))
  console.log('converted:\n  ' + r.converted.join('\n  '))
  console.log('skipped:\n  ' + r.skipped.join('\n  '))
  process.exit(0)
}
