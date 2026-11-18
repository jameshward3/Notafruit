/**
 * Outbound link checker for editor-entered URLs (style guide §10 "link checks").
 * SSRF-guarded: http(s) only, default ports only, every hop (including redirects)
 * must resolve exclusively to public unicast addresses. Production should also
 * route egress through a proxy; DNS re-resolution between check and connect is a
 * residual risk documented in docs/architecture.md.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export type LinkResult = { status: 'ok' | 'broken' | 'blocked' | 'error'; httpStatus?: number; finalUrl?: string; detail?: string }

const v4Private = (ip: string) => {
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
}
const v6Private = (ip: string) => {
  const s = ip.toLowerCase()
  if (s.startsWith('::ffff:')) return v4Private(s.slice(7))
  return s === '::' || s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb') || s.startsWith('ff')
}
export const isPrivateAddress = (ip: string) => (isIP(ip) === 6 ? v6Private(ip) : v4Private(ip))

export async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw)
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Only http and https links are checked.')
  if (u.username || u.password) throw new Error('Links with credentials are not allowed.')
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('Non-standard ports are not checked.')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true })
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error('Link resolves to a private or reserved address.')
  return u
}

export async function checkLink(raw: string, fetchImpl: typeof fetch = fetch): Promise<LinkResult> {
  let url = raw
  for (let hop = 0; hop < 4; hop++) {
    try {
      await assertPublicUrl(url)
    } catch (e) {
      return { status: 'blocked', detail: (e as Error).message, finalUrl: url }
    }
    try {
      let res = await fetchImpl(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'municipal-link-checker' } })
      if (res.status === 405 || res.status === 403) res = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'municipal-link-checker' } })
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location')!, url).toString(); continue }
      return { status: res.ok ? 'ok' : 'broken', httpStatus: res.status, finalUrl: url }
    } catch (e) {
      return { status: 'error', detail: (e as Error).message.slice(0, 200), finalUrl: url }
    }
  }
  return { status: 'broken', detail: 'Too many redirects', finalUrl: url }
}
