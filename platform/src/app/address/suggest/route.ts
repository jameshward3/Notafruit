import { suggestAddresses } from '@/lib/address'
import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'

/** GET /address/suggest?q=… → up to 8 ZIP 07050 street addresses (public NJOGIS data). The query is not logged. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const payload = await getClient()
  if (!(await rateLimit(payload, 'address-suggest', clientKey(req.headers), 120, 60)).allowed) {
    return Response.json({ suggestions: [] }, { status: 429, headers: { 'Retry-After': '60' } })
  }
  const suggestions = (await suggestAddresses(payload, q)).map(({ id, label }) => ({ id, label }))
  return Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
