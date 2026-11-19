/**
 * ZIP 07050 address lookup from civic.address_points (NJOGIS NG911 Address Points).
 * Typed addresses are only used for the query; they are never logged or stored.
 */
import type { Payload } from 'payload'
import { q } from './db'

const WORDS: Record<string, string> = {
  avenue: 'ave', av: 'ave', street: 'st', str: 'st', road: 'rd', place: 'pl', court: 'ct', terrace: 'ter', terr: 'ter', drive: 'dr',
  boulevard: 'blvd', lane: 'ln', parkway: 'pkwy', highway: 'hwy', square: 'sq', circle: 'cir', plaza: 'plz',
  north: 'n', south: 's', east: 'e', west: 'w', mount: 'mt', saint: 'st',
}

/** Lowercase, drop punctuation, the city/state/ZIP, and abbreviate street types and directions. */
export function normalizeAddress(s: string) {
  return s.toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\b(orange|nj|new jersey|07050|usa)\b/g, ' ')
    .split(/\s+/).filter(Boolean).map((w) => WORDS[w] ?? w).join(' ')
    .trim()
}

export type AddressMatch = { id: number; label: string; lng: number; lat: number }
const label = (r: any) => `${r.full_addr}, ${r.post_comm ?? 'Orange'}, NJ ${r.post_code}`

/** Up to `limit` 07050 addresses starting with the typed text (house number first, or street name). */
export async function suggestAddresses(payload: Payload, input: string, limit = 8): Promise<AddressMatch[]> {
  const n = normalizeAddress(input.slice(0, 120))
  if (n.length < 2) return []
  const like = `${n.replace(/[%_\\]/g, '')}%`
  const rows = await q<any>(payload,
    `SELECT id, full_addr, post_comm, post_code, lng, lat FROM civic.address_points
      WHERE (norm LIKE $1 OR street_norm LIKE $1) AND house_number IS NOT NULL
      ORDER BY (norm LIKE $1) DESC, street_norm, house_number NULLS LAST, full_addr LIMIT $2`,
    [like, limit])
  return rows.map((r) => ({ id: r.id, label: label(r), lng: r.lng, lat: r.lat }))
}

export async function addressById(payload: Payload, id: number): Promise<AddressMatch | null> {
  const rows = await q<any>(payload, 'SELECT id, full_addr, post_comm, post_code, lng, lat FROM civic.address_points WHERE id=$1', [id])
  return rows[0] ? { id: rows[0].id, label: label(rows[0]), lng: rows[0].lng, lat: rows[0].lat } : null
}

/** Exact match on the normalized address (house number + street), else null. */
export async function exactAddress(payload: Payload, input: string): Promise<AddressMatch | null> {
  const n = normalizeAddress(input.slice(0, 120))
  if (!/^\d/.test(n)) return null
  const rows = await q<any>(payload, 'SELECT id, full_addr, post_comm, post_code, lng, lat FROM civic.address_points WHERE norm=$1 LIMIT 2', [n])
  return rows.length === 1 ? { id: rows[0].id, label: label(rows[0]), lng: rows[0].lng, lat: rows[0].lat } : null
}
