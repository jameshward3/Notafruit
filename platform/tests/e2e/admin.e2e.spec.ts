import { expect, test } from '@playwright/test'
const PW = process.env.SEED_STAFF_PASSWORD ?? ''

test.describe('staff admin', () => {
  test.skip(!PW, 'SEED_STAFF_PASSWORD not set')
  test('contributor signs in and opens the notice editor; cannot see administration collections', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill('contributor@orange.test')
    await page.getByLabel('Password').fill(PW)
    await page.getByRole('button', { name: /log ?in/i }).click()
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 })
    await page.goto('/admin/collections/notices/create')
    await expect(page.getByLabel(/^Title/)).toBeVisible({ timeout: 30_000 })
    const r = await page.request.get('/api/audit-events')
    expect(r.status()).toBe(403)
  })
})

test('security headers are present on public pages', async ({ request }) => {
  const r = await request.get('/')
  expect(r.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(r.headers()['x-content-type-options']).toBe('nosniff')
  expect(r.headers()['x-powered-by']).toBeUndefined()
})
