/**
 * Notification outbox. Publishing writes outbox rows (deduplicated by a
 * unique key per event+subscriber); the worker delivers them. Nothing is
 * reported as "sent" until the mail provider accepts the message.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PayloadRequest } from 'payload'

export const subscriptionToken = (purpose: 'confirm' | 'unsubscribe', id: number | string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET ?? '').update(`${purpose}:${id}`).digest('base64url')

export const verifyToken = (purpose: 'confirm' | 'unsubscribe', id: number | string, token: string) => {
  const a = Buffer.from(subscriptionToken(purpose, id)), b = Buffer.from(token ?? '')
  return a.length === b.length && timingSafeEqual(a, b)
}

const site = () => process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'
export const unsubscribeUrl = (id: number | string) => `${site()}/subscribe/unsubscribe?id=${id}&t=${subscriptionToken('unsubscribe', id)}`
export const confirmUrl = (id: number | string) => `${site()}/subscribe/confirm?id=${id}&t=${subscriptionToken('confirm', id)}`

export async function enqueueEmail(req: PayloadRequest, m: { dedupeKey: string; to: string; subject: string; text: string }) {
  const existing = await req.payload.find({ collection: 'outbox', where: { dedupeKey: { equals: m.dedupeKey } }, limit: 1, depth: 0, overrideAccess: true, req })
  if (existing.docs.length) return existing.docs[0]
  return req.payload.create({ collection: 'outbox', overrideAccess: true, req, data: { ...m, status: 'pending', attempts: 0 } })
}

export async function notifySubscribers(req: PayloadRequest, e: { topicType: 'notices' | 'meetings' | 'project'; topicId: string; key: string; subject: string; text: string }) {
  const subs = await req.payload.find({
    collection: 'subscriptions', overrideAccess: true, req, depth: 0, limit: 5000, pagination: false,
    where: { and: [{ topicType: { equals: e.topicType } }, { topicId: { in: [e.topicId, '*'] } }, { status: { equals: 'confirmed' } }] },
  })
  for (const s of subs.docs) {
    await enqueueEmail(req, {
      dedupeKey: `${e.key}:sub:${s.id}`,
      to: s.email,
      subject: e.subject,
      text: `${e.text}\n\n—\nYou subscribed to these updates. Unsubscribe: ${unsubscribeUrl(s.id)}`,
    })
  }
  return subs.docs.length
}
