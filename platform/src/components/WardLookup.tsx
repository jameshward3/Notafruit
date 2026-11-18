'use client'
import { useActionState } from 'react'
import { MapPin } from 'lucide-react'
import { findWard, type WardState } from '@/actions/ward'

export function WardLookup() {
  const [state, action, pending] = useActionState<WardState, FormData>(findWard, { status: 'idle' })
  return (
    <div>
      <form action={action} className="field" role="search" aria-label="Find your ward">
        <label htmlFor="ward-address">Find your ward by address<span className="hint">Your address is used only for this lookup and is not saved.</span></label>
        <div className="searchbar">
          <MapPin size={22} aria-hidden="true" />
          <input id="ward-address" name="address" type="text" autoComplete="street-address" placeholder="e.g. 29 North Day Street" required minLength={5} />
          <button className="btn" type="submit" disabled={pending}>{pending ? 'Looking up…' : 'Find ward'}</button>
        </div>
      </form>
      <div aria-live="polite">
        {state.status === 'done' && (
          <div className={`alert alert--${state.tone === 'success' ? 'success' : state.tone === 'warning' ? 'warning' : 'info'}`}>
            <div>
              <strong>{state.title}</strong>
              <p>{state.message}</p>
              {state.ward && <p><a href={`/explore/wards/${state.ward}`}>View the {state.ward} ward page</a></p>}
              {state.options && <ul>{state.options.map((o) => <li key={o}>{o}</li>)}</ul>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
