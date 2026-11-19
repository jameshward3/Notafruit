/**
 * Files published in the orangenj.gov Document Center. orangenj.gov refuses to be framed
 * (X-Frame-Options: SAMEORIGIN), so they are served through this site's own proxy
 * (/documents/orangenj/file/<id>) and shown in the in-site viewer (/documents/orangenj/<id>/<name>).
 */
export const ORANGENJ = 'https://orangenj.gov'

export function orangenjDocId(url: string): string | null {
  try {
    const u = new URL(url, ORANGENJ)
    if (!/^(www\.)?orangenj\.gov$/i.test(u.hostname)) return null
    return u.pathname.match(/^\/DocumentCenter\/View\/(\d+)/i)?.[1] ?? null
  } catch { return null }
}

/** In-site viewer path for a Document Center file, else the URL unchanged. */
export function docHref(url: string, label?: string): string {
  const id = orangenjDocId(url)
  if (!id) return url
  const name = (label ?? '').normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `/documents/orangenj/${id}${name ? `/${name}` : ''}`
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
export async function probeDoc(id: string): Promise<DocProbe> {
  try {
    const res = await fetch(docOriginalUrl(id), { redirect: 'follow', cache: 'no-store', headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(15_000) })
    await res.body?.cancel()
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const filename = res.headers.get('content-disposition')?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1]
    const known = INLINE_TYPES.has(type) || DOWNLOAD_TYPES.has(type)
    return { ok: res.ok && known, status: res.status, type, inline: INLINE_TYPES.has(type), filename: filename ? decodeURIComponent(filename) : undefined }
  } catch {
    return { ok: false, status: 0, type: '', inline: false }
  }
}
