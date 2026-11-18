'use client'
/** Editor warning about incomplete sourcing (style guide §10). Advisory: it does not block saving. */
import { useFormFields } from '@payloadcms/ui'

export function SourceWarning() {
  const sources = useFormFields(([fields]) => fields.sources?.value) as unknown[] | undefined
  const verification = useFormFields(([fields]) => fields.verificationStatus?.value) as string | undefined
  const hasSourcesField = useFormFields(([fields]) => 'sources' in fields)
  const problems: string[] = []
  if (hasSourcesField && (!Array.isArray(sources) || sources.length === 0)) problems.push('No source record is linked. Add where these facts came from.')
  if (verification === 'unverified') problems.push('Facts are marked unverified. Check them against an official source before publishing.')
  if (verification === 'needs_review') problems.push('A discrepancy is recorded. Resolve it with the responsible office before publishing.')
  if (verification === 'demo') problems.push('This is illustrative demo content. It will be labeled as a sample on the public site.')
  if (!problems.length) return null
  return (
    <div role="note" style={{ border: '2px solid #785A16', background: '#FFF3D6', color: '#17283A', padding: '12px 16px', margin: '0 0 16px', borderRadius: 2 }}>
      <strong>Before publishing</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  )
}
