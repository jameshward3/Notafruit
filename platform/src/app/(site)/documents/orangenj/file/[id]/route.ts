import { DOWNLOAD_TYPES, INLINE_TYPES, docOriginalUrl } from '@/lib/docs'

/**
 * GET /documents/orangenj/file/<id> — streams a public orangenj.gov Document Center file from
 * this site's origin so the in-site viewer can frame it. Only PDFs, raster images and Office
 * files pass; anything else (HTML error pages, SVG) is refused. Shared caches keep it a day.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d{1,7}$/.test(id)) return new Response('Not found', { status: 404 })
  let upstream: Response
  try {
    upstream = await fetch(docOriginalUrl(id), { redirect: 'follow', signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'OrangePlatformPrototype/0.1 (document viewer)' } })
  } catch {
    return new Response('The City website did not respond. Please try again later.', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
  const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!upstream.ok || !upstream.body || !(INLINE_TYPES.has(type) || DOWNLOAD_TYPES.has(type))) {
    return new Response('This document is no longer available on the City website.', { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  }
  const raw = upstream.headers.get('content-disposition')?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1]
  const filename = (raw ? decodeURIComponent(raw) : `document-${id}`).replace(/[^\w.\- ]+/g, '_')
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
