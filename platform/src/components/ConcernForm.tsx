'use client'
import { useActionState } from 'react'
import { concernAction, type FormState } from '@/actions/public'

const CATS = [['pothole', 'Pothole or road surface'], ['streetlight', 'Streetlight out'], ['trash', 'Missed trash or recycling'], ['sidewalk', 'Sidewalk'], ['tree', 'Street tree'], ['other', 'Something else']]

export function ConcernForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(concernAction, { status: 'idle' })
  const v = (f: string) => (state.status === 'error' ? state.values?.[f] : undefined)
  const err = (f: string) => (state.status === 'error' ? state.errors?.find((e) => e.field === f)?.message : undefined)
  if (state.status === 'ok') return (
    <div className="alert alert--success" role="status" tabIndex={-1}>
      <div><strong>Request received — reference {state.reference}</strong><p>{state.message} Keep this reference number. This prototype is not yet connected to City dispatch; for anything urgent call City Hall, and for emergencies call 911.</p></div>
    </div>
  )
  const f = (name: string, label: string, hint?: string, type = 'text', required = false) => (
    <div className="field">
      <label htmlFor={name}>{label}{!required && ' (optional)'}{hint && <span className="hint">{hint}</span>}</label>
      {type === 'textarea' ? <textarea id={name} name={name} defaultValue={v(name)} required={required} aria-invalid={!!err(name)} aria-describedby={err(name) ? `${name}-err` : undefined} />
        : <input id={name} name={name} type={type} defaultValue={v(name)} required={required} aria-invalid={!!err(name)} aria-describedby={err(name) ? `${name}-err` : undefined} autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : undefined} />}
      {err(name) && <p id={`${name}-err`} className="field-error">{err(name)}</p>}
    </div>
  )
  return (
    <form action={action} noValidate key={state.status === 'error' ? JSON.stringify(state.values) : 'new'}>
      {state.status === 'error' && <div className="alert alert--warning" role="alert"><div><strong>{state.message}</strong>{state.errors && <ul>{state.errors.map((e) => <li key={e.field}><a href={`#${e.field}`}>{e.message}</a></li>)}</ul>}</div></div>}
      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend className="label">What is the problem?</legend>
        {CATS.map(([val, l]) => <label key={val} style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}><input type="radio" name="category" value={val} required defaultChecked={(v('category') ?? 'pothole') === val} /> {l}</label>)}
      </fieldset>
      {f('locationText', 'Where is it?', 'Street address or nearest intersection.', 'text', true)}
      {f('description', 'Describe the problem', 'At least 10 characters.', 'textarea', true)}
      {f('contactName', 'Your name')}
      {f('contactEmail', 'Email', 'Only used to follow up on this request.', 'email')}
      {f('contactPhone', 'Phone', undefined, 'tel')}
      <div aria-hidden="true" style={{ position: 'absolute', left: -10000 }}><label htmlFor="website">Leave empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Submit request'}</button>
    </form>
  )
}
