import Link from 'next/link'
import { AlertTriangle, FlaskConical, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>{items.map((i, n) => <li key={n}>{i.href && n < items.length - 1 ? <Link href={i.href}>{i.label}</Link> : <span aria-current={n === items.length - 1 ? 'page' : undefined}>{i.label}</span>}</li>)}</ol>
    </nav>
  )
}

export function PageBand({ eyebrow, title, children, crumbs }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: { href?: string; label: string }[] }) {
  return (
    <div className="band on-navy">
      <div className="container band__inner">
        <div>
          {crumbs && <Breadcrumbs items={crumbs} />}
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}

/** Labels illustrative content. Required wherever demo data renders. */
export function DemoFlag({ show = true, text = 'Illustrative data' }: { show?: boolean; text?: string }) {
  if (!show) return null
  return <span className="demo-flag"><FlaskConical size={16} aria-hidden="true" />{text}</span>
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'emergency' | 'success'; title: string; children?: ReactNode }) {
  const Icon = tone === 'info' || tone === 'success' ? Info : AlertTriangle
  return (
    <div className={`alert alert--${tone}`} role={tone === 'emergency' ? 'alert' : undefined}>
      <Icon size={22} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      <div><strong>{title}</strong>{children && <div>{children}</div>}</div>
    </div>
  )
}

const STATUS_TONE: Record<string, string> = {
  adopted: 'success', introduced: 'info', in_review: 'info', pending: 'neutral', tabled: 'warning', deferred: 'warning',
  defeated: 'error', withdrawn: 'neutral', vetoed: 'error',
  planned: 'neutral', design: 'info', bidding: 'info', awarded: 'info', construction: 'warning', substantially_complete: 'success', closed_out: 'success', on_hold: 'warning', cancelled: 'error',
}
export const human = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Not available')
export function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`badge badge--${STATUS_TONE[status ?? ''] ?? 'neutral'}`}>{human(status)}</span>
}

export function WardChip({ ward }: { ward: string }) {
  return <span className={`ward-chip ward-chip--${ward}`}>{human(ward)} Ward</span>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty" role="status"><strong>{title}</strong>{children && <div>{children}</div>}</div>
}
