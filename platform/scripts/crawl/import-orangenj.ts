/**
 * Stage 2 for orangenj.gov: IMPORT the cached crawl (run `fetch.ts orangenj` and
 * `fetch.ts orangenj-extras` first). Idempotent; re-running updates in place.
 *
 *   tsx scripts/crawl/import-orangenj.ts [directory] [pages] [bids] [businesses]   (default: all)
 *
 * - directory: Staff Directory → officials (work phone + email only; the "additional"
 *   phone numbers are not imported because they may be personal numbers).
 * - pages: every numbered content page → info-pages (rich text with headings, lists and links;
 *   links rewritten to this site; DocumentCenter files open in the in-site viewer), plus FAQs,
 *   "Contact Us" boxes, departments, and the four existing services linked to their full pages.
 * - bids: Bids.aspx + bid detail pages → bids.
 * - businesses: Resource Directory (all listings) → business-listings.
 * Everything is published as verificationStatus 'unverified' with a source record.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../../src/payload.config'
import { CRAWL_DIR, readManifest } from './fetch'
import { decode } from './text'

const want = new Set(process.argv.slice(2))
const all = want.size === 0
const payload = await getPayload({ config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const HOST = 'orangenj.gov'
const BASE = 'https://orangenj.gov'
const NOW = new Date().toISOString()
const manifest = readManifest(HOST)
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '')
const clean = (s: string | null | undefined) => decode(String(s ?? '')).replace(/\s+/g, ' ').trim()

function cached(url: string): { html: string; retrievedAt: string } | null {
  const row = manifest.get(url)
  if (!row || row.status !== 200 || !row.file) return null
  return { html: readFileSync(join(CRAWL_DIR, row.file), 'utf8'), retrievedAt: row.retrievedAt }
}
const dom = (html: string) => new JSDOM(html).window.document

async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys } as any) as any
  return payload.create({ collection, data, ...sys } as any) as any
}
const sourceFor = (url: string, title: string, retrievedAt: string) => upsert('source-records', 'url', {
  title, url, owner: 'City of Orange Township', ownerType: 'official', retrievedAt, status: 'captured',
  notes: 'Imported automatically from orangenj.gov. Not yet reviewed by the City.',
})

// ------------------------------------------------------------------ link rewriting
/** orangenj page id → our info-page slug (filled before bodies are converted). */
const pageSlugById = new Map<string, string>()
/** directory employee id → official slug. */
const officialSlugByEid = new Map<string, string>()

export function docViewerPath(href: string): string | null {
  const m = href.match(/\/DocumentCenter\/View\/(\d+)(?:\/([^?#]*))?/i)
  return m ? `/documents/orangenj/${m[1]}${m[2] ? `/${encodeURIComponent(decodeURIComponent(m[2]).replace(/[^\w.-]+/g, '-'))}` : ''}` : null
}

function rewriteHref(raw: string): string {
  const href = decode(raw.trim())
  if (/^(mailto:|tel:|#)/i.test(href)) return href
  let u: URL
  try { u = new URL(href, BASE) } catch { return href }
  const host = u.hostname.replace(/^www\./, '')
  if (host !== HOST && host !== 'nj-orangecitytownship.civicplus.com') return u.toString()
  const doc = docViewerPath(u.pathname)
  if (doc) return doc
  const page = u.pathname.match(/^\/(\d+)\/[^/]*$/)
  if (page && pageSlugById.has(page[1])) return `/info/${pageSlugById.get(page[1])}`
  const p = u.pathname.toLowerCase()
  if (p === '/' ) return '/'
  if (p === '/bids.aspx') return u.searchParams.get('bidID') ? `/business/bids/bid-${u.searchParams.get('bidID')}` : '/business/bids'
  if (p.startsWith('/businessdirectory')) return '/business/directory'
  if (p === '/directory.aspx' || p === '/m/directory') return '/government/directory'
  if (p === '/m/directory/employee' && officialSlugByEid.has(u.searchParams.get('eid') ?? '')) return `/government/officials/${officialSlugByEid.get(u.searchParams.get('eid')!)}`
  if (p === '/agendacenter') return '/government/meetings'
  if (p === '/calendar.aspx') return '/calendar'
  if (p === '/faq.aspx') return '/info/frequently-asked-questions'
  return `${BASE}${u.pathname}${u.search}`
}

/** Untrusted CMS HTML → a small safe subset (p, h2–h4, lists, links, bold/italic), then Lexical. */
function toLexical(fragments: Element[]) {
  const doc = dom('<div id="out"></div>')
  const out = doc.getElementById('out')!
  const ALLOWED = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A', 'STRONG', 'B', 'EM', 'I', 'BR', 'BLOCKQUOTE'])
  const walk = (src: Node, dst: Node) => {
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType === 3) { dst.appendChild(doc.createTextNode(n.textContent ?? '')); continue }
      if (n.nodeType !== 1) continue
      const el = n as Element
      let tag = el.tagName
      if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'svg', 'SVG', 'FORM', 'INPUT', 'BUTTON'].includes(tag)) continue
      if (tag === 'H1') tag = 'H2'
      if (tag === 'H5' || tag === 'H6') tag = 'H4'
      if (tag === 'TABLE') { // tables become lists of rows
        const ul = doc.createElement('ul')
        for (const tr of Array.from(el.querySelectorAll('tr'))) {
          const cells = Array.from(tr.children).map((c) => clean(c.textContent)).filter(Boolean)
          if (cells.length) { const li = doc.createElement('li'); li.textContent = cells.join(' — '); ul.appendChild(li) }
        }
        if (ul.childNodes.length) dst.appendChild(ul)
        continue
      }
      if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
        const p = doc.createElement('p'); walk(el, p); if (clean(p.textContent)) dst.appendChild(p); continue
      }
      if (!ALLOWED.has(tag)) { walk(el, dst); continue }
      const copy = doc.createElement(tag)
      if (tag === 'A') {
        const href = el.getAttribute('href')
        if (!href || /^javascript:/i.test(href)) { walk(el, dst); continue }
        copy.setAttribute('href', rewriteHref(href))
      }
      walk(el, copy)
      if (tag !== 'BR' && !clean(copy.textContent)) continue
      dst.appendChild(copy)
    }
  }
  for (const f of fragments) walk(f, out)
  const html = out.innerHTML.replace(/ /g, ' ')
  if (!clean(out.textContent)) return null
  return convertHTMLToLexical({ editorConfig, html, JSDOM: JSDOM as any })
}

// ================================================================== DIRECTORY → officials
type Person = { eid: string; name: string; title: string; dept: string; division?: string; email?: string; phone?: string; photoId?: string }
function parseDirectory(): Person[] {
  const c = cached(`${BASE}/Directory.aspx`)!
  const d = dom(c.html)
  const out: Person[] = []
  for (const li of Array.from(d.querySelectorAll('li.list-group-item'))) {
    const a = li.querySelector('a.fw-bold[href*="employee?eid="]')
    if (!a) continue
    const depts = Array.from(li.querySelectorAll('ul.departments a')).map((x) => clean(x.textContent))
    out.push({
      eid: a.getAttribute('href')!.match(/eid=(\d+)/)![1],
      name: clean(a.textContent),
      title: clean(li.querySelector('.d-sm-block')?.textContent),
      dept: depts[0] ?? '', division: depts[1],
      email: li.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.slice(7).trim().toLowerCase() || undefined,
      // Only the first number (the published work line). The second "additional" number is skipped.
      phone: clean(li.querySelector('a[href^="tel:"]')?.textContent) || undefined,
      photoId: li.querySelector('img[src*="ImageRepository/Document?documentID="]')?.getAttribute('src')?.match(/documentID=(\d+)/)?.[1],
    })
  }
  // One person may be listed under two departments with the same id: keep one entry, both titles.
  const byEid = new Map<string, Person>()
  for (const p of out) {
    const prev = byEid.get(p.eid)
    if (!prev) byEid.set(p.eid, p)
    else if (!prev.title.includes(p.title)) prev.title = `${prev.title}; ${p.title} (${p.division ?? p.dept})`
  }
  return [...byEid.values()]
}

const HEAD = /\b(Captain|Mayor|Business Administrator|Director|Chief|Officer|Official|City Attorney|Assessor|Collector|Administrator|Registrar|Superintendent|Judge|Supervisor|Coordinator|Prosecutor|Manager|Engineer|Planner)\b/i
const NOT_HEAD = /\b(Assistant|Clerk|Secretary|Deputy City Attorney|Deputy Registrar|Analyst|Inspector|Aide|Account)\b/i
function categoryFor(p: Person): 'executive' | 'council' | 'clerk' | 'department' | 'staff' {
  if (p.dept === 'City Council') return 'council'
  if (/^Mayor$/i.test(p.title) || /^Business Administrator$/i.test(p.title)) return 'executive'
  if (p.dept === 'City Clerk') return 'clerk'
  if (/^(Chief|Director|Captain)\b/i.test(p.title)) return 'department'
  return HEAD.test(p.title) && !NOT_HEAD.test(p.title) ? 'department' : 'staff'
}

async function photoFor(p: Person): Promise<number | undefined> {
  if (!p.photoId) return undefined
  const url = `${BASE}/ImageRepository/Document?documentID=${p.photoId}`
  const existing = await payload.find({ collection: 'media', where: { sourceUrl: { equals: url } }, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0].id as number
  const row = manifest.get(url)
  if (!row || row.status !== 200 || !row.file) return undefined
  const mime = (row.contentType ?? '').split(';')[0]
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return undefined
  const body = readFileSync(join(CRAWL_DIR, row.file))
  const doc = await payload.create({
    collection: 'media', overrideAccess: true, context: { system: true },
    data: {
      kind: 'photo', alt: `Official portrait of ${p.name}`, credit: 'City of Orange Township', rightsHolder: 'City of Orange Township',
      license: 'Official staff photo published on orangenj.gov. Used at the project owner\'s request; reuse to be confirmed by the City before production (checklist P-1).',
      sourceUrl: url, approvalStatus: 'approved', verificationStatus: 'unverified',
    } as any,
    file: { data: body, mimetype: mime, name: `${slugify(p.name)}.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`, size: body.length },
  })
  return doc.id as number
}

const deptIdByName = new Map<string, number>()
/** Directory categories without a department page of their own (e.g. Office of Emergency Management). */
async function ensureDept(name: string): Promise<number> {
  const key = name.toLowerCase()
  if (deptIdByName.has(key)) return deptIdByName.get(key)!
  const slug = slugify(name.replace(/'/g, ''))
  const all = (await payload.find({ collection: 'departments', limit: 300, depth: 0, overrideAccess: true })).docs as any[]
  const found = all.find((d) => d.name.toLowerCase() === key || d.slug === slug || d.slug === slugify(name))
  const doc: any = found ?? await payload.create({ collection: 'departments', data: {
    name, slug, phone: directoryCategoryPhones().get(key), verificationStatus: 'unverified',
  }, ...sys } as any)
  deptIdByName.set(key, doc.id)
  return doc.id
}
const officialIdByEmail = new Map<string, number>()

async function directory() {
  const people = parseDirectory()
  const c = cached(`${BASE}/Directory.aspx`)!
  const src = await sourceFor(`${BASE}/Directory.aspx`, 'Staff Directory (orangenj.gov)', c.retrievedAt)
  const existing = (await payload.find({ collection: 'officials', limit: 1000, depth: 0, overrideAccess: true })).docs as any[]
  const taken = new Set(existing.map((o) => o.slug))
  let created = 0, updated = 0
  for (const [i, p] of people.entries()) {
    const category = categoryFor(p)
    // The same person can hold two roles (two directory entries), so match by directory id first.
    const byEid = existing.find((o) => o.contactUrl === `${BASE}/m/directory/employee?eid=${p.eid}`)
    const sameName = people.filter((x) => x.name === p.name).length > 1
    const unlinked = (o: any) => !String(o.contactUrl ?? '').includes('eid=')
    const match = byEid ?? (sameName ? undefined : existing.find((o) => unlinked(o) && ((p.email && o.email?.toLowerCase() === p.email) || o.name.toLowerCase() === p.name.toLowerCase())))
    if (category === 'council' && match) { officialSlugByEid.set(p.eid, match.slug); if (p.email) officialIdByEmail.set(p.email, match.id); continue } // council profiles come from the Council site
    const deptName = p.division && p.division !== p.dept ? p.division : p.dept
    const department = deptIdByName.get(deptName.toLowerCase()) ?? deptIdByName.get(p.dept.toLowerCase()) ?? (p.dept && category !== 'council' ? await ensureDept(p.dept) : undefined)
    const leader = category === 'executive' || category === 'department'
    const photo = leader ? await photoFor(p) : undefined
    const office = p.division && category !== 'executive' ? `${p.title}, ${p.division}` : p.title || p.dept
    const sortOrder = /^Mayor$/i.test(p.title) ? 1 : /Business Administrator/i.test(p.title) ? 2 : category === 'department' ? (/^(Chief|Director|Fire Chief|Police Director)|Chief of Police|Health Officer|City Attorney|Tax (Assessor|Collector)$/i.test(p.title) ? 10 + i : 100 + i) : 200 + i
    const data: Record<string, any> = {
      name: p.name, office, category, sortOrder, email: p.email, phone: p.phone, department,
      contactUrl: `${BASE}/m/directory/employee?eid=${p.eid}`, verificationStatus: 'unverified', sources: [src.id],
      ...(photo ? { photo } : {}),
    }
    let doc: any
    if (match) { doc = await payload.update({ collection: 'officials', id: match.id, data: { ...data, slug: match.slug, bio: match.bio ?? undefined }, ...sys } as any); updated++ }
    else {
      let slug = slugify(p.name); for (let n = 2; taken.has(slug); n++) slug = `${slugify(p.name)}-${n}`
      taken.add(slug)
      doc = await payload.create({ collection: 'officials', data: { ...data, slug }, ...sys } as any); created++
    }
    officialSlugByEid.set(p.eid, doc.slug)
    if (p.email) officialIdByEmail.set(p.email, doc.id)
  }
  console.log(`directory: ${people.length} people (${created} new, ${updated} updated; council kept from the Council site)`)
  return people
}

// ================================================================== PAGES → info-pages
type Page = { id: string; parentId: string; url: string; title: string; crumbs: string[]; d: Document; retrievedAt: string }
const SECTION: Record<string, string> = { residents: 'residents', business: 'business', 'uez program': 'uez', 'how do i...': 'how-do-i', 'city government': 'government', departments: 'departments' }

function loadPages(): Page[] {
  const out: Page[] = []
  for (const [url, row] of manifest) {
    if (row.status !== 200 || !/^https:\/\/orangenj\.gov\/\d+\/[^/?]+$/.test(url)) continue
    const c = cached(url)!
    const d = dom(c.html)
    const id = (d.getElementById('hdnPageID') as any)?.value ?? url.match(/\/(\d+)\//)![1]
    out.push({
      id, parentId: (d.getElementById('hdnParentID') as any)?.value ?? '', url,
      title: clean(d.getElementById('versionHeadLine')?.textContent) || clean(d.title.split('|')[0]),
      crumbs: Array.from(d.querySelectorAll('ol.breadCrumbs li')).map((li) => clean(li.textContent)),
      d, retrievedAt: c.retrievedAt,
    })
  }
  return out
}

function mainRegion(d: Document) { return d.getElementById('moduleContent') }

/** FAQ questions by QID, parsed from the cached FAQ category pages. */
function loadFaqs() {
  const faqs = new Map<string, { q: string; a: Element; category: string }>()
  for (const [url, row] of manifest) {
    if (row.status !== 200 || !/FAQ\.aspx\?QID=\d+$/i.test(url)) continue
    const d = dom(cached(url)!.html)
    for (const cat of Array.from(d.querySelectorAll('.faq-category'))) {
      const category = clean(cat.querySelector('h2')?.textContent)
      for (const li of Array.from(cat.querySelectorAll('li[id^="question-"]'))) {
        const a = li.querySelector('.accordion-text')
        if (a) faqs.set(li.id.replace('question-', ''), { q: clean(li.querySelector('h3')?.textContent).replace(/^\d+\.\s*/, ''), a, category })
      }
    }
  }
  return faqs
}

function faqFragment(items: { q: string; a: Element }[], heading = 'Frequently asked questions') {
  const d = dom('<div></div>')
  const wrap = d.createElement('div')
  const h = d.createElement('h2'); h.textContent = heading; wrap.appendChild(h)
  for (const f of items) {
    const q = d.createElement('h3'); q.textContent = f.q; wrap.appendChild(q)
    const a = d.createElement('div'); a.innerHTML = f.a.innerHTML; wrap.appendChild(a)
  }
  return wrap
}

const SOCIAL = /facebook|twitter|instagram|youtube|linkedin|x\.com|translate\.google|civicplus\.com\/|granicus|apple\.com|google\.com\/maps|maps\.google/i
function providerOf(url: string) {
  const h = new URL(url).hostname.replace(/^www\./, '')
  return ({ 'wipp.edmundsassoc.com': 'Edmunds WIPP', 'govpaynow.com': 'GovPayNow', 'njmcdirect.com': 'NJMCDirect (NJ Courts)', 'ecode360.com': 'eCode360 (General Code)', 'streetopeningpermits.us': 'StreetOpeningPermits.us', 'docs.google.com': 'Google Forms' } as Record<string, string>)[h.toLowerCase()] ?? h
}

async function pages() {
  const list = loadPages()
  const faqs = loadFaqs()
  const byId = new Map(list.map((p) => [p.id, p]))
  // Stable unique slugs first so bodies can link to each other.
  const used = new Set<string>()
  for (const p of list.sort((a, b) => Number(a.id) - Number(b.id))) {
    let s = slugify(p.title) || `page-${p.id}`
    if (used.has(s)) s = `${s}-${p.id}`
    used.add(s); pageSlugById.set(p.id, s)
  }
  pageSlugById.set('faq', 'frequently-asked-questions')

  // Departments = second-level pages under "Departments" (and their own sub-pages inherit them).
  const isDeptTop = (p: Page) => p.crumbs[1] === 'Departments' && p.crumbs.length === 3
  const deptDocs = new Map<string, number>()
  const existingDepts = (await payload.find({ collection: 'departments', limit: 200, depth: 0, overrideAccess: true })).docs as any[]
  const dirCats = directoryCategoryPhones()
  for (const p of list.filter(isDeptTop)) {
    const src = await sourceFor(p.url, `${p.title} (orangenj.gov)`, p.retrievedAt)
    const match = existingDepts.find((d) => d.officialUrl === p.url || d.slug === slugify(p.title))
    const phone = dirCats.get(p.title.toLowerCase()) ?? dirCats.get(p.title.replace(/^City of Orange /i, '').replace(/ Department$/i, '').toLowerCase()) ?? dirCats.get(p.title.replace(/ Division of Community Services$/i, '').toLowerCase())
    const data = { name: p.title.replace(/^City of Orange Police Department$/i, 'Police'), officialUrl: p.url, verificationStatus: 'unverified', sources: [src.id], ...(phone ? { phone } : {}),
      address: null }
    const doc: any = match ? await payload.update({ collection: 'departments', id: match.id, data, ...sys } as any) : await payload.create({ collection: 'departments', data: { ...data, slug: slugify(data.name) }, ...sys } as any)
    deptDocs.set(p.id, doc.id as number)
    deptIdByName.set(String(data.name).toLowerCase(), doc.id as number)
  }
  // Nearest department page above a page (walking the parent chain).
  const topOf = (p: Page): Page | undefined => { for (let cur: Page | undefined = p, n = 0; cur && n < 6; cur = byId.get(cur.parentId), n++) if (isDeptTop(cur)) return cur }
  // Directory divisions → nearest department page by name.
  for (const p of list) if (p.crumbs[1] === 'Departments' && !isDeptTop(p)) {
    const top = topOf(p)
    if (top) deptIdByName.set(p.title.toLowerCase(), deptDocs.get(top.id)!)
  }
  for (const [alias, name] of [['administration', 'administration'], ["mayor's office", "mayor's office"], ['police', 'police'], ['health & environmental services division', 'health division of community services'],
    ['vital statistics division', 'vital statistics'], ['animal control division', 'animal control'], ['nursing services division', 'nursing'], ['older adults division', 'older adults'], ['recreation division', 'recreation'],
    ['code enforcement division', 'code enforcement division'], ['building & construction division', 'building & construction division'], ['municipal prosecutor\'s office', 'law'], ['community service bureau', 'police'], ['personnel & payroll office', 'administration']] as const) {
    const id = deptIdByName.get(name)
    if (id) deptIdByName.set(alias, id)
  }
  const deptOf = (p: Page): number | undefined => {
    if (p.crumbs[1] !== 'Departments') return undefined
    const top = topOf(p)
    return top ? deptDocs.get(top.id) : undefined
  }
  return { list, faqs, byId, deptOf }
}

function directoryCategoryPhones() {
  const d = dom(cached(`${BASE}/Directory.aspx`)!.html)
  const m = new Map<string, string>()
  for (const li of Array.from(d.querySelectorAll('li'))) {
    const a = li.querySelector('a[href*="directory/department?did="]')
    const tel = li.querySelector('a[href^="tel:"]')
    if (a && tel && !li.querySelector('a[href*="employee?eid="]')) m.set(clean(a.textContent).toLowerCase(), clean(tel.textContent))
  }
  // Categories tab: one ".directory-table-row" per department with its main number.
  for (const row of Array.from(d.querySelectorAll('.directory-table-row.d-sm-flex'))) {
    const a = row.querySelector('a[href*="directory/department?did="]')
    const tel = row.querySelector('a[href^="tel:"]')
    if (a && tel) m.set(clean(a.textContent).toLowerCase(), clean(tel.textContent))
  }
  return m
}

async function writePages(ctx: Awaited<ReturnType<typeof pages>>) {
  const { list, faqs, byId, deptOf } = ctx
  const ids = new Map<string, number>()
  const usedFaq = new Set<string>()
  // Two passes: create all (so parents exist), then set parents.
  for (const p of list) {
    const main = mainRegion(p.d)
    if (!main) continue
    const frags = Array.from(main.querySelectorAll('.fr-view')).filter((el) => !el.closest('.widgetFAQ, .faq-container, aside'))
    const faqIds = [...new Set(Array.from(p.d.querySelectorAll('.widgetFAQ a[href*="QID="]')).map((a) => a.getAttribute('href')!.match(/QID=(\d+)/)![1]))]
    const pageFaqs = faqIds.map((q) => faqs.get(q)).filter(Boolean) as { q: string; a: Element }[]
    faqIds.forEach((q) => usedFaq.add(q))
    const body = toLexical(pageFaqs.length ? [...frags, faqFragment(pageFaqs)] : frags)
    // Files: inline links + "related documents" widgets, deduplicated by DocumentCenter id.
    const files = new Map<string, { label: string; url: string }>()
    for (const a of Array.from(main.querySelectorAll('a[href*="DocumentCenter/View/"]'))) {
      const href = new URL(a.getAttribute('href')!, BASE).toString().replace('://www.', '://')
      const id = href.match(/View\/(\d+)/)![1]
      const label = clean(a.textContent) || clean(a.getAttribute('aria-label')).replace(/ (pdf|doc|docx) file$| Opens in new window$/i, '')
      if (!files.has(id) || (label && !files.get(id)!.label)) files.set(id, { label: label || `Document ${id}`, url: href })
    }
    const ext = new Map<string, { label: string; url: string; provider: string }>()
    for (const a of Array.from(main.querySelectorAll('a[href^="http"]'))) {
      const href = a.getAttribute('href')!.trim()
      let host = ''
      try { host = new URL(href).hostname.replace(/^www\./, '') } catch { continue }
      if (host === HOST || host.endsWith('civicplus.com') || SOCIAL.test(href)) continue
      const label = clean(a.textContent) || clean(a.getAttribute('aria-label'))
      if (label && !ext.has(href)) ext.set(href, { label, url: href, provider: providerOf(href) })
    }
    const contacts = [...new Set(Array.from(p.d.querySelectorAll('.widgetStaffDirectory a[href^="mailto:"]')).map((a) => a.getAttribute('href')!.slice(7).trim().toLowerCase()))]
      .map((e) => officialIdByEmail.get(e)).filter(Boolean)
    const section = SECTION[(p.crumbs[1] ?? p.title).toLowerCase()] ?? SECTION[p.title.toLowerCase()] ?? 'residents'
    const firstPara = frags.map((f) => clean(f.querySelector('p')?.textContent)).find((t) => t.length > 40)
    const src = await sourceFor(p.url, `${p.title} (orangenj.gov)`, p.retrievedAt)
    const doc = await upsert('info-pages', 'officialUrl', {
      title: p.title, slug: pageSlugById.get(p.id), section, sortOrder: Number(p.id), officialUrl: p.url,
      summary: firstPara ? (firstPara.length > 280 ? `${firstPara.slice(0, 277).replace(/\s+\S*$/, '')}…` : firstPara) : undefined,
      body: body ?? undefined, attachments: [...files.values()], externalLinks: [...ext.values()], contacts,
      department: deptOf(p), workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [src.id],
    })
    ids.set(p.id, doc.id)
  }
  for (const p of list) {
    const parent = byId.get(p.parentId)
    if (parent && ids.has(p.id) && ids.has(parent.id)) await payload.update({ collection: 'info-pages', id: ids.get(p.id)!, data: { parent: ids.get(parent.id) }, ...sys } as any)
  }
  // One page with every FAQ, grouped by category.
  const byCat = new Map<string, { q: string; a: Element }[]>()
  for (const f of faqs.values()) (byCat.get(f.category) ?? byCat.set(f.category, []).get(f.category)!).push(f)
  const faqUrl = `${BASE}/FAQ.aspx`
  const faqSrc = await sourceFor(faqUrl, 'Frequently Asked Questions (orangenj.gov)', NOW)
  await upsert('info-pages', 'officialUrl', {
    title: 'Frequently asked questions', slug: 'frequently-asked-questions', section: 'how-do-i', sortOrder: 9999, officialUrl: faqUrl,
    summary: 'Answers to common questions about property taxes, the municipal court, the police department and City services.',
    body: toLexical([...byCat.entries()].map(([cat, items]) => faqFragment(items, cat))), attachments: [], externalLinks: [],
    workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [faqSrc.id],
  })
  console.log(`pages: ${ids.size} info pages, ${faqs.size} FAQs (${usedFaq.size} shown on topic pages)`)
  return ids
}

/** Long bios for the Mayor and Business Administrator, from their "About" pages. */
async function bios(list: Page[]) {
  for (const id of ['257', '287']) { // the police Director/Chief pages describe the office and name no one
    const p = list.find((x) => x.id === id)
    const main = p && mainRegion(p.d)
    if (!p || !main) continue
    const text = Array.from(main.querySelectorAll('.fr-view')).map((f) => Array.from(f.querySelectorAll('p, li')).map((x) => clean(x.textContent)).filter(Boolean).join('\n\n')).join('\n\n').trim()
    if (!text) continue
    const officials = (await payload.find({ collection: 'officials', where: { category: { in: ['executive', 'department'] } }, limit: 500, depth: 0, overrideAccess: true })).docs as any[]
    const who = officials.find((o) => text.includes(o.name) || text.includes(o.name.split(' ').slice(-1)[0] + ',') && p.title.includes(o.office))
      ?? officials.find((o) => (id === '257' && /^Mayor$/i.test(o.office)) || (id === '287' && /Business Administrator/i.test(o.office)))
    if (!who) { console.log(`bio: no match for ${p.title}`); continue }
    await payload.update({ collection: 'officials', id: who.id, data: { bio: text.slice(0, 20_000) }, ...sys } as any)
    console.log(`bio: ${who.name} ← ${p.title}`)
  }
}

/** Point the four seeded services at their full pages. */
async function linkServices() {
  const map: Record<string, string> = { '181': 'pay', '180': 'permits', '177': 'trash', '163': 'records' }
  for (const [pid, cat] of Object.entries(map)) {
    const info = (await payload.find({ collection: 'info-pages', where: { officialUrl: { like: `/${pid}/` } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
    const svc = (await payload.find({ collection: 'services', where: { category: { equals: cat } }, limit: 5, depth: 0, overrideAccess: true })).docs as any[]
    for (const s of svc) if (info) await payload.update({ collection: 'services', id: s.id, data: { infoPage: info.id }, ...sys } as any)
  }
  // The City Code lives on eCode360, which refuses to be embedded.
  const src = await sourceFor('https://ecode360.com/OR0804', 'City of Orange Township Code (eCode360)', NOW)
  await upsert('services', 'slug', {
    title: 'City Code (municipal ordinances)', slug: 'city-code', category: 'records',
    summary: 'Read the codified ordinances of the City of Orange Township, published by General Code on eCode360.',
    externalUrl: 'https://ecode360.com/OR0804', externalSystemName: 'eCode360 (General Code)',
    workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [src.id],
  })
}

// ================================================================== BIDS
function parseUSDate(s: string): string | undefined {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i)
  if (!m) return undefined
  let h = Number(m[4] ?? 12); if (m[6]?.toUpperCase() === 'PM' && h < 12) h += 12; if (m[6]?.toUpperCase() === 'AM' && h === 12) h = 0
  // Eastern time; offset is approximate across DST but only the date/time label is shown.
  const offset = Number(m[1]) >= 4 && Number(m[1]) <= 10 ? '-04:00' : '-05:00'
  return new Date(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}T${String(h).padStart(2, '0')}:${m[5] ?? '00'}:00${offset}`).toISOString()
}

async function bids() {
  const c = cached(`${BASE}/Bids.aspx`)!
  const d = dom(c.html)
  let category = ''
  let n = 0
  for (const el of Array.from(d.querySelectorAll('.bidsHeader, .listItemsRow.bid'))) {
    if (el.classList.contains('bidsHeader')) { category = clean(el.querySelector('span')?.textContent); continue }
    const a = el.querySelector('.bidTitle a[href*="bidID="]')
    if (!a) continue
    const bidId = a.getAttribute('href')!.match(/bidID=(\d+)/)![1]
    const statusCells = Array.from(el.querySelectorAll('.bidStatus > div:last-child span')).map((s) => clean(s.textContent))
    const listStatus = (statusCells[0] ?? 'Open').toLowerCase()
    const url = `${BASE}/bids.aspx?bidID=${bidId}`
    const detail = cached(url)
    const dd = detail ? dom(detail.html) : null
    const detailRoot = dd?.getElementById('contentarea') ?? null
    // Detail page: "<strong>Label:</strong> | BidDetailSpec" rows, then "BidListHeader" rows whose value is in the next row.
    const fields = new Map<string, Element>()
    if (detailRoot) {
      for (const strong of Array.from(detailRoot.querySelectorAll('span.BidDetail > strong'))) {
        const value = strong.closest('tr')?.querySelector('span.BidDetailSpec')
        if (value) fields.set(clean(strong.textContent).replace(/:$/, '').toLowerCase(), value)
      }
      for (const h of Array.from(detailRoot.querySelectorAll('span.BidListHeader'))) {
        const value = h.closest('tr')?.nextElementSibling?.querySelector('span.BidDetail')
        const label = clean(h.textContent).replace(/:$/, '').toLowerCase()
        if (value && !fields.has(label)) fields.set(label, value)
      }
    }
    const text = (k: RegExp) => { for (const [l, v] of fields) if (k.test(l)) return clean(v.textContent); return '' }
    const descEl = [...fields].find(([l]) => /description/.test(l))?.[1]
    const files = detailRoot ? Array.from(detailRoot.querySelectorAll('a[href*="DocumentCenter/View/"], a[href*="Archive.aspx"]'))
      .map((x) => ({ label: clean(x.textContent) || 'Bid document', url: new URL(x.getAttribute('href')!, BASE).toString() }))
      .filter((f, i, arr) => arr.findIndex((g) => g.url === f.url) === i) : []
    const closes = text(/closing/) || statusCells[1] || ''
    const status = /award/.test(listStatus + text(/status/).toLowerCase()) ? 'awarded' : /cancel/i.test(a.textContent ?? '') || /cancel/.test(listStatus) ? 'cancelled' : /closed/.test(listStatus) ? 'closed' : 'open'
    const src = await sourceFor(url, `Bid: ${clean(a.textContent)} (orangenj.gov)`, detail?.retrievedAt ?? c.retrievedAt)
    await upsert('bids', 'slug', {
      title: clean(a.textContent), slug: `bid-${bidId}`, bidNumber: text(/bid number/) || undefined, category, bidStatus: status,
      publishedOn: parseUSDate(text(/publication/)), closesAt: parseUSDate(closes), closesNote: parseUSDate(closes) ? undefined : closes || undefined,
      summary: clean(el.querySelector('.bidTitle span:nth-of-type(2)')?.textContent).replace(/\s*\[\s*Read on.*$/i, '') || undefined,
      body: descEl ? toLexical([descEl]) ?? undefined : undefined, contact: text(/contact/) || undefined, attachments: files, officialUrl: url,
      workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified', sources: [src.id],
    })
    n++
  }
  console.log(`bids: ${n}`)
}

// ================================================================== BUSINESS DIRECTORY
async function businesses() {
  const url = `${BASE}/BusinessDirectoryii.aspx?ysnShowAll=1`
  const c = cached(url) ?? cached(`${BASE}/BusinessDirectoryii.aspx`)!
  const d = dom(c.html)
  const src = await sourceFor(`${BASE}/BusinessDirectoryii.aspx`, 'Business Directory (orangenj.gov)', c.retrievedAt)
  let n = 0
  for (const row of Array.from(d.querySelectorAll('.mainListing .listItemsRow'))) {
    const block = row.querySelector('div')
    const name = clean(block?.querySelector('span[style*="bold"]')?.textContent)
    if (!block || !name) continue
    const lines = block.innerHTML.split(/<br\s*\/?>/i).map((s) => clean(s.replace(/<[^>]+>/g, ' ')))
    const address = lines.slice(1).filter((l) => l && !/^View Map$|^Phone:|^Fax:|^Website|^http/i.test(l)).join(', ')
    const phone = clean(block.querySelector('a[href^="tel:"]')?.textContent) || undefined
    const website = Array.from(block.querySelectorAll('a[href^="http"]')).map((a) => a.getAttribute('href')!).find((h) => !/maps\.google/.test(h))
    await upsert('business-listings', 'key', { name, key: `${name}|${address}`.toLowerCase(), address, phone, website, verificationStatus: 'unverified', sources: [src.id] })
    n++
  }
  console.log(`businesses: ${n}${cached(url) ? '' : ' (first page only: full listing not cached yet)'}`)
}

// ------------------------------------------------------------------ run
const ctx = await pages() // departments + slugs (needed by every step)
if (all || want.has('directory')) await directory()
else for (const p of parseDirectory()) { const o = (await payload.find({ collection: 'officials', where: { contactUrl: { like: `eid=${p.eid}` } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any; if (o) { officialSlugByEid.set(p.eid, o.slug); if (p.email) officialIdByEmail.set(p.email, o.id) } }
if (all || want.has('pages')) { await writePages(ctx); await bios(ctx.list); await linkServices() }
if (all || want.has('bids')) await bids()
if (all || want.has('businesses')) await businesses()
process.exit(0)
