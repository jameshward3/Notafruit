import { docOriginalUrl, streamDoc } from '@/lib/docs'

/** GET /documents/orangenj/file/<id> — a public orangenj.gov Document Center file, served from this origin for the in-site viewer. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d{1,7}$/.test(id)) return new Response('Not found', { status: 404 })
  return streamDoc(docOriginalUrl(id), `document-${id}`)
}
