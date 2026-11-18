import { beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { deliverOutbox, publicationSweep, reconcileSearch } from '@/jobs/tasks'
import { search } from '@/lib/search'
import { setSubscriptionStatus, subscribe } from '@/lib/subscriptions'
import { subscriptionToken } from '@/lib/notify'
import { createConcern } from '@/lib/concerns'
import { makeDept, makeUser, payloadForTests } from '../helpers'

let payload: Payload, dept: any, contributor: any, reviewer: any, publisher: any

async function toApproved(title: string, extra: object = {}) {
  const d = await payload.create({ collection: 'notices', data: { title, summary: `${title} summary`, kind: 'holiday', department: dept.id, ...extra } as any, user: contributor, overrideAccess: false })
  await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'in_review' } as any, user: contributor, overrideAccess: false })
  return payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'approved' } as any, user: reviewer, overrideAccess: false })
}
const publicFind = (id: number) => payload.find({ collection: 'notices', where: { id: { equals: id } }, overrideAccess: false })

beforeAll(async () => {
  payload = await payloadForTests()
  dept = await makeDept(payload, 'Sanitation')
  contributor = await makeUser(payload, ['contributor'], [dept.id])
  reviewer = await makeUser(payload, ['department_reviewer'], [dept.id])
  publisher = await makeUser(payload, ['publisher'])
})

describe('scheduled publication, expiry and rollback', () => {
  it('a reviewed holiday notice is invisible until the worker publishes it, then expires', async () => {
    const a = await toApproved('Thanksgiving collection schedule zebra')
    const publishAt = new Date(Date.now() + 60_000).toISOString()
    const expiresAt = new Date(Date.now() + 120_000).toISOString()
    await payload.update({ collection: 'notices', id: a.id, data: { workflowStatus: 'scheduled', publishAt, expiresAt } as any, user: publisher, overrideAccess: false })

    expect((await publicFind(a.id)).docs).toHaveLength(0)
    expect((await search(payload, 'zebra')).hits).toHaveLength(0)

    await publicationSweep(payload, new Date()) // too early: no effect
    expect((await publicFind(a.id)).docs).toHaveLength(0)

    const r1 = await publicationSweep(payload, new Date(Date.now() + 61_000))
    expect(r1.published).toBeGreaterThanOrEqual(1)
    const again = await publicationSweep(payload, new Date(Date.now() + 61_000)) // idempotent re-run
    expect(again.published).toBe(0)
    expect((await search(payload, 'zebra')).hits.map((h) => h.docId)).toContain(String(a.id))

    await publicationSweep(payload, new Date(Date.now() + 121_000))
    const after = await payload.findByID({ collection: 'notices', id: a.id, overrideAccess: true })
    expect(after.workflowStatus).toBe('archived')
    expect((await publicFind(a.id)).docs).toHaveLength(0)
    expect((await search(payload, 'zebra')).hits).toHaveLength(0)
  })

  it('a published correction can be rolled back to a prior version', async () => {
    const a = await toApproved('Leaf pickup begins')
    await payload.update({ collection: 'notices', id: a.id, data: { workflowStatus: 'published' } as any, user: publisher, overrideAccess: false })
    await payload.update({ collection: 'notices', id: a.id, data: { summary: 'WRONG DATE' }, user: publisher, overrideAccess: false })
    const versions = await payload.findVersions({ collection: 'notices', where: { parent: { equals: a.id } }, sort: '-updatedAt', overrideAccess: true })
    const good = versions.docs.find((v) => v.version.summary === 'Leaf pickup begins summary' && v.version.workflowStatus === 'published')!
    expect(good).toBeTruthy()
    await payload.restoreVersion({ collection: 'notices', id: good.id, overrideAccess: true, context: { system: true } })
    const restored = await payload.findByID({ collection: 'notices', id: a.id, overrideAccess: true })
    expect(restored.summary).toBe('Leaf pickup begins summary')
  })

  it('draft content never reaches search; unpublishing removes it; reconcile repairs drift', async () => {
    const a = await toApproved('Quokka festival')
    expect((await search(payload, 'quokka')).hits).toHaveLength(0)
    await payload.update({ collection: 'notices', id: a.id, data: { workflowStatus: 'published' } as any, user: publisher, overrideAccess: false })
    expect((await search(payload, 'quokka')).hits).toHaveLength(1)
    await payload.update({ collection: 'notices', id: a.id, data: { workflowStatus: 'archived' } as any, user: publisher, overrideAccess: false })
    expect((await search(payload, 'quokka')).hits).toHaveLength(0)
    // simulate drift: a stale row for a non-public doc
    await (payload.db as any).pool.query(`INSERT INTO civic.search_documents (collection, doc_id, title, url, content_type) VALUES ('notices',$1,'Quokka stale','/x','notice')`, [String(a.id)])
    const r = await reconcileSearch(payload)
    expect(r.removed).toBeGreaterThanOrEqual(1)
    expect((await search(payload, 'quokka')).hits).toHaveLength(0)
  })
})

describe('subscriptions and outbox', () => {
  it('opt-in requires confirmation; publish fans out once; unsubscribe suppresses later sends', async () => {
    const email = `res${Date.now()}@example.org`
    await subscribe(payload, { email, topicType: 'notices', topicId: '*' })
    const sub = (await payload.find({ collection: 'subscriptions', where: { email: { equals: email } }, overrideAccess: true })).docs[0]
    expect(sub.status).toBe('pending')
    expect(await setSubscriptionStatus(payload, 'confirm', String(sub.id), 'bad-token')).toBe(false)
    expect(await setSubscriptionStatus(payload, 'confirm', String(sub.id), subscriptionToken('confirm', sub.id))).toBe(true)

    const a = await toApproved('Water main notice')
    await payload.update({ collection: 'notices', id: a.id, data: { workflowStatus: 'published' } as any, user: publisher, overrideAccess: false })
    const rows = await payload.find({ collection: 'outbox', where: { and: [{ to: { equals: email } }, { dedupeKey: { like: `notice:${a.id}` } }] }, overrideAccess: true })
    expect(rows.docs).toHaveLength(1)
    expect(rows.docs[0].status).toBe('pending') // not "sent" until the provider accepts it

    const r = await deliverOutbox(payload)
    expect(r.sent).toBeGreaterThanOrEqual(2) // confirmation + notice
    const again = await deliverOutbox(payload)
    expect(again.sent).toBe(0) // no duplicate delivery
    const sent = await payload.findByID({ collection: 'outbox', id: rows.docs[0].id, overrideAccess: true })
    expect(sent.status).toBe('sent')
    expect(sent.providerMessageId).toMatch(/^capture:/) // dev capture is labeled, never claimed as delivered

    // Unsubscribe, then a pending message for this subscriber is suppressed rather than sent.
    const b = await toApproved('Second notice')
    await payload.update({ collection: 'notices', id: b.id, data: { workflowStatus: 'published' } as any, user: publisher, overrideAccess: false })
    expect(await setSubscriptionStatus(payload, 'unsubscribe', String(sub.id), subscriptionToken('unsubscribe', sub.id))).toBe(true)
    const r2 = await deliverOutbox(payload)
    expect(r2.suppressed).toBeGreaterThanOrEqual(1)
  })
})

describe('concern intake', () => {
  it('validates, persists privately, and returns a real reference', async () => {
    const bad = await createConcern(payload, { category: 'pothole', description: 'short', locationText: '' })
    expect(bad.ok).toBe(false)
    const ok = await createConcern(payload, { category: 'pothole', description: 'Deep pothole in the eastbound lane', locationText: 'Main St near Day St', contactEmail: '' })
    expect(ok.ok && ok.reference).toMatch(/^OR-\d{8}-[A-Z0-9]{6}$/)
    const stored = await payload.find({ collection: 'service-requests', where: { reference: { equals: (ok as any).reference } }, overrideAccess: true })
    expect(stored.docs).toHaveLength(1)
    await expect(payload.find({ collection: 'service-requests', overrideAccess: false })).rejects.toThrow()
    expect((await search(payload, 'pothole eastbound')).hits).toHaveLength(0)
  })
})

describe('rate limiting', () => {
  it('blocks after the limit within a window, keyed by a hash (no raw IP stored)', async () => {
    const { rateLimit } = await import('@/lib/ratelimit')
    const key = `203.0.113.${Math.floor(Math.random() * 200)}`
    const results = []
    for (let i = 0; i < 4; i++) results.push((await rateLimit(payload, 'test-bucket', key, 3, 3600)).allowed)
    expect(results).toEqual([true, true, true, false])
    const rows = await (payload.db as any).pool.query(`SELECT key_hash FROM civic.rate_limits WHERE bucket='test-bucket'`)
    expect(rows.rows.every((r: any) => !r.key_hash.includes('203.0.113'))).toBe(true)
  })
})
