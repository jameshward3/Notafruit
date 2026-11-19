/**
 * Stage 1 of the official-content migration: FETCH ONLY (no database writes).
 * Polite, resumable crawler for the two official sites. Every response is cached
 * under private-uploads/crawl/<host>/… with a manifest line (url, status, sha256,
 * bytes, retrievedAt). Re-running skips cached URLs.
 *
 *   tsx scripts/crawl/fetch.ts council     # orangetwpnjcc.org via the public WordPress REST API
 *   tsx scripts/crawl/fetch.ts orangenj    # orangenj.gov sitemap pages (robots.txt Crawl-delay: 10 s)
 *   tsx scripts/crawl/fetch.ts pdfs 2024   # download linked PDFs from council meeting pages for years >= 2024
 *
 * Fetched content is untrusted data: it is stored and parsed, never executed.
 */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const CRAWL_DIR = join(process.cwd(), 'private-uploads', 'crawl')
const UA = 'Mozilla/5.0 (compatible; OrangePlatformMigration/0.1; prototype content migration)'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Disallowed path prefixes from each site's robots.txt (checked 2026-11-17). */
const DISALLOW: Record<string, string[]> = {
  'orangenj.gov': ['/activedit', '/admin', '/common/admin/', '/OJA', '/support', '/Support', '/search', '/Search', '/currentevents', '/CurrentEvents', '/Currentevents',
    '/map.asp', '/Map.asp', '/RSS.aspx', '/rss.aspx', '/error.aspx', '/Error.aspx', '/404.aspx', '/common/modules/icalendar/', '/common/modules/debug/', '/publiclogin.aspx', '/PublicLogin.aspx'],
  'orangetwpnjcc.org': ['/wp-admin/'],
}
const DELAY_MS: Record<string, number> = { 'orangenj.gov': 10_000, 'orangetwpnjcc.org': 1_000 }
const last: Record<string, number> = {}

export function cachePath(url: string) {
  const u = new URL(url)
  const key = createHash('sha256').update(url).digest('hex').slice(0, 24)
  const ext = (u.pathname.match(/\.(pdf|docx?|json|xml|jpe?g|png)$/i)?.[1] ?? (u.pathname.startsWith('/wp-json') ? 'json' : 'html')).toLowerCase()
  return join(CRAWL_DIR, u.hostname, `${key}.${ext}`)
}

export type ManifestRow = { url: string; status: number; sha256?: string; bytes?: number; contentType?: string; retrievedAt: string; file?: string; error?: string }
export function readManifest(host: string): Map<string, ManifestRow> {
  const f = join(CRAWL_DIR, host, 'manifest.jsonl')
  const m = new Map<string, ManifestRow>()
  if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) if (line.trim()) { const r = JSON.parse(line); m.set(r.url, r) }
  return m
}

export async function get(url: string, opts: { force?: boolean } = {}): Promise<{ row: ManifestRow; body?: Buffer }> {
  const u = new URL(url)
  if (!(u.hostname in DELAY_MS)) throw new Error(`Host not in crawl scope: ${u.hostname}`)
  if (DISALLOW[u.hostname].some((p) => u.pathname.startsWith(p))) return { row: { url, status: 0, retrievedAt: new Date().toISOString(), error: 'robots.txt disallow' } }
  const file = cachePath(url)
  const manifest = readManifest(u.hostname)
  const cached = manifest.get(url)
  if (!opts.force && cached && cached.status === 200 && existsSync(file)) return { row: cached, body: readFileSync(file) }
  const wait = (last[u.hostname] ?? 0) + DELAY_MS[u.hostname] - Date.now()
  if (wait > 0) await sleep(wait)
  last[u.hostname] = Date.now()
  let row: ManifestRow
  let body: Buffer | undefined
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(90_000) })
    body = Buffer.from(await res.arrayBuffer())
    row = { url, status: res.status, contentType: res.headers.get('content-type') ?? undefined, retrievedAt: new Date().toISOString() }
    if (res.ok) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, body)
      Object.assign(row, { sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length, file: file.slice(CRAWL_DIR.length + 1) })
    }
  } catch (e: any) {
    row = { url, status: 0, retrievedAt: new Date().toISOString(), error: String(e?.message ?? e) }
  }
  mkdirSync(join(CRAWL_DIR, u.hostname), { recursive: true })
  appendFileSync(join(CRAWL_DIR, u.hostname, 'manifest.jsonl'), JSON.stringify(row) + '\n')
  return { row, body }
}

export async function getJSON<T = any>(url: string): Promise<T | null> {
  const { row, body } = await get(url)
  return row.status === 200 && body ? JSON.parse(body.toString('utf8')) : null
}

const WP = 'https://orangetwpnjcc.org/wp-json/wp/v2'
async function wpAll(type: string, fields: string) {
  const out: any[] = []
  for (let page = 1; ; page++) {
    const batch = await getJSON<any[]>(`${WP}/${type}?per_page=100&page=${page}&orderby=id&order=asc&_fields=${fields}`)
    if (!batch?.length) break
    out.push(...batch) // WordPress may return short pages (hidden items); stop only on an empty page.
  }
  return out
}

async function council() {
  const pages = await wpAll('pages', 'id,slug,link,date,modified,title,content,parent')
  const posts = await wpAll('posts', 'id,slug,link,date,modified,title,content,excerpt,categories')
  const media = await wpAll('media', 'id,date,slug,link,title,mime_type,source_url,alt_text,post')
  const cats = await getJSON(`${WP}/categories?per_page=100&_fields=id,slug,name`)
  writeFileSync(join(CRAWL_DIR, 'orangetwpnjcc.org', 'index.json'), JSON.stringify({ retrievedAt: new Date().toISOString(), pages, posts, media, cats }))
  console.log(`council: ${pages.length} pages, ${posts.length} posts, ${media.length} media`)
}

async function orangenj() {
  const { body } = await get('https://orangenj.gov/sitemap.xml')
  const urls = [...(body?.toString('utf8') ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  let n = 0
  for (const url of urls) { const { row } = await get(url); n++; if (n % 10 === 0) console.log(`orangenj: ${n}/${urls.length} (last ${row.status} ${url})`) }
  console.log(`orangenj: done, ${urls.length} sitemap URLs`)
}

/** PDF links on council meeting pages from `fromYear` onward. */
async function pdfs(fromYear: number) {
  const idx = JSON.parse(readFileSync(join(CRAWL_DIR, 'orangetwpnjcc.org', 'index.json'), 'utf8'))
  const links = new Set<string>()
  for (const p of idx.pages) {
    const y = Number(p.slug.match(/^(\d{4})-meetings/)?.[1])
    if (!y || y < fromYear) continue
    for (const m of String(p.content.rendered).matchAll(/href="([^"]+\.pdf)"/gi)) links.add(m[1].replace(/&amp;/g, '&').replace(/^http:/, 'https:'))
  }
  let n = 0, ok = 0
  for (const url of links) {
    if (!url.includes('orangetwpnjcc.org')) continue
    const { row } = await get(url)
    n++; if (row.status === 200) ok++
    if (n % 50 === 0) console.log(`pdfs: ${n}/${links.size} (${ok} ok)`)
  }
  console.log(`pdfs: done, ${ok}/${links.size} downloaded`)
}

/** Only the MINUTES documents linked from council meeting pages for years [fromYear, toYear]. */
async function minutes(fromYear: number, toYear: number) {
  const idx = JSON.parse(readFileSync(join(CRAWL_DIR, 'orangetwpnjcc.org', 'index.json'), 'utf8'))
  const links = new Set<string>()
  for (const p of idx.pages) {
    const y = Number(p.slug.match(/^(\d{4})-meetings/)?.[1])
    if (!y || y < fromYear || y > toYear) continue
    for (const m of String(p.content.rendered).matchAll(/<a [^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = m[1].replace(/&amp;/g, '&').replace(/^http:/, 'https:')
      if (/minute/i.test(m[2]) || /minute/i.test(url)) links.add(url)
    }
  }
  let n = 0, ok = 0
  for (const url of links) {
    if (!url.includes('orangetwpnjcc.org')) continue
    const { row } = await get(url)
    n++; if (row.status === 200) ok++
    if (n % 50 === 0) console.log(`minutes: ${n}/${links.size} (${ok} ok)`)
  }
  console.log(`minutes: done, ${ok}/${links.size} downloaded`)
}

/** orangenj.gov module pages not in the sitemap: bid details, the full business directory, staff photos. */
async function orangenjExtras() {
  const cached = (u: string) => readFileSync(join(CRAWL_DIR, readManifest('orangenj.gov').get(u)!.file!), 'utf8')
  const urls = new Set<string>(['https://orangenj.gov/BusinessDirectoryii.aspx?ysnShowAll=1'])
  for (const m of cached('https://orangenj.gov/Bids.aspx').matchAll(/href="bids\.aspx\?bidID=(\d+)"/gi)) urls.add(`https://orangenj.gov/bids.aspx?bidID=${m[1]}`)
  for (const m of cached('https://orangenj.gov/Directory.aspx').matchAll(/src="(\/ImageRepository\/Document\?documentID=\d+)"/g)) urls.add(`https://orangenj.gov${m[1]}`)
  let n = 0
  for (const url of urls) { const { row } = await get(url); n++; console.log(`extras: ${n}/${urls.size} ${row.status} ${url}`) }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('crawl/fetch.ts')) {
  const [cmd, arg, arg2] = process.argv.slice(2)
  if (cmd === 'council') await council()
  else if (cmd === 'orangenj') await orangenj()
  else if (cmd === 'orangenj-extras') await orangenjExtras()
  else if (cmd === 'pdfs') await pdfs(Number(arg ?? 2024))
  else if (cmd === 'minutes') await minutes(Number(arg ?? 2008), Number(arg2 ?? 2023))
  else { console.error('usage: fetch.ts council | orangenj | pdfs <fromYear> | minutes <fromYear> <toYear>'); process.exit(1) }
}
