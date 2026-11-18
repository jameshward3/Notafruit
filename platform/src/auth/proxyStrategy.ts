/**
 * Production staff sign-in (AUTH_MODE=proxy).
 *
 * The CMS sits behind an identity-aware proxy (e.g. oauth2-proxy) that
 * authenticates staff against the City's identity provider, where MFA is
 * enforced by policy. The proxy forwards the verified email plus a shared
 * secret. Users are NOT auto-provisioned: an administrator must create the
 * matching account and assign roles, so identity (IdP) and authorization
 * (CMS roles) stay coherent in one place.
 *
 * Security requirements (docs/architecture.md §Auth):
 *  - the app port must be reachable only from the proxy;
 *  - the proxy must strip any client-supplied X-Auth-* headers;
 *  - AUTH_PROXY_SHARED_SECRET must be long and random.
 */
import { timingSafeEqual } from 'node:crypto'
import type { AuthStrategy } from 'payload'

const safeEq = (a: string, b: string) => {
  const ab = Buffer.from(a), bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export const proxyStrategy: AuthStrategy = {
  name: 'identity-proxy',
  authenticate: async ({ headers, payload }) => {
    const secret = process.env.AUTH_PROXY_SHARED_SECRET
    const presented = headers.get('x-auth-proxy-secret')
    const email = headers.get('x-auth-request-email')?.toLowerCase()
    if (!secret || secret.length < 32 || !presented || !email || !safeEq(secret, presented)) return { user: null }
    const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
    const user = found.docs[0]
    if (!user) return { user: null }
    return { user: { ...user, collection: 'users', _strategy: 'identity-proxy' } }
  },
}
