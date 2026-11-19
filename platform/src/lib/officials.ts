/** Officials directory helpers (public reads only). */
import { findPublic } from './public'

export const CATEGORY_ORDER = [
  { key: 'executive', title: 'Mayor & administration' },
  { key: 'council', title: 'City Council' },
  { key: 'clerk', title: 'Office of the City Clerk' },
  { key: 'department', title: 'Department leadership' },
] as const

/** Approved portrait URL, else null. */
export function photoUrl(o: any): string | null {
  const m = o?.photo
  if (!m || typeof m !== 'object' || m.approvalStatus !== 'approved') return null
  // Portraits keep their original proportions (card derivatives are 4:3 landscape crops).
  // Payload prefixes serverURL; keep media paths relative so portraits load on every domain alias.
  return m.url ? String(m.url).replace(/^https?:\/\/[^/]+(?=\/api\/media\/)/, '') : null
}

export async function allOfficials() {
  const res = await findPublic('officials', { sort: 'sortOrder', limit: 200, depth: 1 })
  return (res.docs as any[]).sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name))
}

export const telHref = (p: string) => `tel:+1${p.replace(/\D/g, '').slice(-10)}`
