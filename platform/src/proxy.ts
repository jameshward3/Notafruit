/**
 * Review gate for hosted prototype deployments: when SITE_PASSWORD is set, every
 * request needs HTTP Basic auth (any username, that password). Unset locally and
 * in a real production deployment behind the identity-aware proxy.
 */
import { NextResponse, type NextRequest } from 'next/server'

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()
  const header = req.headers.get('authorization') ?? ''
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      const given = decoded.slice(decoded.indexOf(':') + 1)
      if (safeEqual(given, password)) return NextResponse.next()
    } catch { /* malformed header: fall through */ }
  }
  return new NextResponse('This prototype is password-protected for review.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Orange platform prototype", charset="UTF-8"', 'Cache-Control': 'no-store' },
  })
}

export const config = {
  // Everything except the health check and Next.js build assets.
  matcher: ['/((?!data/health|_next/static|_next/image|favicon.ico).*)'],
}
