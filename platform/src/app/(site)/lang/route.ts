import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/lib/i18n'

/** Sets the interface language cookie and returns to the same page (local paths only). */
export function GET(req: NextRequest) {
  const want = req.nextUrl.searchParams.get('to')
  const to = isLocale(want) ? want : 'en'
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const res = NextResponse.redirect(new URL(safe, req.nextUrl.origin), 303)
  res.cookies.set('lang', to, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, httpOnly: true })
  return res
}
