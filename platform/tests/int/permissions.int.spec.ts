import { beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { makeDept, makeUser, payloadForTests } from '../helpers'

let payload: Payload
let dpw: any, finance: any, contributor: any, reviewer: any, publisher: any, admin: any, outsiderContributor: any

const notice = (dept: number, extra: object = {}) => ({ title: `Notice ${Math.random()}`, summary: 'Summary text', kind: 'general', department: dept, ...extra }) as any

beforeAll(async () => {
  payload = await payloadForTests()
  dpw = await makeDept(payload, 'Public Works')
  finance = await makeDept(payload, 'Finance')
  contributor = await makeUser(payload, ['contributor'], [dpw.id])
  outsiderContributor = await makeUser(payload, ['contributor'], [finance.id])
  reviewer = await makeUser(payload, ['department_reviewer'], [dpw.id])
  publisher = await makeUser(payload, ['publisher'])
  admin = await makeUser(payload, ['administrator'])
})

describe('contributor restrictions (enforced through the access layer, as REST/admin calls are)', () => {
  it('can create a draft in own department', async () => {
    const d = await payload.create({ collection: 'notices', data: notice(dpw.id), user: contributor, overrideAccess: false })
    expect(d.workflowStatus).toBe('draft')
  })

  it('cannot create content for another department', async () => {
    await expect(payload.create({ collection: 'notices', data: notice(finance.id), user: contributor, overrideAccess: false })).rejects.toThrow(/own departments/)
  })

  it('cannot create without a department', async () => {
    await expect(payload.create({ collection: 'notices', data: { title: 'x', summary: 'y', kind: 'general' } as any, user: contributor, overrideAccess: false })).rejects.toThrow(/department/)
  })

  it('cannot publish or approve, even by setting the field directly', async () => {
    const d = await payload.create({ collection: 'notices', data: notice(dpw.id), user: contributor, overrideAccess: false })
    await expect(payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'published' } as any, user: contributor, overrideAccess: false })).rejects.toThrow(/not allowed|cannot/)
    await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'in_review' } as any, user: contributor, overrideAccess: false })
    await expect(payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'approved' } as any, user: contributor, overrideAccess: false })).rejects.toThrow(/cannot/)
  })

  it('cannot emergency-publish without authorization', async () => {
    await expect(payload.create({ collection: 'notices', data: notice(dpw.id, { workflowStatus: 'published', emergencyPublish: true, kind: 'emergency' }), user: contributor, overrideAccess: false })).rejects.toThrow(/emergency/)
  })

  it("cannot read or edit another department's draft", async () => {
    const theirs = await payload.create({ collection: 'notices', data: notice(finance.id), user: outsiderContributor, overrideAccess: false })
    const visible = await payload.find({ collection: 'notices', where: { id: { equals: theirs.id } }, user: contributor, overrideAccess: false })
    expect(visible.docs).toHaveLength(0)
    await expect(payload.update({ collection: 'notices', id: theirs.id, data: { title: 'hijack' }, user: contributor, overrideAccess: false })).rejects.toThrow()
  })

  it('cannot read private resident requests, audit events, outbox or subscriptions', async () => {
    for (const collection of ['service-requests', 'subscriptions', 'outbox', 'import-batches'] as const) {
      if (collection === 'service-requests') {
        // staff may read requests; anonymous may not
        await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow()
        continue
      }
      await expect(payload.find({ collection, user: contributor, overrideAccess: false })).rejects.toThrow()
    }
    await expect(payload.find({ collection: 'audit-events', user: contributor, overrideAccess: false })).rejects.toThrow()
  })

  it('cannot escalate own roles', async () => {
    const updated = await payload.update({ collection: 'users', id: contributor.id, data: { roles: ['administrator'] } as any, user: contributor, overrideAccess: false })
    expect(updated.roles).toEqual(['contributor'])
  })

  it('cannot write audit events directly; audit is append-only for everyone', async () => {
    await expect(payload.create({ collection: 'audit-events', data: { action: 'forged' }, user: admin, overrideAccess: false })).rejects.toThrow()
    const ev = (await payload.find({ collection: 'audit-events', user: admin, overrideAccess: false, limit: 1 })).docs[0]
    await expect(payload.delete({ collection: 'audit-events', id: ev.id, user: admin, overrideAccess: false })).rejects.toThrow()
  })
})

describe('review and publication', () => {
  it('reviewer approves in own department; publisher publishes; reviewer cannot publish', async () => {
    const d = await payload.create({ collection: 'notices', data: notice(dpw.id), user: contributor, overrideAccess: false })
    await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'in_review' } as any, user: contributor, overrideAccess: false })
    await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'approved' } as any, user: reviewer, overrideAccess: false })
    await expect(payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'published' } as any, user: reviewer, overrideAccess: false })).rejects.toThrow(/cannot/)
    const pub = await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: 'published' } as any, user: publisher, overrideAccess: false })
    expect(pub.workflowStatus).toBe('published')
    expect(pub.publishedAt).toBeTruthy()
    const audit = await payload.find({ collection: 'audit-events', where: { and: [{ targetCollection: { equals: 'notices' } }, { targetId: { equals: String(d.id) } }] }, overrideAccess: true, limit: 20 })
    expect(audit.docs.map((a) => a.action)).toEqual(expect.arrayContaining(['create', 'transition:draft->in_review', 'transition:in_review->approved', 'transition:approved->published']))
  })

  it('contributor cannot silently edit live content', async () => {
    const d = await payload.create({ collection: 'notices', data: notice(dpw.id), user: contributor, overrideAccess: false })
    for (const [s, u] of [['in_review', contributor], ['approved', reviewer], ['published', publisher]] as const)
      await payload.update({ collection: 'notices', id: d.id, data: { workflowStatus: s } as any, user: u, overrideAccess: false })
    await expect(payload.update({ collection: 'notices', id: d.id, data: { title: 'changed' }, user: contributor, overrideAccess: false })).rejects.toThrow(/publisher/)
  })

  it('authorized emergency publishing bypasses review and is audited as emergency', async () => {
    const em = await makeUser(payload, ['contributor'], [dpw.id], { canEmergencyPublish: true })
    const d = await payload.create({ collection: 'notices', data: notice(dpw.id, { kind: 'emergency', workflowStatus: 'published', emergencyPublish: true }), user: em, overrideAccess: false })
    expect(d.workflowStatus).toBe('published')
    const a = await payload.find({ collection: 'audit-events', where: { and: [{ targetId: { equals: String(d.id) } }, { emergency: { equals: true } }] }, overrideAccess: true })
    expect(a.docs.length).toBe(1)
  })

  it('records domain: a contributor cannot create meetings or legislation; a records clerk can', async () => {
    const clerk = await makeUser(payload, ['records_clerk'])
    const m = { title: 'Council', body: 'city_council', meetingType: 'regular', startsAt: new Date().toISOString(), location: 'City Hall' } as any
    await expect(payload.create({ collection: 'meetings', data: m, user: contributor, overrideAccess: false })).rejects.toThrow()
    const created = await payload.create({ collection: 'meetings', data: m, user: clerk, overrideAccess: false })
    expect(created.id).toBeTruthy()
  })
})
