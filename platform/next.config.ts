import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const tileOrigin = (() => { try { return process.env.NEXT_PUBLIC_MAP_STYLE_URL ? new URL(process.env.NEXT_PUBLIC_MAP_STYLE_URL).origin : '' } catch { return '' } })()
const isProd = process.env.NODE_ENV === 'production'
// Public-site CSP. 'unsafe-inline' scripts are required by Next.js hydration without
// per-request nonces; moving to nonces is tracked in docs/production-checklist.md.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org ${tileOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' https://tile.openstreetmap.org ${tileOrigin}${isProd ? '' : ' ws:'}`.trim(),
  "worker-src 'self' blob:",
  "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ')
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // CSP for the public site only; the Payload admin manages its own requirements.
      { source: '/((?!admin|api).*)', headers: [{ key: 'Content-Security-Policy', value: csp }] },
      // Never cache staff/admin/API responses in shared caches.
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/preview/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
