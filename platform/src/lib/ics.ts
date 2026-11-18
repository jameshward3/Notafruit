/** Minimal RFC 5545 calendar serializer (UTC times, escaped text, folded lines). */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const dt = (d: string | Date) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const fold = (l: string) => l.length <= 74 ? l : l.match(/.{1,74}/g)!.join('\r\n ')
export type IcsEvent = { uid: string; start: string; end?: string | null; title: string; location?: string | null; url?: string; description?: string }
export function toIcs(events: IcsEvent[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//City of Orange Township//Platform prototype//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:City of Orange Township (prototype)']
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${dt(new Date())}`, `DTSTART:${dt(e.start)}`, `DTEND:${dt(e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600e3))}`, fold(`SUMMARY:${esc(e.title)}`))
    if (e.location) lines.push(fold(`LOCATION:${esc(e.location)}`))
    if (e.url) lines.push(fold(`URL:${e.url}`))
    if (e.description) lines.push(fold(`DESCRIPTION:${esc(e.description)}`))
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
