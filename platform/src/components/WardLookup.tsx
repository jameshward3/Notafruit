'use client'
/**
 * Address → ward. Suggests ZIP 07050 street addresses as you type (WAI-ARIA combobox);
 * picking one submits its exact location. Without JavaScript it is a plain form.
 */
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { findWard, type WardState } from '@/actions/ward'

type Suggestion = { id: number; label: string }

export function WardLookup() {
  const [state, action, pending] = useActionState<WardState, FormData>(findWard, { status: 'idle' })
  const listId = useId()
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState<Suggestion | null>(null)
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const abort = useRef<AbortController | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2 || picked?.label === value) return
    const t = setTimeout(async () => {
      abort.current?.abort()
      const ac = new AbortController()
      abort.current = ac
      try {
        const res = await fetch(`/address/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        const json = await res.json()
        setItems(json.suggestions ?? [])
        setOpen((json.suggestions ?? []).length > 0)
        setActive(-1)
      } catch { /* aborted or offline: the plain form still works */ }
    }, 120)
    return () => clearTimeout(t)
  }, [value, picked])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (s: Suggestion) => {
    setPicked(s); setValue(s.label); setOpen(false); setItems([])
    // Submit after React has written the hidden id into the form.
    setTimeout(() => form.current?.requestSubmit(), 0)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length) }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)) }
    else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(items[active]) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  return (
    <div>
      <form ref={form} action={action} className="field" role="search" aria-label="Find your ward">
        <label htmlFor="ward-address">Find your ward by address<span className="hint">Start typing your house number and street (Orange, NJ 07050). Your address is used only for this lookup and is not saved.</span></label>
        <div className="searchbar">
          <MapPin size={22} aria-hidden="true" />
          <div className="ac" ref={wrap} style={{ flex: 1 }}>
            <input
              id="ward-address" name="address" type="text" autoComplete="off" placeholder="e.g. 29 North Day Street" required minLength={5}
              role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
              aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
              value={value} onKeyDown={onKey} onFocus={() => items.length && setOpen(true)}
              onChange={(e) => { setValue(e.target.value); setPicked(null); if (e.target.value.trim().length < 2) { setItems([]); setOpen(false) } }}
            />
            <ul id={listId} role="listbox" className="ac__list" hidden={!open} aria-label="Matching addresses in 07050">
              {items.map((s, i) => (
                <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : undefined}
                  onMouseDown={(e) => { e.preventDefault(); choose(s) }} onMouseEnter={() => setActive(i)}>
                  <span className="ac__label">{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">{open ? `${items.length} matching addresses. Use up and down arrows to choose.` : ''}</p>
          </div>
          <input type="hidden" name="addressId" value={picked?.id ?? ''} />
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
