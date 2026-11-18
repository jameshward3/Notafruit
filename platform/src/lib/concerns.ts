import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'
import { z } from 'zod'

export const ConcernInput = z.object({
  category: z.enum(['pothole', 'streetlight', 'trash', 'sidewalk', 'tree', 'other']),
  description: z.string().trim().min(10, 'Please describe the issue in at least 10 characters.').max(4000),
  locationText: z.string().trim().min(3, 'Please tell us where.').max(300),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  contactEmail: z.email('Enter a valid email or leave it blank.').max(200).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
  website: z.string().max(0).optional(), // honeypot
})

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export function newReference(now = new Date()) {
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const r = [...randomBytes(6)].map((b) => ALPHABET[b % ALPHABET.length]).join('')
  return `OR-${ymd}-${r}`
}

/** Persists a private request and returns its real reference number. */
export async function createConcern(payload: Payload, raw: unknown) {
  const parsed = ConcernInput.safeParse(raw)
  if (!parsed.success) return { ok: false as const, errors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? ''), message: i.message })) }
  const { website: _hp, ...data } = parsed.data
  const doc = await payload.create({
    collection: 'service-requests', overrideAccess: true,
    data: { ...data, contactEmail: data.contactEmail || undefined, reference: newReference(), status: 'received' },
  })
  return { ok: true as const, reference: doc.reference }
}
