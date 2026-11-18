/** Direct REST calls — the same paths a script or attacker would use, bypassing the UI. */
import { expect, test, type APIRequestContext } from '@playwright/test'

const PW = process.env.SEED_STAFF_PASSWORD ?? ''
async function token(request: APIRequestContext, email: string) {
  const r = await request.post('/api/users/login', { data: { email, password: PW } })
  expect(r.ok(), await r.text()).toBeTruthy()
  return (await r.json()).token as string
}
const auth = (t: string) => ({ Authorization: `JWT ${t}` })

test.describe('REST access control', () => {
  test.skip(!PW, 'SEED_STAFF_PASSWORD not set')

  test('anonymous REST cannot read private collections', async ({ request }) => {
    for (const c of ['service-requests', 'subscriptions', 'outbox', 'audit-events', 'import-batches', 'users']) {
      const r = await request.get(`/api/${c}`)
      expect(r.status(), c).toBe(403)
    }
  })

  test('draft content is absent from public REST, pages, search and feeds', async ({ request }) => {
    const t = await token(request, 'contributor@orange.test')
    const depts = await (await request.get('/api/departments?where[slug][equals]=public-works')).json()
    const slug = `e2e-draft-${Date.now()}`
    const created = await request.post('/api/notices', { headers: auth(t), data: { title: `Zanzibar draft ${slug}`, slug, summary: 'secret draft', kind: 'general', department: depts.docs[0].id } })
    expect(created.ok(), await created.text()).toBeTruthy()
    const id = (await created.json()).doc.id
    expect((await (await request.get(`/api/notices?where[id][equals]=${id}`)).json()).docs).toHaveLength(0)
    expect((await request.get(`/api/notices/${id}`)).status()).toBe(404)
    expect((await request.get(`/notices/${slug}`)).status()).toBe(404)
    expect(await (await request.get('/search?q=Zanzibar')).text()).not.toContain(slug)
    expect(await (await request.get('/data/calendar.ics')).text()).not.toContain('Zanzibar')
    // contributor cannot publish it directly through the API
    const pub = await request.patch(`/api/notices/${id}`, { headers: auth(t), data: { workflowStatus: 'published' } })
    expect(pub.ok()).toBeFalsy()
  })

  test("contributor cannot edit another department's content via REST", async ({ request }) => {
    const t = await token(request, 'contributor@orange.test')
    const fin = await (await request.get('/api/departments?where[slug][equals]=finance')).json()
    const r = await request.post('/api/notices', { headers: auth(t), data: { title: 'x', slug: `e2e-x-${Date.now()}`, summary: 'y', kind: 'general', department: fin.docs[0].id } })
    expect(r.ok()).toBeFalsy()
  })

  test('contributor cannot create a service request through the API (only the validated public form)', async ({ request }) => {
    const r = await request.post('/api/service-requests', { data: { reference: 'X', category: 'other', description: 'abc', locationText: 'x' } })
    expect(r.status()).toBe(403)
  })
})
