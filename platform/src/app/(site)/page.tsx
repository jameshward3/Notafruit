import Link from 'next/link'
import { ArrowRight, CalendarDays, CreditCard, FileText, Landmark, TrafficCone, Trash2, TriangleAlert, BarChart3 } from 'lucide-react'
import { HomeMap } from '@/components/HomeMap'
import { SearchAutocomplete } from '@/components/SearchAutocomplete'
import { Notice } from '@/components/ui'
import { WardLookup } from '@/components/WardLookup'
import { explorerData } from '@/lib/explorer'
import { getLocale, t, wardName } from '@/lib/i18n'
import { findPublic } from '@/lib/public'
import { selectHomepage } from '@/lib/seasonal'
import { fmtDate, fmtTime } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const locale = await getLocale()
  const s = t(locale)
  const now = new Date()
  const [notices, features, meetings, map] = await Promise.all([
    findPublic('notices', { sort: '-publishedAt', limit: 20, locale }),
    findPublic('seasonal-features', { limit: 20, locale, depth: 1 }),
    findPublic('meetings', { where: { startsAt: { greater_than_equal: new Date(now.getTime() - 864e5).toISOString() } }, sort: 'startsAt', limit: 3 }),
    explorerData(),
  ])
  const { emergencies, feature } = selectHomepage(features.docs as any[], notices.docs as any[], now)
  const routine = (notices.docs as any[]).filter((n) => n.kind !== 'emergency').slice(0, 4)
  const TASKS = [
    { href: '/services/pay-a-bill', label: s.taskPay, icon: CreditCard },
    { href: '/services/permits-and-licenses', label: s.taskPermits, icon: FileText },
    { href: '/report-a-concern', label: s.taskReport, icon: TriangleAlert },
    { href: '/services/trash-and-recycling', label: s.taskTrash, icon: Trash2 },
    { href: '/government/meetings', label: s.taskMeetings, icon: CalendarDays },
  ]

  return (
    <>
      {emergencies.length > 0 && (
        <div className="container section--tight">
          {emergencies.map((e: any) => (
            <Notice key={e.id} tone="emergency" title={e.title}><p>{e.summary} <Link href={`/notices/${e.slug}`}>{s.details}</Link></p></Notice>
          ))}
        </div>
      )}
      {s.translationDraft && <div className="container section--tight"><p className="meta" lang={locale}>{s.translationDraft}</p></div>}
      <section className="hero on-navy" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">{s.heroEyebrow}</p>
          <h1 id="hero-title">{s.heroTitle1}<br />{s.heroTitle2}</h1>
          <p>{s.heroBody}</p>
          <form action="/search" role="search" aria-label={s.searchSiteLabel}>
            <label htmlFor="home-q" className="sr-only">{s.heroAsk}</label>
            <div className="searchbar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <SearchAutocomplete id="home-q" placeholder={s.heroAsk} s={s} />
              <button className="btn btn--gold" type="submit">{s.searchSubmit}</button>
            </div>
          </form>
        </div>
        <div className="hero__media hero__media--map">
          <HomeMap boundary={map.boundary} wards={(map.wards?.fc as any) ?? null} stats={map.stats?.stats ?? []} places={map.pts as any} reps={map.reps} s={s} />
        </div>
      </section>
      <nav className="tasks" aria-label={s.commonTasks}>
        <ul>{TASKS.map(({ href, label, icon: Icon }) => (
          <li key={href}><Link href={href}><Icon className="lead" size={30} aria-hidden="true" /><span>{label}</span><ArrowRight className="arrow" size={22} aria-hidden="true" /></Link></li>
        ))}</ul>
      </nav>

      {feature && (
        <div className="container section--tight">
          <div className="panel panel--warm">
            <p className="eyebrow">{s.thisSeason}</p>
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>{feature.title}</h2>
            <p>{feature.message}</p>
            {feature.linkUrl && <Link className="cta-link" href={feature.linkUrl}>{feature.linkLabel ?? s.learnMore} <ArrowRight size={18} aria-hidden="true" /></Link>}
          </div>
        </div>
      )}

      <section className="container section" aria-labelledby="inview">
        <h2 id="inview" className="rule-heading" style={{ fontSize: 'var(--fs-h1)' }}>{s.inView}</h2>
        <div className="grid grid-3">
          {[
            { eyebrow: s.featMeetingsEyebrow, title: s.featMeetingsTitle, body: s.featMeetingsBody, href: '/government/meetings', cta: s.featMeetingsCta, Icon: Landmark },
            { eyebrow: s.featBudgetEyebrow, title: s.featBudgetTitle, body: s.featBudgetBody, href: '/transparency/budget', cta: s.featBudgetCta, Icon: BarChart3 },
            { eyebrow: s.featProjectsEyebrow, title: s.featProjectsTitle, body: s.featProjectsBody, href: '/projects', cta: s.featProjectsCta, Icon: TrafficCone },
          ].map(({ eyebrow, title, body, href, cta, Icon }) => (
            <article key={href} className="feature">
              <div className="feature__img" aria-hidden="true"><Icon size={56} strokeWidth={1.5} /></div>
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h3><Link href={href}>{title}</Link></h3>
                <p>{body}</p>
                <Link className="cta-link" href={href}>{cta} <ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface-cool)' }} aria-labelledby="wards">
        <div className="container layout-side">
          <div>
            <h2 id="wards">{s.wardsTitle}</h2>
            <p className="lede">{s.wardsLede}</p>
            <WardLookup />
          </div>
          <div>
            <h3>{s.browseByWard}</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
              {['north', 'south', 'east', 'west'].map((w) => <li key={w}><Link href={`/explore?ward=${w}`}><span className={`ward-chip ward-chip--${w}`}>{wardName(s, w)}</span></Link></li>)}
            </ul>
            <p className="meta">{s.wardsNote}</p>
          </div>
        </div>
      </section>

      <div className="container section grid grid-2">
        <section aria-labelledby="upcoming">
          <h2 id="upcoming">{s.upcomingMeetings}</h2>
          {meetings.docs.length === 0 ? <p>{s.noUpcoming} <Link href="/government/meetings">{s.seeAllMeetings}</Link>.</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {(meetings.docs as any[]).map((m) => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--divider)', padding: '12px 0' }}>
                  <Link href={`/government/meetings/${m.slug}`}><strong>{m.title}</strong></Link>
                  <div className="meta">{fmtDate(m.startsAt, {}, locale)}{m.timeConfirmed === false ? '' : ` · ${fmtTime(m.startsAt, locale)}`} · {m.location}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="news">
          <h2 id="news">{s.notices}</h2>
          {routine.length === 0 ? <p>{s.noNotices}</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {routine.map((n) => (
                <li key={n.id} style={{ borderBottom: '1px solid var(--divider)', padding: '12px 0' }}>
                  <Link href={`/notices/${n.slug}`}><strong>{n.title}</strong></Link>
                  <div className="meta">{n.summary}</div>
                </li>
              ))}
            </ul>
          )}
          <Link className="cta-link" href="/notices">{s.allNotices} <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </div>
    </>
  )
}
