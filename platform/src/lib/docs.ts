/**
 * In-site document viewer for files published on the two official City sites. Neither can be framed
 * from here directly (orangenj.gov sends X-Frame-Options: SAMEORIGIN; this site's CSP allows only
 * same-origin frames), so files are streamed from this origin and shown in the viewer:
 *   orangenj.gov Document Center   /documents/orangenj/<id>/<name>   (file: /documents/orangenj/file/<id>)
 *   orangetwpnjcc.org uploads      /documents/view?u=<url>&t=<title>  (file: /documents/file?u=<url>)
 * Only those two hosts and paths are accepted, so the proxy cannot fetch anything else.
 */
export const ORANGENJ = 'https://orangenj.gov'

export function orangenjDocId(url: string): string | null {
  try {
    const u = new URL(url, ORANGENJ)
    if (!/^(www\.)?orangenj\.gov$/i.test(u.hostname)) return null
    return u.pathname.match(/^\/DocumentCenter\/View\/(\d+)/i)?.[1] ?? null
  } catch { return null }
}

/** A Council site upload (https://orangetwpnjcc.org/wp-content/uploads/…), normalized, else null. */
export function councilDocUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/^(www\.)?orangetwpnjcc\.org$/i.test(u.hostname)) return null
    if (!/^\/wp-content\/uploads\/[^?#]+\.(pdf|docx?|xlsx?|pptx?|jpe?g|png)$/i.test(u.pathname) || u.pathname.includes('..')) return null
    return `https://orangetwpnjcc.org${u.pathname}`
  } catch { return null }
}

/** True when the in-site viewer can show this document. */
export const viewable = (url: string) => !!(orangenjDocId(url) || councilDocUrl(url))

const slug = (label?: string) => (label ?? '').normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

/** In-site viewer path for a City document, else the URL unchanged. */
export function docHref(url: string, label?: string): string {
  const id = orangenjDocId(url)
  if (id) return `/documents/orangenj/${id}${slug(label) ? `/${slug(label)}` : ''}`
  const c = councilDocUrl(url)
  if (c) return `/documents/view?u=${encodeURIComponent(c)}${label ? `&t=${encodeURIComponent(label.slice(0, 160))}` : ''}`
  return url
}

/** Same-origin file URL for the viewer frame, or null when the document is not viewable here. */
export function docFileHref(url: string): string | null {
  const id = orangenjDocId(url)
  if (id) return `/documents/orangenj/file/${id}`
  const c = councilDocUrl(url)
  return c ? `/documents/file?u=${encodeURIComponent(c)}` : null
}

export const docFileUrl = (id: string) => `/documents/orangenj/file/${id}`
export const docOriginalUrl = (id: string) => `${ORANGENJ}/DocumentCenter/View/${id}`

/** Types the proxy passes through. Office files are sent as downloads; SVG/HTML never (same-origin script risk). */
export const INLINE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'])
export const DOWNLOAD_TYPES = new Set([
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export type DocProbe = { ok: boolean; status: number; type: string; inline: boolean; filename?: string }

/**
 * Ask for the first byte of the original file to decide between inline viewer and download.
 * (orangenj.gov answers HEAD requests with 404 even for files that exist.)
 */
export async function probeUrl(url: string): Promise<DocProbe> {
  try {
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store', headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(15_000) })
    await res.body?.cancel()
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const filename = res.headers.get('content-disposition')?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1]
    const known = INLINE_TYPES.has(type) || DOWNLOAD_TYPES.has(type)
    return { ok: res.ok && known, status: res.status, type, inline: INLINE_TYPES.has(type), filename: filename ? decodeURIComponent(filename) : undefined }
  } catch {
    return { ok: false, status: 0, type: '', inline: false }
  }
}
export const probeDoc = (id: string) => probeUrl(docOriginalUrl(id))

/** Stream an allowed original file from this origin (shared by both file routes). */
export async function streamDoc(original: string, fallbackName: string): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetch(original, { redirect: 'follow', signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'OrangePlatformPrototype/0.1 (document viewer)' } })
  } catch {
    return new Response('The City website did not respond. Please try again later.', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
  const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!upstream.ok || !upstream.body || !(INLINE_TYPES.has(type) || DOWNLOAD_TYPES.has(type))) {
    return new Response('This document is no longer available on the City website.', { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  }
  const raw = upstream.headers.get('content-disposition')?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1]
  const filename = (raw ? decodeURIComponent(raw) : fallbackName).replace(/[^\w.\- ]+/g, '_')
  const headers = new Headers({
    'Content-Type': type,
    'Content-Disposition': `${INLINE_TYPES.has(type) ? 'inline' : 'attachment'}; filename="${filename}"`,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    'X-Content-Type-Options': 'nosniff',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  return new Response(upstream.body, { status: 200, headers })
}
