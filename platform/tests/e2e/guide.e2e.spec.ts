/** Checks specific to the Orange Agentic Style Guide (docs/Orange_Agentic_Style_Guide.md). */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const PW = process.env.SEED_STAFF_PASSWORD ?? ''

test('§2 home link accessible name is "City of Orange Township home"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /^city of orange township home$/i })).toBeVisible()
})

test('§2 official seal lockup: unmodified file, decorative alt, 80px desktop / 48px mobile @mobile', async ({ page, request, isMobile }) => {
  await page.goto('/')
  const seal = page.locator('header .wordmark__seal')
  await expect(seal).toHaveAttribute('alt', '')
  const box = await seal.boundingBox()
  expect(Math.round(box!.width)).toBe(isMobile ? 48 : 80)
  expect(Math.round(box!.height)).toBe(Math.round(box!.width)) // circular aspect preserved
  const bytes = await (await request.get('/assets/brand/city-seal.png')).body()
  const { createHash } = await import('node:crypto')
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('bb07b430a6c759df7b33bf056e9afbbc05a267ef6c4da5dcddcff4bbe5d1d02b')
})

test('§4 mobile header is compact (72–88px) and the menu holds the utility links @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.goto('/')
  const h = await page.locator('header.masthead').evaluate((el) => el.getBoundingClientRect().height)
  expect(h).toBeGreaterThanOrEqual(72)
  expect(h).toBeLessThanOrEqual(88)
  await page.getByText('Menu', { exact: true }).click()
  const menu = page.getByRole('navigation', { name: 'Main (mobile)' })
  await expect(menu.getByRole('link', { name: 'Español' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu.getByRole('link', { name: 'Español' })).toBeHidden()
  await expect(page.locator('details.menu-toggle summary')).toBeFocused()
})

test('§4 focus ring: 3px outline with 3px offset on light, gold ring on navy', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab') // skip link (on navy)
  await page.keyboard.press('Tab') // wordmark (light)
  const light = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return [s.outlineWidth, s.outlineOffset, s.outlineColor] })
  expect(light).toEqual(['3px', '3px', 'rgb(0, 95, 204)'])
  await page.locator('.tasks a').first().focus()
  const dark = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor)
  expect(dark).toBe('rgb(183, 155, 89)')
})

test('§6 maps draw the official municipal boundary with its source', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('figure figcaption')).toContainText('City of Orange township boundary (official record, U.S. Census Bureau)')
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenStreetMap', { timeout: 15_000 })
})

test('§6 maps without verified geometry are labeled illustrative', async ({ page }) => {
  for (const p of ['/projects', '/explore']) {
    await page.goto(p)
    await expect(page.getByText('Illustrative map — not for address or ward determination')).toBeVisible()
  }
})

test('§6 mobile defaults to the list with an explicit map toggle; filters survive @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.goto('/projects?phase=construction')
  await expect(page.locator('.map-frame')).toBeHidden()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('link', { name: 'Show map' }).click()
  await expect(page).toHaveURL(/phase=construction/)
  await expect(page).toHaveURL(/view=map/)
  await expect(page.locator('.map-frame')).toBeVisible()
})

test('§5 explorer layer controls change both the map data and the list', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('table', { name: /Street projects/ })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Street projects' }).uncheck()
  await page.getByRole('checkbox', { name: 'Schools' }).uncheck()
  await page.getByRole('button', { name: 'Update map and list' }).click()
  await expect(page).toHaveURL(/layers=1/)
  await expect(page.getByRole('table', { name: /Street projects/ })).toHaveCount(0)
  await expect(page.getByRole('cell', { name: /Sample public school/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /Wards/ })).toBeDisabled()
})

test('§7 chart values are reachable by keyboard, and segments carry direct labels', async ({ page }) => {
  await page.goto('/transparency/budget')
  const chart = page.locator('[data-chart="Spending by category by year"] .recharts-wrapper svg, [data-chart="Spending by category by year"] .recharts-surface').first()
  await expect(page.locator('[data-chart="Spending by category by year"] text', { hasText: 'Safety' }).first()).toBeVisible()
  await chart.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-chart="Spending by category by year"] .recharts-tooltip-wrapper')).toContainText('$')
  await expect(page.getByRole('heading', { name: 'Capital investment by location' })).toBeVisible()
  await expect(page.getByText(/Verification: Illustrative sample data/)).toBeVisible()
})

test.describe('§9 forced colors and 200% zoom', () => {
  test('forced-colors: system colors apply to text and icons, axe (non-contrast rules) passes, focus visible', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    for (const p of ['/', '/transparency/budget']) {
      await page.goto(p)
      // axe's color-contrast rule reads author colors and misreports under forced-colors emulation;
      // there, contrast comes from the user's system palette, so check rendered colors directly instead.
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).disableRules(['color-contrast']).exclude('.maplibregl-canvas').analyze()
      expect(r.violations.map((v) => v.id), p).toEqual([])
      const authorColors = await page.evaluate(() => [...document.querySelectorAll('main p, main h1, main h2, footer p, svg.lucide')].map((e) => getComputedStyle(e).color)
        .filter((c) => ['rgb(220, 227, 234)', 'rgb(183, 155, 89)', 'rgb(82, 97, 113)'].includes(c)))
      expect(authorColors, `${p}: author text/icon colors leaked into forced-colors mode`).toEqual([])
    }
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none')
  })
  test('200% zoom (1280px at 2x = 640 CSS px) has no page-level horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 450 })
    for (const p of ['/', '/explore', '/projects', '/transparency/budget', '/government/meetings/sample-council-meeting-past']) {
      await page.goto(p)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), p).toBeLessThanOrEqual(0)
    }
  })
})

async function login(page: Page, email: string) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PW)
  await page.getByRole('button', { name: /log ?in/i }).click()
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 })
}
async function apiToken(request: APIRequestContext, email: string) {
  return (await (await request.post('/api/users/login', { data: { email, password: PW } })).json()).token as string
}

test.describe('§10 draft preview', () => {
  test.skip(!PW, 'SEED_STAFF_PASSWORD not set')
  test('anonymous visitors cannot preview; staff preview through their own access rules', async ({ page, request }) => {
    const t = await apiToken(request, 'contributor@orange.test')
    const pw = await (await request.get('/api/departments?where[slug][equals]=public-works')).json()
    const fin = await (await request.get('/api/departments?where[slug][equals]=finance')).json()
    const draft = await (await request.post('/api/notices', { headers: { Authorization: `JWT ${t}` }, data: { title: `Preview draft ${Date.now()}`, slug: `pv-${Date.now()}`, summary: 'Draft for preview', kind: 'general', department: pw.docs[0].id } })).json()
    const dataT = await apiToken(request, 'admin@orange.test')
    const other = await (await request.post('/api/notices', { headers: { Authorization: `JWT ${dataT}` }, data: { title: 'Finance draft', slug: `pvf-${Date.now()}`, summary: 'x', kind: 'general', department: fin.docs[0].id } })).json()

    const anon = await request.get(`/preview/notices/${draft.doc.id}`)
    expect(await anon.text()).toContain('Sign in to preview')
    expect(await anon.text()).not.toContain('Draft for preview')

    await login(page, 'contributor@orange.test')
    await page.goto(`/preview/notices/${draft.doc.id}`)
    await expect(page.getByText(/Preview — Draft\. Not visible to the public/)).toBeVisible()
    await expect(page.getByText('Draft for preview')).toBeVisible()
    const res = await page.goto(`/preview/notices/${other.doc.id}`)
    expect(res?.status()).toBe(404) // another department's draft
  })
})
