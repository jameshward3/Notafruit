import { notFound } from 'next/navigation'
import { DemoFlag } from '@/components/ui'
import { findOnePublic } from '@/lib/public'
import { fmtDate, fmtTime } from '@/lib/time'

export const dynamic = 'force-dynamic'

/** Printable HTML agenda (supplementary to the web page). */
export default async function PrintAgenda({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = await findOnePublic('meetings', { slug: { equals: slug } }, { depth: 1 })
  if (!m) notFound()
  return (
    <div className="container section prose">
      <p className="no-print"><a href={`/government/meetings/${m.slug}`}>Back to the meeting page</a> · Use your browser&rsquo;s Print command.</p>
      <h1>{m.title}</h1>
      <DemoFlag show={m.verificationStatus === 'demo'} text="Sample meeting" />
      <p>{fmtDate(m.startsAt)}, {fmtTime(m.startsAt)} — {m.location}</p>
      <ol style={{ listStyle: 'none', padding: 0 }}>{(m.agendaItems ?? []).map((a: any) => (
        <li key={a.number} style={{ marginBottom: 12 }}><strong>{a.number}. {a.title}</strong><br />{a.description}
          {a.legislation?.length > 0 && <ul>{a.legislation.map((l: any) => <li key={l.id}>{l.identifier} — {l.title}</li>)}</ul>}</li>
      ))}</ol>
      {m.participation && <p><strong>Public participation:</strong> {m.participation}</p>}
    </div>
  )
}
