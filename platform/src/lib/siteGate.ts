/**
 * Review gate for hosted prototype deployments (enabled when SITE_PASSWORD is set).
 * The access cookie holds a SHA-256 fingerprint of the password + PAYLOAD_SECRET,
 * never the password itself; changing either value signs everyone out.
 * Web Crypto only, so it runs in the proxy and in route handlers.
 */
export const GATE_COOKIE = 'site_access'
export const GATE_PATH = '/review-login'
export const GATE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const gateEnabled = () => !!process.env.SITE_PASSWORD

export async function gateToken(): Promise<string> {
  const data = new TextEncoder().encode(`site-gate:${process.env.SITE_PASSWORD ?? ''}:${process.env.PAYLOAD_SECRET ?? ''}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Only same-site paths may be used as the post-login destination. */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith(GATE_PATH) ? next : '/'
