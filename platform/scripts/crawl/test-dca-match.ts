import { readFileSync } from 'node:fs'
import { parseBudget } from './budget-parse'
import { matchDca, DCA } from '../../src/lib/dcaPilot'
const rows = parseBudget(readFileSync('private-uploads/crawl/budget-6373.txt', 'utf8'), 2026).filter((r) => /PILOT/.test(r.item) && !/settlement/i.test(r.item))
const used = new Set<string>()
for (const r of rows) { const m = matchDca(r.item); if (m) used.add(m.project); console.log(`${r.item.padEnd(48)} -> ${m ? `${m.project} (AV ${m.av}, at rate ${Math.round(m.taxesAtRate ?? 0)})` : '—'}`) }
console.log('DCA projects not matched:', DCA.projects.filter((p) => !used.has(p.project)).map((p) => p.project).join('; '))
