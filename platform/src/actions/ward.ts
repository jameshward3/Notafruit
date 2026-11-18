'use server'
import { headers } from 'next/headers'
import { geocode } from '@/lib/geocode'
import { lookupWard } from '@/lib/gis'
import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'

export type WardState = { status: 'idle' } | { status: 'done'; title: string; message: string; tone: 'success' | 'info' | 'warning'; ward?: string; options?: string[] }

/** Address → ward. Raw addresses are not logged or stored. */
export async function findWard(_prev: WardState, form: FormData): Promise<WardState> {
  const address = String(form.get('address') ?? '').slice(0, 200)
  const payload = await getClient()
  const rl = await rateLimit(payload, 'ward-lookup', clientKey(await headers()), 20, 600)
  if (!rl.allowed) return { status: 'done', tone: 'warning', title: 'Too many lookups', message: 'Please wait a few minutes and try again, or call City Hall.' }
  if (address.trim().length < 5) return { status: 'done', tone: 'warning', title: 'Enter a street address', message: 'For example: 29 North Day Street.' }

  const g = await geocode(address)
  if (g.status === 'unavailable') return { status: 'done', tone: 'info', title: 'Address lookup is not available yet', message: `${g.reason} You can browse the ward directory below or contact the City Clerk.` }
  if (g.status === 'no_match') return { status: 'done', tone: 'warning', title: 'We could not find that address', message: 'Check the spelling, include the house number, or contact the City Clerk.' }
  if (g.status === 'multiple') return { status: 'done', tone: 'warning', title: 'More than one address matched', message: 'Please choose the exact address and search again.', options: g.options }

  const w = await lookupWard(payload, g.lng, g.lat, { allowIllustrative: process.env.NODE_ENV !== 'production' && g.illustrative })
  const where = `Matched: ${g.matched}.`
  switch (w.status) {
    case 'ok': return { status: 'done', tone: 'success', ward: w.ward, title: `This address is in the ${w.ward[0].toUpperCase()}${w.ward.slice(1)} Ward`, message: `${where} Boundary source: ${w.custodian}.` }
    case 'ambiguous': return { status: 'done', tone: 'warning', title: 'Close to a ward boundary', message: `${where} ${w.message}` }
    case 'outside': return { status: 'done', tone: 'warning', title: 'Outside the City', message: `${where} ${w.message}` }
    case 'illustrative': return { status: 'done', tone: 'info', title: 'Not an official ward result', message: `${where} ${w.message}` }
    default: return { status: 'done', tone: 'info', title: 'Ward boundaries are not yet verified', message: `${where} ${w.reason}` }
  }
}
