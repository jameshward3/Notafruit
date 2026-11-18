import { describe, expect, it } from 'vitest'
import { assertPublicUrl, checkLink, isPrivateAddress } from '@/lib/linkcheck'

describe('link checker SSRF guard', () => {
  it('classifies private, loopback, link-local, CGNAT, metadata and IPv6 local ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1'])
      expect(isPrivateAddress(ip), ip).toBe(true)
    for (const ip of ['8.8.8.8', '151.101.1.69', '2606:4700::6810:84e5']) expect(isPrivateAddress(ip), ip).toBe(false)
  })
  it('rejects non-http schemes, credentials, odd ports and private literal hosts before any request', async () => {
    for (const u of ['file:///etc/passwd', 'ftp://example.com', 'http://user:pw@example.com', 'http://example.com:8080/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data'])
      await expect(assertPublicUrl(u), u).rejects.toThrow()
  })
  it('re-validates every redirect hop (a public URL redirecting to a private address is blocked)', async () => {
    const calls: string[] = []
    const fakeFetch = (async (url: string) => {
      calls.push(url)
      return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } })
    }) as unknown as typeof fetch
    const r = await checkLink('http://8.8.8.8/', fakeFetch)
    expect(r.status).toBe('blocked')
    expect(calls).toEqual(['http://8.8.8.8/']) // never requested the private target
  })
  it('reports broken links from the final response', async () => {
    const r = await checkLink('http://8.8.8.8/x', (async () => new Response(null, { status: 404 })) as unknown as typeof fetch)
    expect(r).toMatchObject({ status: 'broken', httpStatus: 404 })
  })
})
