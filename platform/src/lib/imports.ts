/**
 * Budget CSV import: mapping → dry run (validate, dedupe) → transactional
 * commit → rollback. Import never publishes; the dataset still goes through
 * review. Commit is idempotent (a committed batch is not re-applied).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from 'payload'
import { parseDollarsToCents } from './money'

const CATEGORY_ALIASES: Record<string, string> = {
  'public safety': 'public_safety', 'public works': 'public_works', 'parks & recreation': 'parks_recreation',
  'parks and recreation': 'parks_recreation', 'general government': 'general_government', other: 'other',
  'property taxes': 'property_taxes', 'local revenues': 'local_revenues', 'state aid': 'state_aid', 'other revenues': 'other_revenues',
}
const norm = (s: unknown) => String(s ?? '').trim()
export const rowKeyOf = (r: { fund: string; department?: string | null; account?: string | null; description: string }) =>
  [r.fund, r.department ?? '', r.account ?? '', r.description].map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('|')

export type RowError = { row: number; field: string; message: string }
export type ParsedRow = { rowKey: string; fund: string; department: string | null; category: string; account: string | null; description: string; amountCents: number | null; direction: 'expenditure' | 'revenue' }

export function validateCsv(csvText: string, mapping: Record<string, string>) {
  const MAX_ROWS = 20_000
  const records: Record<string, string>[] = parse(csvText, { columns: true, skip_empty_lines: true, trim: true, bom: true })
  const errors: RowError[] = []
  const rows: ParsedRow[] = []
  const seen = new Map<string, number>()
  let duplicatesInFile = 0
  if (records.length > MAX_ROWS) errors.push({ row: 0, field: '*', message: `File has more than ${MAX_ROWS} rows.` })
  const headers = records[0] ? Object.keys(records[0]) : []
  for (const [field, col] of Object.entries(mapping)) {
    if (['fund', 'description', 'category', 'amount'].includes(field) && !headers.includes(col)) errors.push({ row: 0, field, message: `Column "${col}" not found in file.` })
  }
  if (errors.length) return { rows, errors, total: records.length, duplicatesInFile }
  records.slice(0, MAX_ROWS).forEach((rec, i) => {
    const n = i + 2 // spreadsheet row number (header is row 1)
    const get = (f: string) => (mapping[f] ? norm(rec[mapping[f]]) : '')
    const fund = get('fund'), description = get('description')
    const catRaw = get('category').toLowerCase()
    const category = CATEGORY_ALIASES[catRaw] ?? (Object.values(CATEGORY_ALIASES).includes(catRaw) ? catRaw : null)
    const dirRaw = get('direction').toLowerCase()
    const direction = dirRaw === 'revenue' ? 'revenue' : dirRaw === '' || dirRaw === 'expenditure' ? 'expenditure' : null
    let amountCents: number | null = null
    try { amountCents = parseDollarsToCents(get('amount')) } catch (e) { errors.push({ row: n, field: 'amount', message: (e as Error).message }) }
    if (!fund) errors.push({ row: n, field: 'fund', message: 'Fund is required.' })
    if (!description) errors.push({ row: n, field: 'description', message: 'Description is required.' })
    if (!category) errors.push({ row: n, field: 'category', message: `Unknown category "${get('category')}".` })
    if (!direction) errors.push({ row: n, field: 'direction', message: `Direction must be "expenditure" or "revenue".` })
    if (fund && description && category && direction) {
      const r: ParsedRow = { fund, department: get('department') || null, account: get('account') || null, description, category, amountCents, direction, rowKey: '' }
      r.rowKey = rowKeyOf(r)
      if (seen.has(r.rowKey)) { duplicatesInFile++; errors.push({ row: n, field: '*', message: `Duplicate of row ${seen.get(r.rowKey)}.` }) }
      else { seen.set(r.rowKey, n); rows.push(r) }
    }
  })
  return { rows, errors, total: records.length, duplicatesInFile }
}

async function loadBatch(payload: Payload, id: number) {
  const batch = await payload.findByID({ collection: 'import-batches', id, depth: 1, overrideAccess: true })
  const dir = process.env.PRIVATE_UPLOAD_DIR ?? 'private-uploads/imports'
  const file = path.resolve(dir, path.basename(String(batch.filename)))
  return { batch, csvText: await readFile(file, 'utf8') }
}

const setBatch = (payload: Payload, id: number, data: Record<string, unknown>, req?: any) =>
  payload.update({ collection: 'import-batches', id, data: { ...data, requestedAction: 'none' }, overrideAccess: true, context: { system: true }, req })

export async function runImport(payload: Payload, batchId: number, action: 'dry_run' | 'commit' | 'rollback') {
  const { batch, csvText } = await loadBatch(payload, batchId)
  const dataset = batch.dataset as { id: number; workflowStatus: string }
  if (action !== 'dry_run' && ['published', 'scheduled', 'approved'].includes(dataset.workflowStatus)) {
    await setBatch(payload, batchId, { report: { ...(batch.report as object), lastError: 'Dataset is approved or published. Return it to draft before changing rows.' } })
    return 'blocked'
  }
  if (action === 'commit' && batch.status === 'committed') return 'already_committed'

  if (action === 'rollback') {
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    try {
      await payload.delete({ collection: 'budget-lines', where: { importBatch: { equals: batchId } }, overrideAccess: true, req })
      await setBatch(payload, batchId, { status: 'rolled_back' }, req)
      await commitTransaction(req)
      return 'rolled_back'
    } catch (e) { await killTransaction(req); throw e }
  }

  const v = validateCsv(csvText, batch.mapping as Record<string, string>)
  const existing = await payload.find({ collection: 'budget-lines', where: { and: [{ dataset: { equals: dataset.id } }, { rowKey: { in: v.rows.map((r) => r.rowKey) } }] }, limit: 0, pagination: false, depth: 0, overrideAccess: true })
  const existingKeys = new Set(existing.docs.map((d) => d.rowKey))
  const duplicatesExisting = v.rows.filter((r) => existingKeys.has(r.rowKey)).length
  const report = { total: v.total, valid: v.rows.length, duplicatesInFile: v.duplicatesInFile, duplicatesExisting, errors: v.errors.slice(0, 500), errorCount: v.errors.length, ranAt: new Date().toISOString(), action }

  if (action === 'dry_run' || v.errors.length || duplicatesExisting) {
    const status = v.errors.length || duplicatesExisting ? 'invalid' : 'validated'
    await setBatch(payload, batchId, { status, report })
    return status
  }
  if (batch.status !== 'validated') {
    await setBatch(payload, batchId, { report: { ...report, lastError: 'Run a successful dry run before committing.' } })
    return 'needs_dry_run'
  }
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    for (const r of v.rows) {
      await payload.create({ collection: 'budget-lines', overrideAccess: true, req, data: { ...r, category: r.category as any, dataset: dataset.id, importBatch: batchId } })
    }
    await setBatch(payload, batchId, { status: 'committed', report: { ...report, committed: v.rows.length } }, req)
    await commitTransaction(req)
    return 'committed'
  } catch (e) {
    await killTransaction(req)
    await setBatch(payload, batchId, { status: 'failed', report: { ...report, lastError: (e as Error).message } })
    throw e
  }
}
