import { upcomingCalendar } from '@/lib/calendar'
import { toIcs } from '@/lib/ics'
export const dynamic = 'force-dynamic'
export async function GET() {
  const site = process.env.PUBLIC_SITE_URL ?? ''
  const items = await upcomingCalendar(365)
  return new Response(toIcs(items.map((i) => ({ ...i, title: i.demo ? `[SAMPLE] ${i.title}` : i.title, url: `${site}${i.path}` }))), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}
