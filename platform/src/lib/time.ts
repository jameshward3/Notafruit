/** All instants are stored in UTC and displayed in America/New_York. */
export const TZ = 'America/New_York'

/** Display language for dates: 'en' (default), 'es', or 'ht' (Haitian Creole, formatted here; ICU has no Creole calendar data). */
export type DateLang = 'en' | 'es' | 'ht'
const HT_DAYS = ['dimanch', 'lendi', 'madi', 'mèkredi', 'jedi', 'vandredi', 'samdi']
const HT_MONTHS = ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm']
const nyParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
  .formatToParts(d).map((p) => [p.type, p.value]))
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const fmtDate = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}, lang: DateLang = 'en') => {
  if (!d) return lang === 'es' ? 'No disponible' : lang === 'ht' ? 'Pa disponib' : 'Not available'
  const date = new Date(d)
  if (lang === 'ht') {
    const p = nyParts(date)
    const month = HT_MONTHS[Number(p.month) - 1]
    const base = `${Number(p.day)} ${opts.month === 'short' ? month.slice(0, 3) : month} ${p.year}`
    return opts.weekday === undefined && 'weekday' in opts ? base : `${HT_DAYS[WD.indexOf(p.weekday)]} ${base}`
  }
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...opts }).format(date)
}

export const fmtShortDate = (d: string | Date | null | undefined, lang: DateLang = 'en') =>
  fmtDate(d, { weekday: undefined, month: 'short' }, lang)

export const fmtTime = (d: string | Date | null | undefined, lang: DateLang = 'en') => {
  if (!d) return ''
  if (lang === 'ht') { const p = nyParts(new Date(d)); return `${p.hour}:${p.minute}` }
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}

/**
 * Civil date (YYYY-MM-DD) of an instant in America/New_York. Used for
 * date-only comparisons; DST-safe because it delegates to the tz database.
 */
export const civilDate = (d: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))

/** True when `now` falls in [startsAt, endsAt). Missing bounds are open. */
export const isActiveWindow = (startsAt?: string | null, endsAt?: string | null, now = new Date()) =>
  (!startsAt || new Date(startsAt) <= now) && (!endsAt || now < new Date(endsAt))

/** Request-time clock for server components (ISO string, optional offset in ms). */
export const requestNowIso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString()
