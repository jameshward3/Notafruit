import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { suggest } from '@/lib/search'

/** GET /search/suggest?q=… → up to 8 type-ahead suggestions (public data only). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const payload = await getClient()
  if (!(await rateLimit(payload, 'suggest', clientKey(req.headers), Number(process.env.RATE_LIMIT_SUGGEST_PER_MINUTE ?? 120), 60)).allowed) {
    return Response.json({ suggestions: [] }, { status: 429, headers: { 'Retry-After': '60' } })
  }
  const suggestions = await suggest(payload, q)
  return Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
