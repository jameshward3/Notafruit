/**
 * Imports the NJ Department of Community Affairs (Division of Local Government Services)
 * "PILOT Database and Viewer" workbook: every PILOT agreement reported in municipal User Friendly
 * Budgets, with its assessed value, and each town's 2025 tax rate, levy share and budget.
 *
 *   tsx scripts/crawl/import-dca-pilot.ts "<path to PILOT Database and Viewer.xlsx>"
 *
 * Writes:
 *   public/data/dca-pilot/pilot-database.json  statewide data for the interactive viewer
 *   src/data/dca-pilot-orange.json             Orange (DCA municode 0717) figures for the budget dashboard
 * Taxes "if billed at the normal rate" = assessed value × the town's 2025 total tax rate (per $100),
 * as in DCA's summary sheet. The municipal share of the difference is DCA's "municipal subsidy".
 * Recomputed from the raw rows and checked against DCA's own cached Orange totals.
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import ExcelJS from 'exceljs'

const FILE = process.argv[2]
if (!FILE) { console.error('usage: import-dca-pilot.ts <xlsx>'); process.exit(1) }
export const DCA_SOURCE = {
  title: 'PILOT Database and Viewer — NJ Department of Community Affairs, Division of Local Government Services',
  url: 'https://www.nj.gov/dca/dlgs/misc_docs/PILOT%20Database%20and%20Viewer.xlsx',
  page: 'https://www.nj.gov/dca/dlgs/resources/',
}

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(FILE)
const v = (c: ExcelJS.Cell): any => { const x: any = c.value; if (x instanceof Date) return x.toISOString().slice(0, 10); return x && typeof x === 'object' ? (x.result !== undefined ? (x.result instanceof Date ? x.result.toISOString().slice(0, 10) : x.result) : x.richText ? x.richText.map((t: any) => t.text).join('') : null) : x }
const num = (x: any) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
const str = (x: any) => (x == null ? '' : String(x).trim())
const date = (x: any) => { const s = str(x); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null }
const TYPES: Record<string, string> = { 'Aff. Housing': 'Affordable housing', 'Comm./Indust.': 'Commercial / industrial', 'Market Rate Housing': 'Market-rate housing', 'Mixed Income Housing': 'Mixed-income housing', 'Non-Profit/Charitable': 'Non-profit / charitable', 'Other Housing': 'Other housing', Other: 'Other' }

// ---- towns (Summary By Town, rows 4–567)
const s = wb.getWorksheet('Summary By Town')!
type Town = { code: string; name: string; county: string; region: string; type: string; rate: number | null; totalAV: number | null; munShare: number | null; budget: number | null; neighbors: string[] }
const towns: Town[] = []
const cached = new Map<string, { taxes: number | null; subsidy: number | null; billing: number | null }>()
for (let r = 4; r <= 567; r++) {
  const row = s.getRow(r)
  const code = str(v(row.getCell(1))).padStart(4, '0')
  if (!/^\d{4}$/.test(code)) continue
  towns.push({
    code, name: str(v(row.getCell(2))), county: str(v(row.getCell(3))), region: str(v(row.getCell(5))), type: str(v(row.getCell(6))),
    rate: num(v(row.getCell(40))), totalAV: num(v(row.getCell(39))), munShare: num(v(row.getCell(41))), budget: num(v(row.getCell(44))),
    neighbors: Array.from({ length: 16 }, (_, i) => str(v(row.getCell(47 + i)))).filter((x) => /^\d{4}$/.test(x)),
  })
  cached.set(code, { taxes: num(v(row.getCell(38))), subsidy: num(v(row.getCell(42))), billing: num(v(row.getCell(36))) })
}

// ---- projects (Raw Data from UFBs)
const raw = wb.getWorksheet('Raw Data from UFBs')!
type Project = { code: string; project: string; type: string; start: string | null; end: string | null; billing: number | null; av: number | null; ufbYear: number | null }
const projects: Project[] = []
raw.eachRow((row, n) => {
  if (n < 3) return
  const code = str(v(row.getCell(1))).padStart(4, '0')
  const project = str(v(row.getCell(4)))
  if (!/^\d{4}$/.test(code) || !project) return
  projects.push({ code, project, type: TYPES[str(v(row.getCell(5)))] ?? (str(v(row.getCell(5))) || 'Other'), start: date(v(row.getCell(6))), end: date(v(row.getCell(7))),
    billing: num(v(row.getCell(8))), av: num(v(row.getCell(9))), ufbYear: num(v(row.getCell(11))) })
})

// ---- totals per town, recomputed
const byCode = new Map(towns.map((t) => [t.code, t]))
export function townTotals(code: string) {
  const t = byCode.get(code)!
  const list = projects.filter((p) => p.code === code)
  const billing = list.reduce((a, p) => a + (p.billing ?? 0), 0)
  const av = list.reduce((a, p) => a + (p.av ?? 0), 0)
  const taxes = t.rate != null ? (av / 100) * t.rate : null
  const subsidy = taxes != null && t.munShare != null ? (taxes - billing) * t.munShare : null
  return { count: list.length, billing, av, taxes, gap: taxes != null ? taxes - billing : null, subsidy, avShare: t.totalAV ? av / t.totalAV : null, subsidyShareOfBudget: subsidy != null && t.budget ? subsidy / t.budget : null }
}

const o = townTotals('0717')
const c = cached.get('0717')!
const close = (a: number | null, b: number | null) => a != null && b != null && Math.abs(a - b) < 1
console.log(`Orange: ${o.count} PILOTs, billing ${o.billing}, AV ${o.av}, taxes at 2025 rate ${o.taxes?.toFixed(0)}, municipal subsidy ${o.subsidy?.toFixed(0)}`)
console.log(`DCA cached: billing ${c.billing}, taxes ${c.taxes?.toFixed(0)}, subsidy ${c.subsidy?.toFixed(0)}`)
if (!close(o.billing, c.billing) || !close(o.taxes, c.taxes) || !close(o.subsidy, c.subsidy)) throw new Error('Recomputed Orange totals do not match DCA\'s workbook; nothing written')
let checked = 0, mismatched = 0
for (const t of towns) { const k = cached.get(t.code)!; if (k.taxes == null) continue; checked++; if (!close(townTotals(t.code).taxes, k.taxes)) mismatched++ }
console.log(`statewide check: ${checked - mismatched}/${checked} towns with DCA cached totals match`)

const sha = createHash('sha256').update(readFileSync(FILE)).digest('hex')
const retrieved = new Date().toISOString().slice(0, 10)

// ---- statewide file for the viewer (compact arrays)
const out = {
  source: { ...DCA_SOURCE, sha256: sha, retrieved, note: 'PILOT agreements as reported by municipalities in their User Friendly Budgets (latest submission year shown per project). "If billed at the normal rate" = assessed value × the municipality\'s 2025 total tax rate.' },
  towns: towns.map((t) => [t.code, t.name, t.county, t.region, t.type, t.rate, t.totalAV, t.munShare, t.budget, t.neighbors]),
  projects: projects.map((p) => [p.code, p.project, p.type, p.start, p.end, p.billing, p.av, p.ufbYear]),
}
const pub = 'public/data/dca-pilot/pilot-database.json'
mkdirSync(dirname(pub), { recursive: true })
writeFileSync(pub, JSON.stringify(out))

// ---- Orange file for the budget dashboard
const orange = byCode.get('0717')!
const avg = (list: string[]) => {
  const rows = list.map(townTotals).filter((x) => x.count > 0)
  const mean = (k: 'count' | 'billing' | 'av' | 'taxes' | 'subsidy') => (rows.length ? rows.reduce((a, x) => a + (x[k] ?? 0), 0) / rows.length : null)
  return { towns: rows.length, count: mean('count'), billing: mean('billing'), av: mean('av'), taxes: mean('taxes'), subsidy: mean('subsidy') }
}
const essex = towns.filter((t) => t.county === orange.county).map((t) => t.code)
const sameType = towns.filter((t) => t.type === orange.type).map((t) => t.code)
const orangeFile = {
  source: out.source,
  town: { ...orange, ...o },
  projects: projects.filter((p) => p.code === '0717').map((p) => ({ ...p, taxesAtRate: p.av != null && orange.rate != null ? (p.av / 100) * orange.rate : null })),
  neighbors: orange.neighbors.map((code) => ({ code, name: byCode.get(code)?.name ?? code, ...townTotals(code) })),
  averages: { neighbors: avg(orange.neighbors), county: avg(essex), type: avg(sameType), state: avg(towns.map((t) => t.code)) },
}
writeFileSync('src/data/dca-pilot-orange.json', JSON.stringify(orangeFile, null, 1))
console.log(`wrote ${pub} (${towns.length} towns, ${projects.length} projects) and src/data/dca-pilot-orange.json`)
