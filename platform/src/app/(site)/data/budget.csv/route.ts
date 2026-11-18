import { NextRequest } from 'next/server'
import { parseBudgetParams } from '@/lib/budgetParams'
import { budgetView } from '@/lib/budget'
import { toCsv } from '@/lib/csv'
import { getClient } from '@/lib/payload'

/** CSV export of exactly the filtered rows behind the chart and table. */
export async function GET(req: NextRequest) {
  const f = parseBudgetParams(Object.fromEntries(req.nextUrl.searchParams.entries()))
  const v = await budgetView(await getClient(), f)
  const rows = v.lines.map((l: any) => [l.dataset?.fiscalYear, l.dataset?.basis, l.dataset?.kind, l.direction, l.fund, l.department, l.category, l.account, l.description,
    l.amountCents == null ? '' : (l.amountCents / 100).toFixed(2), l.dataset?.verificationStatus === 'demo' ? 'ILLUSTRATIVE' : l.dataset?.verificationStatus, l.dataset?.sourceDescription])
  const csv = toCsv(['fiscal_year', 'basis', 'dataset_kind', 'direction', 'fund', 'department', 'category', 'account', 'description', 'amount_usd', 'verification', 'source'], rows)
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="orange-budget.csv"', 'cache-control': 'public, max-age=300' } })
}
