import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'

export async function GovTabs({ current }: { current: 'meetings' | 'legislation' | 'votes' | 'notices' | 'open' }) {
  const L = t(await getLocale())
  const tabs = [
    ['meetings', L.meetingsTitle, '/government/meetings'], ['legislation', L.legislation, '/government/legislation'],
    ['votes', L.votes, '/government/legislation?view=votes'], ['open', L.openGov, '/government/open'], ['notices', L.publicNotices, '/notices'],
  ] as const
  return <nav className="tabs" aria-label={L.meetingRecords}>{tabs.map(([k, l, h]) => <Link key={k} href={h} aria-current={current === k ? 'page' : undefined}>{l}</Link>)}</nav>
}
