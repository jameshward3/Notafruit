'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Accessibility, Globe, Menu, Search } from 'lucide-react'
import type { Locale, Strings } from '@/lib/strings'
import { SearchAutocomplete } from './SearchAutocomplete'

export const NAV = [
  { href: '/services', key: 'services' },
  { href: '/explore', key: 'explore' },
  { href: '/government', key: 'government' },
  { href: '/government/meetings', key: 'meetings' },
  { href: '/business', key: 'business' },
  { href: '/transparency', key: 'transparency' },
  { href: '/projects', key: 'projects' },
] as const

const LANGS: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ht', label: 'Kreyòl ayisyen' },
]

export function Masthead({ s, locale }: { s: Strings; locale: Locale }) {
  const path = usePathname() ?? '/'
  const menuRef = useRef<HTMLDetailsElement>(null)
  const langRef = useRef<HTMLDetailsElement>(null)
  // Close the menus after navigation, and on Escape (returning focus to the toggle).
  useEffect(() => { if (menuRef.current) menuRef.current.open = false; if (langRef.current) langRef.current.open = false }, [path])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      for (const d of [menuRef.current, langRef.current]) if (e.key === 'Escape' && d?.open) { d.open = false; d.querySelector('summary')?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const current = (href: string) => {
    const match = NAV.filter((n) => path === n.href || path.startsWith(n.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]
    return match?.href === href ? 'page' : undefined
  }
  const langHref = (to: Locale) => `/lang?to=${to}&next=${encodeURIComponent(path)}`
  const isHome = path === '/'
  const links = NAV.map((n) => (
    <li key={n.href}><Link href={n.href} aria-current={current(n.href)}>{s[n.key]}</Link></li>
  ))
  const langList = (
    <ul className="langlist">
      {LANGS.map((l) => (
        <li key={l.code}>
          {l.code === locale
            ? <span aria-current="true" lang={l.code}>{l.label}</span>
            : <a href={langHref(l.code)} lang={l.code} hrefLang={l.code}>{l.label}</a>}
        </li>
      ))}
    </ul>
  )
  return (
    <header className="masthead">
      <div className="container masthead__inner">
        {/* Official seal from orangenj.gov, unmodified (docs/asset-manifest.json). Decorative here: the text names the City. */}
        <Link href="/" className="wordmark">
          <img className="wordmark__seal" src="/assets/brand/city-seal.png" alt="" width={80} height={80} />
          <span className="wordmark__rule" aria-hidden="true" />
          <span className="wordmark__text">
            <span className="wordmark__small">CITY OF</span>
            <span className="wordmark__name">ORANGE TOWNSHIP</span>
            {/* Accessible name is "City of Orange Township home" (guide §2); the state line is visual only. */}
            <span className="wordmark__state" aria-hidden="true">NEW JERSEY</span>
            <span className="sr-only"> home</span>
          </span>
        </Link>
        <div className="mast-right">
          <div className="utility">
            <details className="langmenu" ref={langRef}>
              <summary aria-label={`${s.chooseLanguage}: ${LANGS.find((l) => l.code === locale)?.label}`}><Globe size={20} aria-hidden="true" />{LANGS.find((l) => l.code === locale)?.label}</summary>
              <div className="langmenu__panel" role="group" aria-label={s.chooseLanguage}>{langList}</div>
            </details>
            <span className="sep" aria-hidden="true" />
            <Link href="/accessibility"><Accessibility size={20} aria-hidden="true" />{s.accessibility}</Link>
            {isHome && <><span className="sep" aria-hidden="true" /><Link href="/search"><Search size={20} aria-hidden="true" />{s.search}</Link></>}
          </div>
          {!isHome && (
            <form action="/search" role="search" aria-label={s.searchSiteLabel} className="mastsearch">
              <label htmlFor="mast-q" className="sr-only">{s.searchSiteLabel}</label>
              <Search size={18} aria-hidden="true" className="mastsearch__icon" />
              <SearchAutocomplete id="mast-q" placeholder={s.searchPlaceholder} s={s} />
              <button className="btn btn--gold mastsearch__btn" type="submit">{s.searchSubmit}</button>
            </form>
          )}
          <nav className="mainnav" aria-label="Main"><ul>{links}</ul></nav>
          <details className="menu-toggle" ref={menuRef}>
            <summary><Menu size={20} aria-hidden="true" />{s.menu}</summary>
            <nav aria-label="Main (mobile)"><ul className="menu-panel">{links}
              <li className="menu-utility"><span className="label">{s.language}</span>{langList}</li>
              <li className="menu-utility"><Link href="/accessibility">{s.accessibility}</Link></li>
              <li className="menu-utility"><Link href="/search">{s.search}</Link></li>
            </ul></nav>
          </details>
        </div>
      </div>
    </header>
  )
}
