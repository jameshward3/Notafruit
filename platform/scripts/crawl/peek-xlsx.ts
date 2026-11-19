/** Prints sheets, tables, headers, first rows and formulas of a workbook. Usage: tsx scripts/crawl/peek-xlsx.ts <file> */
import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(process.argv[2])
for (const ws of wb.worksheets) {
  console.log(`== ${ws.name}  rows=${ws.rowCount} cols=${ws.columnCount} state=${ws.state} tables=${Object.keys((ws as any).tables ?? {}).join(',')}`)
  for (let r = 1; r <= Math.min(ws.rowCount, 8); r++) {
    const row = ws.getRow(r)
    const vals: string[] = []
    row.eachCell({ includeEmpty: false }, (c, n) => { const v: any = c.value; vals.push(`${c.address}=${v && typeof v === 'object' ? (v.formula ? `{=${v.formula}} ${v.result ?? ''}` : v.richText ? v.richText.map((t: any) => t.text).join('') : v.text ?? JSON.stringify(v).slice(0, 60)) : v}`) })
    if (vals.length) console.log('  ' + vals.slice(0, 18).join(' | ').slice(0, 900))
  }
}
