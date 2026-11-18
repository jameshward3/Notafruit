import type { Payload } from 'payload'
import { createLocalReq } from 'payload'
import { z } from 'zod'
import { confirmUrl, enqueueEmail, verifyToken } from './notify'

export const SubscribeInput = z.object({
  email: z.email().max(200).transform((s) => s.toLowerCase()),
  topicType: z.enum(['notices', 'meetings', 'project']),
  topicId: z.string().regex(/^(\*|\d+)$/).default('*'),
})

/** Explicit opt-in: creates a pending subscription and sends a confirmation link. */
export async function subscribe(payload: Payload, raw: unknown) {
  const p = SubscribeInput.safeParse(raw)
  if (!p.success) return { ok: false as const, error: 'Enter a valid email address.' }
  const { email, topicType, topicId } = p.data
  const found = await payload.find({ collection: 'subscriptions', overrideAccess: true, limit: 1, depth: 0,
    where: { and: [{ email: { equals: email } }, { topicType: { equals: topicType } }, { topicId: { equals: topicId } }] } })
  let sub = found.docs[0]
  if (sub?.status === 'suppressed') return { ok: true as const } // do not reveal; never mail suppressed addresses
  if (sub?.status === 'confirmed') return { ok: true as const }
  if (!sub) sub = await payload.create({ collection: 'subscriptions', overrideAccess: true, data: { email, topicType, topicId, status: 'pending' } })
  else if (sub.status === 'unsubscribed') sub = await payload.update({ collection: 'subscriptions', id: sub.id, overrideAccess: true, data: { status: 'pending' } })
  const req = await createLocalReq({}, payload)
  // One confirmation per subscription per hour (dedupe), to prevent mail-bombing.
  await enqueueEmail(req, {
    dedupeKey: `confirm:${sub.id}:${new Date().toISOString().slice(0, 13)}`,
    to: email, subject: 'Confirm your City of Orange Township updates',
    text: `Someone asked to send ${topicType} updates to this address. To confirm, open:\n${confirmUrl(sub.id)}\n\nIf this wasn't you, ignore this email and nothing will be sent.`,
  })
  return { ok: true as const }
}

export async function setSubscriptionStatus(payload: Payload, purpose: 'confirm' | 'unsubscribe', id: string, token: string) {
  if (!/^\d+$/.test(id) || !verifyToken(purpose, id, token)) return false
  const sub = await payload.findByID({ collection: 'subscriptions', id: Number(id), overrideAccess: true, depth: 0, disableErrors: true })
  if (!sub) return false
  if (purpose === 'confirm' && sub.status === 'pending') {
    await payload.update({ collection: 'subscriptions', id: sub.id, overrideAccess: true, data: { status: 'confirmed', confirmedAt: new Date().toISOString() } })
  }
  if (purpose === 'unsubscribe' && sub.status !== 'suppressed') {
    await payload.update({ collection: 'subscriptions', id: sub.id, overrideAccess: true, data: { status: 'unsubscribed' } })
  }
  return true
}
