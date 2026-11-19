/** Lists appropriation rows whose own arithmetic does not hold (reserved ≠ modified − paid). */
import { readFileSync } from 'node:fs'
import { parseBudget } from './budget-parse'
const rows = parseBudget(readFileSync(process.argv[2], 'utf8'), 2026).filter((r) => r.direction === 'expenditure')
for (const r of rows) {
  const ok = r.priorModified == null || r.priorActual == null || Math.abs((r.priorModified - r.priorActual) - (r.priorReserved ?? 0)) <= 1
  if (!ok) console.log(`${r.account} | ${r.program ?? ''} | ${r.item} | fy ${r.fy} prior ${r.prior} em ${r.priorEmergency} mod ${r.priorModified} paid ${r.priorActual} res ${r.priorReserved}`)
}
