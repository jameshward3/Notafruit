/**
 * Review gate for hosted prototype deployments: when SITE_PASSWORD is set, visitors
 * without a valid access cookie are sent to the in-site password page (/review-login).
 * Unset locally and in a real production deployment behind the identity-aware proxy.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { GATE_COOKIE, GATE_PATH, gateEnabled, gateToken, safeEqual } from '@/lib/siteGate'

export async function proxy(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next()
  const { pathname, search } = req.nextUrl
  if (pathname === GATE_PATH || pathname.startsWith(`${GATE_PATH}/`)) return NextResponse.next()
  const cookie = req.cookies.get(GATE_COOKIE)?.value ?? ''
  if (cookie && safeEqual(cookie, await gateToken())) return NextResponse.next()
  // Pages go to the password page; API and asset requests get a plain 401.
  const wantsPage = req.method === 'GET' && (req.headers.get('accept') ?? '').includes('text/html')
  if (wantsPage) {
    const url = new URL(GATE_PATH, req.url)
    url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url, 303)
  }
  return new NextResponse('This prototype is password-protected for review.', { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

export const config = {
  // Everything except the health check, Next.js build assets and the public brand files used on the password page.
  matcher: ['/((?!data/health|_next/static|_next/image|favicon.ico|assets/brand).*)'],
}
