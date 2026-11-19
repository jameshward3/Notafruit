import { councilDocUrl, streamDoc } from '@/lib/docs'

/** GET /documents/file?u=<orangetwpnjcc.org upload URL> — served from this origin for the in-site viewer. Other hosts are refused. */
export async function GET(req: Request) {
  const u = councilDocUrl(new URL(req.url).searchParams.get('u') ?? '')
  if (!u) return new Response('Not found', { status: 404 })
  return streamDoc(u, decodeURIComponent(u.split('/').pop() ?? 'document'))
}
