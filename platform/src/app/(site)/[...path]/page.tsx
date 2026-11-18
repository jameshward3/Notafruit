import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { findOnePublic } from '@/lib/public'
export const dynamic = 'force-dynamic'
/** Old-URL redirect matrix (redirects collection); otherwise 404. */
export default async function CatchAll({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const from = '/' + path.map(decodeURIComponent).join('/')
  const r = await findOnePublic('redirects', { or: [{ from: { equals: from } }, { from: { equals: from.replace(/\/$/, '') } }] })
  if (!r || !r.to.startsWith('/')) notFound()
  if (r.statusCode === '302') redirect(r.to)
  if (r.statusCode === '410') notFound()
  permanentRedirect(r.to)
}
