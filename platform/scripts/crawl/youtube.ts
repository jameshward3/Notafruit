/**
 * Lists every public video and past live stream on the City's YouTube channel (@OrangeTwpNJ,
 * "Orange Tv") and attaches City Council meeting videos to the matching meetings (by the date in
 * the video title) as embedded "video" documents. Idempotent.
 *
 *   tsx scripts/crawl/youtube.ts            # fetch list + attach
 *   tsx scripts/crawl/youtube.ts --cached   # attach from the last saved list
 *
 * Reads the same public pages a browser loads (channel tabs and their "load more" continuation).
 * The list is saved to private-uploads/crawl/youtube/orange-tv.json.
 */
import 'dotenv/config'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { CRAWL_DIR } from './fetch'

const CHANNEL = 'https://www.youtube.com/@OrangeTwpNJ'
const FILE = join(CRAWL_DIR, 'youtube', 'orange-tv.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
type Video = { id: string; title: string; tab: string }

function collect(o: any, out: Video[], tab: string, cont: string[]) {
  if (!o || typeof o !== 'object') return
  if (o.lockupViewModel?.contentId && o.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
    out.push({ id: o.lockupViewModel.contentId, title: o.lockupViewModel.metadata?.lockupMetadataViewModel?.title?.content ?? '', tab })
  }
  if (o.videoRenderer?.videoId) out.push({ id: o.videoRenderer.videoId, title: (o.videoRenderer.title?.runs ?? []).map((r: any) => r.text).join(''), tab })
  if (o.richItemRenderer?.content?.videoRenderer) { /* handled by recursion */ }
  const token = o.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
  if (token) cont.push(token)
  for (const k in o) collect(o[k], out, tab, cont)
}

async function listTab(tab: 'videos' | 'streams'): Promise<Video[]> {
  const html = await (await fetch(`${CHANNEL}/${tab}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US' } })).text()
  const data = JSON.parse(html.match(/var ytInitialData = (\{.*?\});<\/script>/s)![1])
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? '2.20241101.00.00'
  const out: Video[] = []
  let cont: string[] = []
  collect(data, out, tab, cont)
  for (let page = 0; cont.length && key && page < 40; page++) {
    await sleep(1500)
    const token = cont.shift()!
    const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion, hl: 'en' } }, continuation: token }),
    })
    const next: string[] = []
    collect(await res.json(), out, tab, next)
    cont = next
  }
  return out
}

let videos: Video[]
if (process.argv.includes('--cached') && existsSync(FILE)) videos = JSON.parse(readFileSync(FILE, 'utf8'))
else {
  const all = [...await listTab('streams'), ...await listTab('videos')]
  const seen = new Set<string>()
  videos = all.filter((v) => v.id && !seen.has(v.id) && seen.add(v.id))
  mkdirSync(join(CRAWL_DIR, 'youtube'), { recursive: true })
  writeFileSync(FILE, JSON.stringify(videos, null, 1))
}
console.log(`channel: ${videos.length} videos (${videos.filter((v) => v.tab === 'streams').length} live streams)`)

// ------------------------------------------------------------------ match to meetings
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
function dateOf(title: string): string | null {
  // "June 17th, 2025", "Sept 03, 2024", "JAN 3   2019"
  const m = title.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i)
  if (m) return `${m[3]}-${String(MONTHS.findIndex((x) => x.startsWith(m[1].toLowerCase())) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const n = title.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/)
  if (n) return `${n[3].length === 2 ? `20${n[3]}` : n[3]}-${n[1].padStart(2, '0')}-${n[2].padStart(2, '0')}`
  return null
}
const isCouncil = (t: string) => /council|budget hearing|budget meeting/i.test(t) && !/\btrim\b|promo|flag raising/i.test(t)

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const meetings = (await payload.find({ collection: 'meetings', where: { slug: { like: 'council-' } }, limit: 5000, depth: 0, overrideAccess: true, select: { slug: true, documents: true } as any })).docs as any[]
const bySlugDate = new Map<string, any[]>()
for (const m of meetings) { const d = m.slug.match(/council-(\d{4}-\d{2}-\d{2})/)?.[1]; if (d) (bySlugDate.get(d) ?? bySlugDate.set(d, []).get(d)!).push(m) }

let attached = 0, unmatched: string[] = []
for (const v of videos.filter((x) => isCouncil(x.title))) {
  const d = dateOf(v.title)
  const targets = d ? bySlugDate.get(d) ?? [] : []
  if (!targets.length) { unmatched.push(`${d ?? '????'} ${v.title}`); continue }
  const url = `https://www.youtube.com/watch?v=${v.id}`
  for (const m of targets) {
    const docs = (m.documents ?? []).filter((x: any) => !(x.kind === 'video' && /youtube\.com\/watch\?v=/.test(x.url) && x.url !== url))
    if (docs.some((x: any) => x.url === url)) continue
    await payload.update({ collection: 'meetings', id: m.id, data: { documents: [...docs.map(({ id, ...rest }: any) => rest), { label: `Video: ${v.title}`, kind: 'video', url }] }, ...sys } as any)
    m.documents = [...docs, { label: `Video: ${v.title}`, kind: 'video', url }]
    attached++
  }
}
console.log(`attached ${attached} meeting videos; ${unmatched.length} council videos had no meeting record:`)
for (const u of unmatched.slice(0, 40)) console.log(`  ${u}`)
process.exit(0)
