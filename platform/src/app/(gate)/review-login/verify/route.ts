import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { GATE_COOKIE, GATE_MAX_AGE, GATE_PATH, gateEnabled, gateToken, safeEqual, safeNext } from '@/lib/siteGate'

/** POST /review-login/verify — checks the review password and sets the access cookie. */
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const next = safeNext(String(form.get('next') ?? '/'))
  if (!gateEnabled()) return NextResponse.redirect(new URL(next, req.url), 303)
  const back = (error: string) => {
    const url = new URL(GATE_PATH, req.url)
    url.searchParams.set('next', next)
    url.searchParams.set('error', error)
    return NextResponse.redirect(url, 303)
  }
  const payload = await getClient()
  if (!(await rateLimit(payload, 'review-gate', clientKey(req.headers), 10, 600)).allowed) return back('rate')
  // Pasted passwords often carry stray spaces or line breaks; compare the trimmed value.
  const given = String(form.get('password') ?? '').trim()
  if (!safeEqual(given, (process.env.SITE_PASSWORD ?? '').trim())) return back('1')
  const res = NextResponse.redirect(new URL(next, req.url), 303)
  res.cookies.set(GATE_COOKIE, await gateToken(), {
    httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: GATE_MAX_AGE,
  })
  return res
}
