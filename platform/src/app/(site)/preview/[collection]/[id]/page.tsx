/**
 * Staff draft preview. Requires a signed-in staff session (expires with the
 * session); reads through collection access rules AS THAT USER, so a
 * contributor can only preview what they may already read. Never cached,
 * never indexed, never linked publicly.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { CollectionSlug } from 'payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Notice, PageBand, StatusBadge, human } from '@/components/ui'
import { formatCents } from '@/lib/money'
import { getClient } from '@/lib/payload'
import { fmtDate, fmtShortDate, fmtTime } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }
const PREVIEWABLE = ['notices', 'services', 'events', 'seasonal-features', 'project-updates', 'meetings', 'legislation', 'votes', 'projects', 'budget-datasets', 'places'] as const

export default async function Preview({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params
  if (!(PREVIEWABLE as readonly string[]).includes(collection) || !/^\d+$/.test(id)) notFound()
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || (user as any).collection !== 'users') {
    return (<div className="container section prose"><h1>Sign in to preview</h1><p>Draft previews are only available to signed-in City staff. <Link href="/admin/login">Staff sign-in</Link></p></div>)
  }
  const doc: any = await payload.findByID({ collection: collection as CollectionSlug, id: Number(id), user, overrideAccess: false, depth: 1, disableErrors: true })
  if (!doc) notFound()
  const title = doc.title ?? doc.identifier ?? doc.name ?? doc.motion ?? `${human(collection)} ${id}`
  return (
    <>
      <PageBand eyebrow={`Preview · ${human(collection)}`} title={title} />
      <div className="container section prose">
        <Notice tone="warning" title={`Preview — ${human(doc.workflowStatus)}. Not visible to the public${doc.workflowStatus === 'published' ? ' in this exact form until saved' : ''}.`}>
          <p>Verification: {human(doc.verificationStatus)}. {doc.publishAt ? `Scheduled for ${fmtDate(doc.publishAt)} ${fmtTime(doc.publishAt)}. ` : ''}{doc.expiresAt ? `Expires ${fmtDate(doc.expiresAt)} ${fmtTime(doc.expiresAt)}.` : ''}</p>
        </Notice>
        {doc.summary && <p className="lede">{doc.summary}</p>}
        {doc.message && <p className="lede">{doc.message}</p>}
        {doc.body && typeof doc.body === 'object' && <RichText data={doc.body} />}
        {typeof doc.body === 'string' && <p>{doc.body}</p>}
        {doc.scope && <><h2>Scope</h2><p>{doc.scope}</p><p>Status: <StatusBadge status={doc.phase} /> · Estimated cost {formatCents(doc.cost?.estimatedCents)}</p></>}
        {doc.startsAt && <p><strong>When:</strong> {fmtDate(doc.startsAt)} {fmtTime(doc.startsAt)}{doc.location ? ` — ${doc.location}` : ''}</p>}
        {doc.agendaItems?.length > 0 && <><h2>Agenda</h2><ol>{doc.agendaItems.map((a: any) => <li key={a.id}><strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ''}</li>)}</ol></>}
        {doc.textVersions?.map((v: any) => <section key={v.id}><h2>{v.label}</h2><div className="legal-text">{v.text}</div></section>)}
        {doc.actions?.length > 0 && <><h2>Actions</h2><ul>{doc.actions.map((a: any) => <li key={a.id}>{fmtShortDate(a.date)} — {human(a.action)}</li>)}</ul></>}
        {doc.entries?.length > 0 && <><h2>Roll call ({human(doc.result)})</h2><ul>{doc.entries.map((e: any) => <li key={e.id}>{e.member}: {human(e.vote)}</li>)}</ul></>}
        <p className="meta">Last saved {fmtShortDate(doc.updatedAt)}. <Link href={`/admin/collections/${collection}/${id}`}>Back to the editor</Link></p>
      </div>
    </>
  )
}
