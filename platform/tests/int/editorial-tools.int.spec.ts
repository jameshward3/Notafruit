import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { checkEditorLinks } from '@/jobs/tasks'
import { makeUser, payloadForTests } from '../helpers'

let payload: Payload, contributor: any, publisher: any

beforeAll(async () => {
  payload = await payloadForTests()
  contributor = await makeUser(payload, ['contributor'])
  publisher = await makeUser(payload, ['publisher'])
})

describe('media asset manifest (guide §2)', () => {
  it('records checksum of the preserved original, requires alt unless decorative, and stamps approval', async () => {
    const png = await sharp({ create: { width: 1700, height: 1000, channels: 3, background: '#0B2035' } }).png().toBuffer()
    const file = { data: png, mimetype: 'image/png', name: `t-${Date.now()}.png`, size: png.length }
    const base = { rightsHolder: 'City of Orange Township (test)', license: 'City-owned', kind: 'photo' }
    await expect(payload.create({ collection: 'media', file, data: { ...base, alt: '' } as any, user: contributor, overrideAccess: false })).rejects.toThrow(/Alt/)
    const m = await payload.create({ collection: 'media', file: { ...file, name: `a-${file.name}` }, data: { ...base, alt: 'Navy test swatch' } as any, user: contributor, overrideAccess: false })
    expect(m.checksumSha256).toBe(createHash('sha256').update(png).digest('hex'))
    expect(m.mimeType).toBe('image/png') // original not re-encoded
    expect(m.verificationStatus).toBe('unverified')
    expect(m.sizes?.heroAvif?.mimeType).toBe('image/avif')
    // contributor cannot approve; publisher can, which stamps approvedBy/approvedAt
    const self = await payload.update({ collection: 'media', id: m.id, data: { approvalStatus: 'approved' } as any, user: contributor, overrideAccess: false })
    expect(self.approvalStatus).toBe('pending')
    const ok = await payload.update({ collection: 'media', id: m.id, data: { approvalStatus: 'approved' } as any, user: publisher, overrideAccess: false })
    expect((ok.approvedBy as any)?.id ?? ok.approvedBy).toBe(publisher.id)
    expect(ok.approvedAt).toBeTruthy()
    const deco = await payload.create({ collection: 'media', file: { ...file, name: `d-${file.name}` }, data: { ...base, decorative: true } as any, user: contributor, overrideAccess: false })
    expect(deco.id).toBeTruthy()
  })
})

describe('link checks (guide §10)', () => {
  it('records one report row per editor link without touching the referencing documents', async () => {
    await payload.create({ collection: 'services', overrideAccess: true, context: { system: true }, data: { title: 'Linked svc', slug: `linked-${Date.now()}`, summary: 's', category: 'other', externalUrl: 'http://127.0.0.1/internal' } as any })
    const before = await payload.count({ collection: 'audit-events', overrideAccess: true })
    const r = await checkEditorLinks(payload, async (u) => (u.includes('127.0.0.1') ? { status: 'blocked', detail: 'private' } : { status: 'ok', httpStatus: 200 }))
    expect(r.blocked).toBeGreaterThanOrEqual(1)
    const row = await payload.find({ collection: 'link-checks', where: { url: { equals: 'http://127.0.0.1/internal' } }, overrideAccess: true })
    expect(row.docs[0].status).toBe('blocked')
    expect((await payload.count({ collection: 'audit-events', overrideAccess: true })).totalDocs).toBe(before.totalDocs)
    await expect(payload.find({ collection: 'link-checks', overrideAccess: false })).rejects.toThrow() // staff only
  })
})
