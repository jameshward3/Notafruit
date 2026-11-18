'use client'
/**
 * Search input with type-ahead suggestions (WAI-ARIA combobox, list autocomplete).
 * Arrow keys move through suggestions, Enter opens the highlighted one, Escape
 * closes the list. Without JavaScript it is a plain search input in its form.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import type { Strings } from '@/lib/strings'

type S = { label: string; detail: string; url: string; type: string }
const TYPE_LABEL: Record<string, string> = { official: 'Official', department: 'Department', legislation: 'Legislation', meeting: 'Meeting', notice: 'Notice', service: 'Service', project: 'Project', place: 'Place', dataset: 'Data', event: 'Event' }

export function SearchAutocomplete({ id, name = 'q', placeholder, defaultValue = '', s: strings }: { id: string; name?: string; placeholder?: string; defaultValue?: string; s?: Strings }) {
  const typeLabel = (t: string) => (strings as any)?.[`type_${t}`] ?? TYPE_LABEL[t] ?? t
  const router = useRouter()
  const listId = useId()
  const [value, setValue] = useState(defaultValue)
  const [items, setItems] = useState<S[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const abort = useRef<AbortController | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) return // short queries are cleared in onChange
    const t = setTimeout(async () => {
      abort.current?.abort()
      const ac = new AbortController()
      abort.current = ac
      try {
        const res = await fetch(`/search/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        const json = await res.json()
        setItems(json.suggestions ?? [])
        setOpen((json.suggestions ?? []).length > 0)
        setActive(-1)
      } catch { /* aborted or offline: keep the plain search working */ }
    }, 150)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (s: S) => { setOpen(false); router.push(s.url) }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length) }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)) }
    else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); go(items[active]) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  return (
    <div className="ac" ref={wrap}>
      <input
        id={id} name={name} type="search" placeholder={placeholder} value={value} autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setValue(e.target.value); if (e.target.value.trim().length < 2) { setItems([]); setOpen(false) } }} onKeyDown={onKey} onFocus={() => items.length && setOpen(true)}
      />
      <ul id={listId} role="listbox" className="ac__list" hidden={!open} aria-label={strings?.suggestions ?? 'Suggestions'}>
        {items.map((s, i) => (
          <li key={`${s.url}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : undefined}
            onMouseDown={(e) => { e.preventDefault(); go(s) }} onMouseEnter={() => setActive(i)}>
            <span className="ac__label">{s.label}</span>
            <span className="ac__meta"><span className="ac__type">{typeLabel(s.type)}</span>{s.detail && s.detail !== s.type ? ` ${s.detail.replace(new RegExp(`^${s.type}( · )?`), '')}` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">{open ? (strings?.suggestionsCount ?? '{n} suggestions available. Use up and down arrows to choose.').replace('{n}', String(items.length)) : ''}</p>
    </div>
  )
}
