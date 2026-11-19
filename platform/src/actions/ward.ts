'use server'
import { headers } from 'next/headers'
import { addressById, exactAddress } from '@/lib/address'
import { geocode } from '@/lib/geocode'
import { lookupWard } from '@/lib/gis'
import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'

export type WardState = { status: 'idle' } | { status: 'done'; title: string; message: string; tone: 'success' | 'info' | 'warning'; ward?: string; options?: string[] }

const cap = (w: string) => `${w[0].toUpperCase()}${w.slice(1)}`

/** Address → ward. Raw addresses are not logged or stored. */
export async function findWard(_prev: WardState, form: FormData): Promise<WardState> {
  const address = String(form.get('address') ?? '').slice(0, 200)
  const addressId = Number(form.get('addressId') ?? '')
  const payload = await getClient()
  const rl = await rateLimit(payload, 'ward-lookup', clientKey(await headers()), 20, 600)
  if (!rl.allowed) return { status: 'done', tone: 'warning', title: 'Too many lookups', message: 'Please wait a few minutes and try again, or call City Hall.' }
  if (address.trim().length < 5) return { status: 'done', tone: 'warning', title: 'Enter a street address', message: 'For example: 29 North Day Street.' }

  // 1) An address chosen from the 07050 suggestions, 2) an exact 07050 match, 3) the Census geocoder.
  let point: { lng: number; lat: number; matched: string; illustrative: boolean } | null = null
  const picked = Number.isInteger(addressId) && addressId > 0 ? await addressById(payload, addressId) : null
  const local = picked ?? await exactAddress(payload, address)
  if (local) point = { lng: local.lng, lat: local.lat, matched: local.label, illustrative: false }
  else {
    const g = await geocode(address)
    if (g.status === 'unavailable') return { status: 'done', tone: 'info', title: 'Choose your address from the list', message: 'Start typing your house number and street, then pick your address from the suggestions. You can also browse the ward directory below or contact the City Clerk.' }
    if (g.status === 'no_match') return { status: 'done', tone: 'warning', title: 'We could not find that address', message: 'Start typing your house number and street and pick your address from the suggestions, or contact the City Clerk.' }
    if (g.status === 'multiple') return { status: 'done', tone: 'warning', title: 'More than one address matched', message: 'Please choose the exact address and search again.', options: g.options }
    point = { lng: g.lng, lat: g.lat, matched: g.matched, illustrative: g.illustrative }
  }

  const w = await lookupWard(payload, point.lng, point.lat, { allowUnverified: true, allowIllustrative: process.env.NODE_ENV !== 'production' && point.illustrative })
  const where = `Matched: ${point.matched}.`
  switch (w.status) {
    case 'ok': return { status: 'done', tone: 'success', ward: w.ward, title: `This address is in the ${cap(w.ward)} Ward`, message: `${where} Boundary source: ${w.custodian}.` }
    case 'unofficial': return { status: 'done', tone: 'success', ward: w.ward, title: `This address is in the ${cap(w.ward)} Ward`,
      message: `${where} Based on the State of New Jersey ward map (NJ Office of GIS), which the City Clerk has not yet confirmed. For official purposes such as voting, confirm with the City Clerk or the Essex County Clerk.` }
    case 'ambiguous': return { status: 'done', tone: 'warning', title: 'Close to a ward boundary', message: `${where} ${w.message}` }
    case 'outside': return { status: 'done', tone: 'warning', title: 'Outside the City', message: `${where} ${w.message}` }
    case 'illustrative': return { status: 'done', tone: 'info', title: 'Not an official ward result', message: `${where} ${w.message}` }
    default: return { status: 'done', tone: 'info', title: 'Ward boundaries are not yet verified', message: `${where} ${w.reason}` }
  }
}
