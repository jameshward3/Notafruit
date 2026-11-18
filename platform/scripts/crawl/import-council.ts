/**
 * Stage 2 of the official-content migration: IMPORT from the cached crawl of
 * orangetwpnjcc.org (run scripts/crawl/fetch.ts first). Idempotent.
 *
 *   tsx scripts/crawl/import-council.ts [officials] [meetings] [notices]   (default: all)
 *
 * Everything imported is published with verificationStatus='unverified' and a
 * source-record linking back to the original page. Agenda listings are recorded
 * as "listed for first/second reading" — outcomes are NOT inferred.
 * context.skipNotify prevents subscriber emails for historic records.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../../src/payload.config'
import { textToLexical } from '../../src/lib/richtext'
import { CRAWL_DIR, get, readManifest } from './fetch'
import { decode, htmlToText, pdfText } from './text'

const want = new Set(process.argv.slice(2))
const all = want.size === 0
const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const HOST = 'orangetwpnjcc.org'
const idx = JSON.parse(readFileSync(join(CRAWL_DIR, HOST, 'index.json'), 'utf8'))
const RETRIEVED: string = idx.retrievedAt
const NOW = new Date().toISOString()
const slugify = (s: string) => decodeURIComponent(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '')

async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>, extra: Record<string, any> = {}) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys, ...extra } as any) as any
  return payload.create({ collection, data, ...sys, ...extra } as any) as any
}
const sourceFor = (url: string, title: string, notes?: string) => upsert('source-records', 'url', {
  title, url, owner: 'City of Orange Township City Council', ownerType: 'official', retrievedAt: RETRIEVED, status: 'captured',
  notes: notes ?? 'Imported automatically from the official Council website. Not yet reviewed by the City Clerk.',
})

// ------------------------------------------------------------------ cached PDF → checksum + unofficial text
const manifest = readManifest(HOST)
async function docMeta(url: string) {
  const row = manifest.get(url.replace(/^http:/, 'https:'))
  if (!row || row.status !== 200 || !row.file) return {}
  const text = /\.pdf$/i.test(row.file) ? await pdfText(join(CRAWL_DIR, row.file)) : ''
  return { checksumSha256: row.sha256, retrievedAt: row.retrievedAt, text: text || undefined }
}

// ================================================================== OFFICIALS
async function officials() {
  const pages = idx.pages.filter((p: any) => /\/city-council\/[^/]+\/$/.test(p.link))
  const out: any[] = []
  for (const p of pages) {
    const html: string = p.content.rendered
    const text = htmlToText(html)
    const name = decode(p.title.rendered).replace(/^(Honorable|Council Member)\s+/i, '').trim()
    const after = text.slice(text.indexOf(name) >= 0 ? text.indexOf(name) + name.length : 0)
    const office = (after.match(/^\s*([^\n]*?)\s*\n?\s*E-?:?mail/i)?.[1] ?? '').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim()
    const ward = /\b(North|South|East|West) Ward\b/i.exec(office + ' ' + after.slice(0, 200))?.[1]?.toLowerCase() ?? (/at-large/i.test(office) ? 'at-large' : undefined)
    const email = (html.match(/mailto:([^"?]+)/i)?.[1] ?? after.match(/[\w.-]+@orangenj\.gov/i)?.[0] ?? '').toLowerCase() || undefined
    const phone = after.match(/Phone:\s*([()\d\s.-]{10,16})/i)?.[1]?.trim()
    const termRaw = after.match(/Term Expires:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i)?.[1]
    const termFixed = termRaw?.replace(/^Junne/i, 'June')
    const termEnd = termFixed && !Number.isNaN(Date.parse(termFixed)) ? new Date(`${termFixed} 12:00 UTC`).toISOString() : undefined
    const bioStart = termRaw ? after.indexOf(termRaw) + termRaw.length : -1
    const bio = bioStart > 0 ? after.slice(bioStart).split(/\n\s*(Quick Links|Latest Updates|Share This)/)[0].replace(/\s*\n\s*/g, '\n\n').trim() : ''
    const img = html.match(/<img[^>]+src="([^"]+\/uploads\/\d{4}\/\d{2}\/Hon[^"]+)"/i)?.[1]
    const office2 = office.replace(/^Councilmember,\s*/i, '').replace(/^(North|South|East|West) Ward$/i, '$1 Ward Councilmember') ||(ward && ward !== 'at-large' ? `${ward[0].toUpperCase()}${ward.slice(1)} Ward Councilmember` : 'Councilmember')
    const sortOrder = /president/i.test(office) && !/vice/i.test(office) ? 1 : /vice president/i.test(office) ? 2 : ward === 'at-large' ? 5 : 10
    out.push({ p, name, office: office2, ward, email, phone, termRaw, termEnd, bio, img, sortOrder })
  }
  for (const o of out) {
    const src = await sourceFor(o.p.link, `Council member profile — ${o.name} (orangetwpnjcc.org)`,
      `Imported from the official Council website.${o.termRaw && /Junne/i.test(o.termRaw) ? ` Term published as "${o.termRaw}" (typo); read as June.` : ''}${o.name.includes('Ross') ? ' The roster overview page lists wmontague@orangenj.gov for Ross; the profile page lists cross@orangenj.gov, which is used here.' : ''}`)
    let photo: number | undefined
    if (o.img) photo = await portrait(o.img, o.name)
    await upsert('officials', 'slug', {
      name: o.name, slug: o.p.slug, office: o.office, category: 'council', ward: o.ward, email: o.email, phone: o.phone, bio: o.bio || undefined,
      termEnd: o.termEnd, termNote: o.termRaw ? `Term expires ${o.termRaw.replace(/^Junne/i, 'June')}` : undefined, contactUrl: o.p.link, photo,
      sortOrder: o.sortOrder, verificationStatus: 'unverified', sources: [src.id],
    })
    console.log('official', o.name, '|', o.office, '|', o.ward, '|', o.email, '|', o.phone, '|', o.termRaw, '|', photo ? 'photo' : 'no photo')
  }
  // City Clerk's office (profile page + office line from the Directory page; staff mobile numbers deliberately omitted).
  const clerkPage = idx.pages.find((p: any) => p.slug === 'trisha-a-scipio')
  if (clerkPage) {
    const src = await sourceFor(clerkPage.link, 'Acting Municipal Clerk profile (orangetwpnjcc.org)')
    const t = htmlToText(clerkPage.content.rendered)
    await upsert('officials', 'slug', {
      name: 'Trisha A. Scipio', slug: 'trisha-a-scipio', office: 'Acting Municipal Clerk', category: 'clerk', sortOrder: 1,
      email: 'tscipio@orangenj.gov', phone: '(973) 968-6005', address: '29 North Day Street, Orange, NJ',
      bio: t.split(/Mobile:[^\n]*\n/)[1]?.split(/\n\s*(Quick Links|Latest Updates)/)[0]?.replace(/\s*\n\s*/g, '\n\n').trim().slice(0, 4000),
      contactUrl: clerkPage.link, verificationStatus: 'unverified', sources: [src.id],
    })
  }
  const dir = idx.pages.find((p: any) => p.slug === 'directory')
  if (dir) {
    const src = await sourceFor(dir.link, 'Council and Clerk directory (orangetwpnjcc.org)', 'Directory page. Lists a former council member (Tency A. Eason) not on the current roster; current roster taken from the individual profile pages. Staff mobile numbers are not republished.')
    await upsert('officials', 'slug', { name: 'Margarette Homere', slug: 'margarette-homere', office: 'Senior Clerk, Office of the City Clerk', category: 'clerk', sortOrder: 2,
      email: 'mhomere@orangenj.gov', phone: '(973) 952-6342', contactUrl: dir.link, verificationStatus: 'unverified', sources: [src.id] })
  }
}

async function portrait(url: string, name: string): Promise<number | undefined> {
  const full = url.replace(/^http:/, 'https:').replace(/-\d+x\d+(\.\w+)$/, '$1')
  const existing = await payload.find({ collection: 'media', where: { sourceUrl: { equals: full } }, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0].id as number
  let { row, body } = await get(full)
  let used = full
  if (row.status !== 200 || !body) { ({ row, body } = await get(url.replace(/^http:/, 'https:'))); used = url }
  if (row.status !== 200 || !body) return undefined
  const ext = used.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() ?? 'jpg'
  const doc = await payload.create({
    collection: 'media', overrideAccess: true, context: { system: true },
    data: {
      kind: 'photo', alt: `Official portrait of ${name}`, credit: 'City of Orange Township City Council', rightsHolder: 'City of Orange Township',
      license: 'Official portrait published on orangetwpnjcc.org. Used at the project owner\'s request; reuse to be confirmed by the City Clerk before production (checklist P-1).',
      sourceUrl: full, approvalStatus: 'approved', verificationStatus: 'unverified',
    } as any,
    file: { data: body, mimetype: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg', name: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext === 'jpeg' ? 'jpg' : ext}`, size: body.length },
  })
  return doc.id as number
}

// ================================================================== MEETINGS + LEGISLATION
type Doc = { label: string; kind: string; session?: string; url: string }
type Leg = { identifier: string; type: 'ordinance' | 'resolution' | 'bond_ordinance'; title: string; docs: Doc[]; listings: { date: string; meetingKey: string; reading?: 'first' | 'second'; section: string }[] }
type Mtg = { key: string; date: string; heading: string; sessions: Set<string>; docs: Doc[]; legBySection: Map<string, string[]>; pageUrl: string }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function parseDate(s: string): string | null {
  const m = s.match(/([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (!m) return null
  const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase().replace('jau', 'jan'))
  if (mi < 0) return null
  return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`
}
const SESSION_RE = /^(conference|regular|special|budget hearing|public hearing|reorganization|work session|executive session|closed session)/i
function sessionOf(label: string) { return label.match(SESSION_RE)?.[1]?.toLowerCase() }
const LEG_RE = /\b(ORD(?:INANCE)?|RES(?:O|OLUTION)?)\.?\s*(?:No\.?|#)?\s*0*(\d{1,3})\s*-\s*(\d{4})\b/i
const BARE_RE = /^\s*0*(\d{1,3})\s*-\s*(\d{4})\b/
function cleanTitle(s: string) {
  return decode(s).replace(/\.(pdf|docx?)$/i, '').replace(/_\d{6,}/g, '').replace(LEG_RE, '').replace(BARE_RE, '')
    .replace(/\b(2nd|1st|second|first) reading\b/i, '').replace(/\s+(WM|WO|MC|mc|qh|awmc|jw|tc)\s*$/g, '')
    .replace(/^[\s:#.,–—-]+|[\s:#.,–—-]+$/g, '').replace(/\s+/g, ' ').trim()
}

function parseMeetingPage(p: any, meetings: Map<string, Mtg>, legs: Map<string, Leg>) {
  const html: string = p.content.rendered
  const panels = html.split('fusion-toggle-heading">').slice(1)
  for (const panel of panels) {
    const heading = decode(panel.slice(0, panel.indexOf('<'))).trim()
    const date = parseDate(heading)
    if (!date) { console.warn('  skip panel without date:', heading); continue }
    const extra = heading.replace(/([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/, '').replace(/[-–—:|]/g, ' ').trim()
    const key = `${date}${extra ? `-${extra.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''}`
    const m: Mtg = meetings.get(key) ?? { key, date, heading, sessions: new Set(), docs: [], legBySection: new Map(), pageUrl: p.link }
    meetings.set(key, m)
    // Lines with link markers \u0001url\u0002text\u0003
    const body = panel.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_x, u, t) => `\u0001${u}\u0002${t.replace(/<[^>]+>/g, '')}\u0003`)
    const lines = htmlToText(body, true).split('\n').map((l) => l.trim()).filter(Boolean)
    let section = ''
    for (const line of lines) {
      const links = [...line.matchAll(/\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003/g)].map((x) => ({ url: decode(x[1]).trim(), text: decode(x[2]).replace(/\s+/g, ' ').trim() }))
      const label = decode(line.split('\u0001')[0]).replace(/\s+/g, ' ').trim()
      const plain = decode(line.replace(/\u0001[^\u0002]*\u0002([^\u0003]*)\u0003/g, '$1')).replace(/\s+/g, ' ').trim()
      if (!links.length) {
        if (/ordinance/i.test(plain) && /(1st|first)/i.test(plain)) section = 'ord1'
        else if (/ordinance/i.test(plain) && /(2nd|second)/i.test(plain)) section = 'ord2'
        else if (/^ordinances?\b/i.test(plain)) section = 'ord'
        else if (/^resolutions?\b/i.test(plain)) section = 'res'
        else if (/bill list/i.test(plain)) section = 'bill'
        else if (/amendment/i.test(plain)) section = 'amend'
        continue
      }
      const lineSession = sessionOf(label) ?? sessionOf(extra)
      const trailing = cleanTitle(line.split('\u0003').pop() ?? '')
      for (const l of links) {
        if (!/^https?:/i.test(l.url)) continue
        const url = l.url.replace(/^http:\/\/orangetwpnjcc/i, 'https://orangetwpnjcc')
        const t = l.text
        const legM = t.match(LEG_RE)
        const bare = !legM && ['ord', 'ord1', 'ord2', 'res'].includes(section) ? t.match(BARE_RE) : null
        if ((legM || bare) && !/bill list/i.test(t) && section !== 'bill') {
          const num = Number(legM ? legM[2] : bare![1]), year = legM ? legM[3] : bare![2]
          const isOrd = legM ? /^ORD/i.test(legM[1]) : section.startsWith('ord')
          const identifier = `${isOrd ? 'Ordinance' : 'Resolution'} ${num}-${year}`
          const title = cleanTitle(t) || trailing || identifier
          const leg = legs.get(identifier) ?? { identifier, type: isOrd ? (/bond/i.test(title) ? 'bond_ordinance' : 'ordinance') : 'resolution', title, docs: [], listings: [] }
          if (leg.title === identifier && title !== identifier) leg.title = title
          if (!leg.docs.some((d) => d.url === url)) leg.docs.push({ label: `${identifier} (${date})`, kind: 'legislation', url })
          const reading = section === 'ord1' || /(1st|first) reading/i.test(t) ? 'first' : section === 'ord2' || /(2nd|second) reading/i.test(t) ? 'second' : undefined
          if (!leg.listings.some((x) => x.meetingKey === key)) leg.listings.push({ date, meetingKey: key, reading, section })
          legs.set(identifier, leg)
          const sec = isOrd ? (reading === 'first' ? 'Ordinances — first reading' : reading === 'second' ? 'Ordinances — second reading' : 'Ordinances') : 'Resolutions'
          m.legBySection.set(sec, [...(m.legBySection.get(sec) ?? []), identifier])
          continue
        }
        let kind = 'other'
        if (/^agenda/i.test(t) || /agenda/i.test(label) && !/minutes/i.test(t)) kind = 'agenda'
        else if (/minutes/i.test(t)) kind = 'minutes'
        else if (/youtube|vimeo|video/i.test(url + ' ' + t + ' ' + label)) kind = 'video'
        else if (/bill list/i.test(t + ' ' + label) || section === 'bill') kind = 'bill_list'
        else if (/notice/i.test(t)) kind = 'notice'
        else if (/citizen.?s?.?comment/i.test(t + ' ' + label)) kind = 'comments'
        const session = ['agenda', 'minutes'].includes(kind) ? (lineSession ?? (sessionOf(t) || 'regular')) : undefined
        if (session) m.sessions.add(session)
        const docLabel = kind === 'agenda' || kind === 'minutes' ? `${session ? session[0].toUpperCase() + session.slice(1) : ''} ${kind}`.trim() : (label && !SESSION_RE.test(label) ? `${label.replace(/:$/, '')}: ${t}` : t)
        if (!m.docs.some((d) => d.url === url)) m.docs.push({ label: (docLabel.replace(/^[:s]+|[:s]+$/g, '') || decodeURIComponent(url.split('/').pop() ?? '') || kind).slice(0, 200), kind, session, url })
      }
    }
  }
}

const SESSION_TYPE: Record<string, string> = { conference: 'work_session', 'work session': 'work_session', regular: 'regular', special: 'special', 'budget hearing': 'public_hearing', 'public hearing': 'public_hearing', reorganization: 'special', 'executive session': 'special', 'closed session': 'special' }
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

async function meetingsAndLegislation() {
  const meetings = new Map<string, Mtg>(), legs = new Map<string, Leg>()
  const pages = idx.pages.filter((p: any) => /^\d{4}-meetings/.test(p.slug)).sort((a: any, b: any) => a.slug.localeCompare(b.slug))
  for (const p of pages) parseMeetingPage(p, meetings, legs)
  console.log(`parsed ${meetings.size} meeting dates, ${legs.size} ordinances/resolutions from ${pages.length} year pages`)

  const srcByPage = new Map<string, number>()
  for (const p of pages) srcByPage.set(p.link, (await sourceFor(p.link, `${decode(p.title.rendered)} — City Council meetings archive (orangetwpnjcc.org)`)).id)

  // 1) meetings: one record per session (conference / regular / special / budget hearing …)
  const meetingId = new Map<string, number>() // meetingKey → id of the session that carries legislation
  let n = 0
  for (const m of [...meetings.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const sessions = m.sessions.size ? [...m.sessions] : [sessionOf(m.heading.replace(/^[^A-Za-z]*[A-Za-z]{3,}\.?\s+\d{1,2},?\s+\d{4}\s*/, '')) ?? 'regular']
    const main = sessions.includes('regular') ? 'regular' : sessions[0]
    for (const s of sessions) {
      const docs = m.docs.filter((d) => d.session === s || (!d.session && s === main))
      const withMeta = [] as any[]
      for (const d of docs) withMeta.push({ ...d, ...(await docMeta(d.url)) })
      const hasMinutes = docs.some((d) => d.kind === 'minutes')
      const past = m.date < NOW.slice(0, 10)
      const extraLabel = m.heading.replace(/([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/, '').trim()
      const doc = await upsert('meetings', 'slug', {
        title: `City Council • ${cap(s)} meeting${extraLabel && !new RegExp(s, 'i').test(extraLabel) ? ` (${extraLabel})` : ''}`,
        slug: slugify(`council-${m.key}-${s}`),
        body: 'city_council', meetingType: SESSION_TYPE[s] ?? 'regular',
        startsAt: `${m.date}T17:00:00.000Z`, timeConfirmed: false,
        location: 'As stated on the official agenda',
        meetingStatus: hasMinutes || past ? 'held' : 'scheduled',
        documents: withMeta, videoUrl: docs.find((d) => d.kind === 'video')?.url,
        workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [srcByPage.get(m.pageUrl)],
      })
      if (s === main) meetingId.set(m.key, doc.id)
      n++
    }
  }
  console.log(`meetings upserted: ${n}`)

  // 2) legislation with listings as actions (outcomes not inferred)
  const legId = new Map<string, number>()
  let k = 0
  for (const l of legs.values()) {
    const docs = [] as any[]
    for (const d of l.docs) docs.push({ ...d, ...(await docMeta(d.url)) })
    const actions = l.listings.filter((x) => x.reading).sort((a, b) => a.date.localeCompare(b.date)).map((x) => ({
      date: x.date, action: x.reading === 'first' ? 'introduced' : 'second_reading', meeting: meetingId.get(x.meetingKey),
      note: `Listed for ${x.reading} reading on the Council agenda (from the meetings archive). Outcome not yet recorded.`,
      evidenceUrl: l.docs[0]?.url,
    }))
    const listedOn = l.listings.map((x) => x.date).sort()
    const doc = await upsert('legislation', 'identifier', {
      identifier: l.identifier, slug: slugify(l.identifier), type: l.type, title: l.title.slice(0, 250),
      summary: `Listed on the City Council agenda for ${listedOn.map((d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })).join(', ')}. Title taken from the document name on the Council website; see the original for the official text.`,
      actions, documents: docs, workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified',
      sources: [...new Set(l.listings.map((x) => srcByPage.get(meetings.get(x.meetingKey)!.pageUrl)))],
    })
    legId.set(l.identifier, doc.id)
    if (++k % 250 === 0) console.log(`  legislation ${k}/${legs.size}`)
  }
  console.log(`legislation upserted: ${k}`)

  // 3) web-native agenda items on the main session, linking legislation
  for (const m of meetings.values()) {
    const id = meetingId.get(m.key)
    if (!id || !m.legBySection.size) continue
    const agendaItems = [...m.legBySection.entries()].map(([title, ids], i) => ({ number: String(i + 1), title, legislation: [...new Set(ids)].map((x) => legId.get(x)).filter(Boolean) }))
    await payload.update({ collection: 'meetings', id, data: { agendaItems } as any, ...sys })
  }
  console.log('agenda items linked')

  // 4) full web agendas converted from the posted agenda documents (recent meetings)
  const { buildWebAgendas } = await import('./web-agendas')
  const r = await buildWebAgendas(payload, 4)
  console.log(`web agendas: ${r.converted.length} converted, ${r.skipped.length} skipped`)
  for (const x of r.skipped) console.log('  skipped', x)
}

// ================================================================== NOTICES (posts)
async function notices() {
  const cat = Object.fromEntries(idx.cats.map((c: any) => [c.id, c.slug]))
  let n = 0
  for (const p of idx.posts) {
    const cats: string[] = p.categories.map((c: number) => cat[c])
    const title = decode(p.title.rendered).trim()
    const raw = htmlToText(p.content.rendered).split(/Share This Post!/)[0].trim()
    const legal = cats.includes('public-notice') && /(ordinance|legal notice|notice of decision|resolution|RFQ|request for (qualifications|proposals)|solicitation|public hearing|bid)/i.test(`${title} ${raw.slice(0, 300)}`)
    const summary = (raw.split('\n').map((s) => s.trim()).find((s) => s.length > 40) ?? title).slice(0, 280)
    const body = `${raw || 'This notice was published as an image or attachment on the Council website.'}\n\nOriginal notice: ${p.link}`
    const src = await sourceFor(p.link, `${title} (orangetwpnjcc.org post, ${p.date.slice(0, 10)})`)
    await upsert('notices', 'slug', {
      title: title.slice(0, 250), slug: slugify(`council-${p.slug}`), kind: legal ? 'legal' : 'general', summary,
      body: textToLexical(body), workflowStatus: 'published', publishedAt: new Date(p.date).toISOString(), verificationStatus: 'unverified', sources: [src.id],
    })
    if (++n % 200 === 0) console.log(`  notices ${n}/${idx.posts.length}`)
  }
  console.log(`notices upserted: ${n}`)
}

if (all || want.has('officials')) await officials()
if (all || want.has('meetings')) await meetingsAndLegislation()
if (all || want.has('notices')) await notices()
console.log('council import done')
process.exit(0)
