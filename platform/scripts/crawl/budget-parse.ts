/**
 * Parses the text of a New Jersey municipal budget (Division of Local Government Services
 * format, as published by the City of Orange Township) into line items.
 *
 * Current Fund revenue rows:        <label> <FCOA> <anticipated FY> <anticipated FY-1> <realized FY-1>
 * Current Fund appropriation rows:  <label> <FCOA> [<1|2>] <FY> <FY-1> [<emergency>] <FY-1 as modified> <paid or charged> <reserved>
 * Water & Sewer Utility rows:       same, FCOA optional.
 * "-" and "XXXX…" are empty cells. Rows coded 34-xxx (and labels starting "Total") are subtotals and skipped.
 */
export type Line = {
  fund: 'Current fund' | 'Water & sewer utility'
  direction: 'revenue' | 'expenditure'
  section: string            // e.g. 'Operations within CAPS', 'Section F: Public and private revenues offset with appropriations'
  program: string | null     // department / program heading, e.g. 'Mayor’s Office'
  item: string               // e.g. 'Salaries and Wages', 'Washington Dodd (PILOT)'
  account: string | null     // FCOA code, e.g. '20-110'
  objectType: 'salaries' | 'other_expenses' | null
  fy: number | null          // amount for the budget year (dollars)
  prior: number | null       // amount in the prior year budget
  priorModified: number | null // prior year as modified (emergencies + transfers) — appropriations only
  priorActual: number | null // prior year paid or charged (appropriations) / realized in cash (revenues)
  priorReserved: number | null
  priorEmergency: number | null
}

const NUM = String.raw`(?:-?[\d,]+\.\d{2}|-|X{3,})`
const ROW = new RegExp(String.raw`^(.*?)\s*(?:(\d{2}-\d{3}))?(?:\s+([12]))?((?:\s+${NUM}){2,6})\s*$`)
const val = (t: string | undefined) => (t == null || t === '-' || /^X+$/.test(t) ? null : Number(t.replace(/,/g, '')))
const titleCase = (s: string) => (/[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(And|Of|The|For|To|In|On)\b/g, (m) => m.toLowerCase()))
const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*-\s*-\s*$/, '').trim()

/** Names for rows whose label the PDF text layer drops. */
const FCOA_NAMES: Record<string, string> = { '46-875': 'Special Emergency Authorizations', '46-870': 'Emergency Authorizations', '23-225': 'Unemployment Compensation Insurance' }

type Cols = Pick<Line, 'fy' | 'prior' | 'priorModified' | 'priorActual' | 'priorReserved' | 'priorEmergency'>
const near = (a: number | null, b: number | null) => a != null && b != null && Math.abs(a - b) <= 1
/**
 * Appropriation rows print 6 cells (FY, FY-1, emergency, FY-1 modified, paid/charged, reserved), but the
 * text layer drops empty cells without a placeholder. Decide which cells are present using the row's
 * own arithmetic (reserved = modified − paid; modified = FY-1 + emergency ± transfers) and its label.
 */
function assignAppropriation(n: (number | null)[], label: string): Cols {
  const none: Cols = { fy: null, prior: null, priorModified: null, priorActual: null, priorReserved: null, priorEmergency: null }
  const [a, b, c, d, e, f] = n
  if (n.length >= 6) return { fy: a, prior: b, priorEmergency: c, priorModified: d, priorActual: e, priorReserved: f }
  if (n.length === 5) return { ...none, fy: a, prior: b, priorModified: c, priorActual: d, priorReserved: e }
  if (n.length === 4) {
    // Emergency-only rows (no FY or FY-1 budget): emergency, modified, paid, reserved.
    if (/emergency/i.test(label) && near(a, b)) return { ...none, priorEmergency: a, priorModified: b, priorActual: c, priorReserved: d }
    // FY-1 budget only (no FY appropriation): FY-1, modified, paid, reserved. Typical of a grant
    // appropriated and fully charged last year ("X X X -" with the leading blank FY cell dropped).
    if (a != null && near(a, b) && near(b, c) && !d) return { ...none, prior: a, priorModified: b, priorActual: c, priorReserved: d }
    if (d != null && near(d, (b ?? 0) - (c ?? 0))) return { ...none, prior: a, priorModified: b, priorActual: c, priorReserved: d }
    return { ...none, fy: a, prior: b, priorModified: c, priorActual: d }
  }
  if (n.length === 3) {
    if (c != null && b != null && a != null && near(c, a - b) && c !== 0) return { ...none, priorModified: a, priorActual: b, priorReserved: c }
    return { ...none, fy: a, prior: b, priorModified: c }
  }
  return { ...none, fy: a ?? null, prior: b ?? null }
}

export function parseBudget(text: string, fy: number): Line[] {
  const lines = text.split('\n').map((l) => l.trim())
  const out: Line[] = []
  let region: 'none' | 'revenue' | 'approp' | 'w_revenue' | 'w_approp' = 'none'
  let section = ''
  let program: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    // ---- regions
    if (/^1\. Surplus Anticipated\s+08-101/.test(l) && region === 'none') { region = 'revenue'; section = 'Surplus anticipated' }
    if (/^8\. GENERAL APPROPRIATIONS/.test(l) && region === 'revenue') { region = 'approp'; program = null }
    if (/^9\. Total General Appropriations/.test(l) && region === 'approp') { region = 'none'; continue }
    if (/^10\. DEDICATED REVENUES FROM WATER/.test(l)) { region = 'w_revenue'; section = 'Water & sewer revenues'; program = null }
    if (/^11\. APPROPRIATIONS FOR WATER/.test(l)) { region = 'w_approp'; program = null }
    if (/^TOTAL WATER & SEWER UTILITY APPROPRIATIONS/.test(l)) { region = 'none'; continue }
    if (region === 'none') continue

    // ---- section headings
    if (region === 'revenue' && !/^Total/.test(l)) {
      const SECTIONS: [RegExp, string][] = [
        [/^1\. Surplus Anticipated/, 'Surplus anticipated'],
        [/Section A: Local Revenues/, 'Section A: Local revenues'],
        [/Section B: State Aid/, 'Section B: State aid'],
        [/Section C: Dedicated Uniform Construction Code/, 'Section C: Construction code fees'],
        [/Section D/, 'Section D: Shared service agreements'],
        [/Section E/, 'Section E: Special items of revenue'],
        [/Section F/, 'Section F: Public and private grants offset with appropriations'],
        [/Section G/, 'Section G: Other special items (incl. PILOTs)'],
        [/^4\. Receipts from Delinquent Taxes/, 'Receipts from delinquent taxes'],
        [/^6\. Amount to be Raised by Taxes/, 'Amount to be raised by taxes'],
      ]
      const hit = SECTIONS.find(([re]) => re.test(l))
      if (hit) section = hit[1]
    }
    if (region === 'approp') {
      if (/^\(A\) Operations - within "CAPS"/.test(l)) section = 'Operations within CAPS'
      else if (/^\(A\) Operations - Excluded from "CAPS"/.test(l)) section = 'Operations excluded from CAPS'
      else if (/^\(C\) Capital Improvements/.test(l)) section = 'Capital improvements'
      else if (/^\(D\) Municipal Debt Service/.test(l)) section = 'Municipal debt service'
      else if (/^\(1\) DEFERRED CHARGES/.test(l)) section = 'Deferred charges'
      else if (/^\(2\) STATUTORY EXPENDITURES/.test(l)) { section = 'Statutory expenditures (pensions, social security)'; program = null }
      else if (/Public and Private Programs Offset by Revenues/i.test(l)) { section = 'Grant programs offset by revenues'; program = null }
      else if (/Interlocal Municipal Service Agreements/i.test(l)) section = 'Shared service agreements'
    }
    if (region === 'w_approp') {
      const s = l.match(/^(Operating|Capital Improvements|Debt Service|DEFERRED CHARGES|STATUTORY EXPENDITURES|Deferred Charges and Statutory Expenditures):/i)
      if (s) { section = `Water & sewer — ${titleCase(s[1]).toLowerCase()}`; program = null }
    }

    // ---- department / program headings ("Mayor's Office - -")
    if (/\s-\s-$/.test(l) && !/\d/.test(l.replace(/\s-\s-$/, '')) && clean(l).length > 2) { program = titleCase(clean(l)); continue }
    if (/^- -$|^-$/.test(l)) continue

    // ---- rows
    const m = l.match(ROW)
    if (!m) continue
    let label = clean(m[1])
    const account = m[2] ?? null
    const toks = m[4].trim().split(/\s+/)
    if (!account && region !== 'w_approp' && region !== 'w_revenue') continue
    if (account?.startsWith('34-') || /-999$/.test(account ?? '') || /^(Total|Subtotal|\(H-|\(O\))/i.test(label) || /\(Sheet /.test(label)) continue
    // A "Total …" label that wraps puts its figures on the following line.
    if (/^Total\b/i.test(lines[i - 1] ?? '') && !/\d{2}-\d{3}.*\d\.\d{2}/.test(lines[i - 1])) continue
    if (/^\d\./.test(label) && !/Surplus Anticipated$|Delinquent/.test(label)) continue
    if (!label) {
      // Label printed after the row by the PDF text layer.
      const next = lines.slice(i + 1, i + 3).find((x) => x && !/\d{2}-\d{3}|^[-X\s]+$|^\(|^Total/.test(x))
      label = next ? clean(next) : FCOA_NAMES[account ?? ''] ?? `Account ${account}`
    }
    label = label.replace(/^[a-z]\)\s*/, '').replace(/^\d+\.\s*/, '').replace(/^\([A-Z]\)\s*/, '')
    if (toks.every((t) => val(t) == null)) continue
    const n = toks.map(val)
    const isApprop = region === 'approp' || region === 'w_approp'
    const objectType = /^salaries/i.test(label) ? 'salaries' : /^other expenses/i.test(label) ? 'other_expenses' : null
    let line: Line
    if (isApprop) {
      const c = assignAppropriation(n, label)
      line = { fund: region === 'approp' ? 'Current fund' : 'Water & sewer utility', direction: 'expenditure', section: section || 'Appropriations', program, item: label, account, objectType, ...c }
    } else {
      // Two printed figures: equal pairs are "anticipated FY-1 / realized FY-1" (budget-year cell blank); otherwise "FY / FY-1".
      const blankFy = n.length === 2 && n[0] != null && n[0] === n[1]
      line = { fund: region === 'revenue' ? 'Current fund' : 'Water & sewer utility', direction: 'revenue', section: section || 'Revenues', program: null, item: label, account, objectType: null,
        fy: blankFy ? null : n[0] ?? null, prior: blankFy ? n[0] : n[1] ?? null, priorModified: null, priorActual: blankFy ? n[1] : n[2] ?? null, priorReserved: null, priorEmergency: null }
    }
    out.push(line)
  }
  return out
}

// Dry run: tsx scripts/crawl/budget-parse.ts <text file> <fiscal year>
if (process.argv[1]?.replace(/\\/g, '/').endsWith('crawl/budget-parse.ts')) {
  const { readFileSync } = await import('node:fs')
  const lines = parseBudget(readFileSync(process.argv[2], 'utf8'), Number(process.argv[3]))
  const sum = (f: (l: Line) => boolean, k: keyof Line) => lines.filter(f).reduce((a, l) => a + ((l[k] as number) ?? 0), 0)
  const cf = (d: string) => (l: Line) => l.fund === 'Current fund' && l.direction === d
  const fmt = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 2 })
  console.log('rows', lines.length)
  console.log('CF appropriations FY', fmt(sum(cf('expenditure'), 'fy')), ' prior', fmt(sum(cf('expenditure'), 'prior')), ' modified', fmt(sum(cf('expenditure'), 'priorModified')), ' paid', fmt(sum(cf('expenditure'), 'priorActual')))
  console.log('CF revenues FY', fmt(sum(cf('revenue'), 'fy')), ' prior', fmt(sum(cf('revenue'), 'prior')), ' realized', fmt(sum(cf('revenue'), 'priorActual')))
  console.log('W&S appropriations FY', fmt(sum((l) => l.fund !== 'Current fund' && l.direction === 'expenditure', 'fy')), ' prior', fmt(sum((l) => l.fund !== 'Current fund' && l.direction === 'expenditure', 'prior')))
  const bySec = new Map<string, number>()
  for (const l of lines.filter(cf('expenditure'))) bySec.set(l.section, (bySec.get(l.section) ?? 0) + (l.fy ?? 0))
  console.log([...bySec].map(([k, v]) => `  ${k}: ${fmt(v)}`).join('\n'))
  const revSec = new Map<string, number>()
  for (const l of lines.filter(cf('revenue'))) revSec.set(l.section, (revSec.get(l.section) ?? 0) + (l.fy ?? 0))
  console.log([...revSec].map(([k, v]) => `  ${k}: ${fmt(v)}`).join('\n'))
  if (process.argv[4]) for (const r of lines.filter((l) => l.fund === 'Current fund' && new RegExp(process.argv[4], 'i').test(l.section)).sort((a, b) => (b.fy ?? 0) - (a.fy ?? 0)).slice(0, 25)) console.log(`  ${r.account} | ${r.program ?? ''} | ${r.item} | ${r.fy} | ${r.prior} | em ${r.priorEmergency}`)
}
