'use client'
import { useActionState } from 'react'
import { subscribeAction, type FormState } from '@/actions/public'

export function SubscribeForm({ topicType, topicId = '*' }: { topicType: 'notices' | 'meetings' | 'project'; topicId?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeAction, { status: 'idle' })
  const id = `sub-${topicType}-${topicId}`
  return (
    <form action={action}>
      <input type="hidden" name="topicType" value={topicType} />
      <input type="hidden" name="topicId" value={topicId} />
      <div className="field">
        <label htmlFor={id}>Email address<span className="hint">We will ask you to confirm. Unsubscribe any time.</span></label>
        <input id={id} name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn btn--secondary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Subscribe'}</button>
      <div aria-live="polite">{state.status !== 'idle' && <p className={state.status === 'ok' ? 'meta' : 'field-error'}>{state.message}</p>}</div>
    </form>
  )
}
