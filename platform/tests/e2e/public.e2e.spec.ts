import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = ['/', '/explore', '/projects', '/projects/sample-resurfacing-example-avenue', '/transparency/budget', '/government/meetings',
  '/government/meetings/sample-council-meeting-past', '/government/legislation', '/government/legislation/demo-ordinance-3-2026',
  '/services', '/services/pay-a-bill', '/notices', '/calendar', '/search?q=ordinance', '/report-a-concern', '/accessibility']

test.describe('accessibility (axe, WCAG 2.0/2.1/2.2 A+AA rules) @mobile', () => {
  for (const path of PAGES) {
    test(`no axe violations: ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('load')
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('.maplibregl-canvas').analyze()
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} — ${v.nodes[0]?.target}`)).toEqual([])
    })
  }
})

test('skip link is first in tab order and moves focus to main', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('reflows at 320px without horizontal scrolling @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const p of ['/', '/projects', '/transparency/budget', '/government/meetings/sample-council-meeting-past', '/explore']) {
    await page.goto(p)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, p).toBeLessThanOrEqual(0)
  }
})

test('mobile menu opens and navigates by keyboard @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.goto('/')
  await page.getByText('Menu', { exact: true }).click()
  await page.getByRole('navigation', { name: 'Main (mobile)' }).getByRole('link', { name: 'Projects' }).click()
  await expect(page).toHaveURL(/\/projects$/)
})

test('project filters are shareable and survive the map/list toggle', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('combobox', { name: 'Status' }).selectOption('construction')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/phase=construction/)
  await expect(page.getByRole('status').first()).toHaveText('1 project match.')
  await page.getByRole('link', { name: 'List only' }).click()
  await expect(page).toHaveURL(/phase=construction.*view=list|view=list.*phase=construction/)
  await expect(page.locator('table tbody tr')).toHaveCount(1)
  await expect(page.locator('.maplibregl-map')).toHaveCount(0)
})

test('map view renders a map alongside the equivalent list', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('table')).toBeVisible()
})

test('budget chart table and CSV export agree', async ({ page, request }) => {
  await page.goto('/transparency/budget?year=2025')
  const total = await page.locator('table').first().locator('tbody tr', { hasText: 'FY 2025' }).locator('td').last().innerText()
  const csv = await (await request.get('/data/budget.csv?year=2025')).text()
  const rows = csv.trim().split('\r\n').slice(1).map((l) => l.split(','))
  const sum = rows.filter((r) => r[0] === '2025' && r[3] === 'expenditure').reduce((a, r) => a + Math.round(Number(r[9] || 0) * 100), 0)
  expect(total).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(sum / 100))
  expect(csv).toContain('ILLUSTRATIVE')
  await expect(page.getByText('ILLUSTRATIVE DATA')).toBeVisible()
})

test('budget nulls display as "Not available"', async ({ page }) => {
  await page.goto('/transparency/budget')
  await expect(page.locator('tr', { hasText: 'FY 2022' }).getByText('Not available')).toBeVisible()
})

test('meeting agenda links to legislation, which shows its vote and actual outcome', async ({ page }) => {
  await page.goto('/government/meetings/sample-council-meeting-past')
  await page.getByRole('link', { name: 'DEMO Ordinance 3-2026' }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DEMO Ordinance 3-2026')
  await expect(page.locator('.badge', { hasText: 'Tabled' }).first()).toBeVisible()
  await expect(page.getByRole('table')).toContainText('Member A (sample)')
})

test('search ranks an exact legislation identifier first', async ({ page }) => {
  await page.goto('/search?q=' + encodeURIComponent('DEMO Resolution 2-2026'))
  await expect(page.locator('ol li h2 a').first()).toContainText('DEMO Resolution 2-2026')
})

test('concern form validates, then returns a real reference number', async ({ page }) => {
  await page.goto('/report-a-concern')
  await page.getByLabel('Where is it?').fill('Main St')
  await page.getByLabel('Describe the problem').fill('short')
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeVisible()
  await page.getByLabel('Describe the problem').fill('Streetlight has been out for a week at this corner.')
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page.getByText(/reference OR-\d{8}-[A-Z0-9]{6}/)).toBeVisible()
})

test('old official URLs redirect to new routes', async ({ request }) => {
  const r = await request.get('/181/Online-Bill-Payment', { maxRedirects: 0 })
  expect([301, 308]).toContain(r.status())
  expect(r.headers()['location']).toBe('/services/pay-a-bill')
})

test('Spanish toggle shows an explicit fallback notice for untranslated content', async ({ page }) => {
  await page.goto('/services/pay-a-bill')
  await page.getByRole('link', { name: 'Español' }).click()
  await expect(page.getByText('Esta página todavía no está disponible en español')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await page.getByRole('link', { name: 'English' }).click()
})
