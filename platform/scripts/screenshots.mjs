import { chromium, devices } from '@playwright/test'
const pages = { home: '/', explore: '/explore', projects: '/projects', budget: '/transparency/budget', meeting: '/government/meetings/sample-council-meeting-past' };
const base = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000'
;(async () => {
  const b = await chromium.launch();
  for (const [mode, ctxOpts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
    const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
    for (const [n, u] of Object.entries(pages)) {
      await p.goto(base + u, { waitUntil: 'load' }); await p.waitForTimeout(2500);
      await p.screenshot({ path: `docs/screenshots/${n}-${mode}.png`, fullPage: true, type: 'png' });
    }
    await ctx.close();
  }
  await b.close();
})();
