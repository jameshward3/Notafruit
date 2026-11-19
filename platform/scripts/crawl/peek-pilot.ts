import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(process.argv[2])
const v = (c: any) => { const x = c.value; return x && typeof x === 'object' ? (x.result !== undefined ? x.result : x.richText ? x.richText.map((t: any) => t.text).join('') : x.text ?? x.hyperlink ?? (x instanceof Date ? x.toISOString().slice(0, 10) : JSON.stringify(x))) : x }
console.log('sheets:', wb.worksheets.map((w) => w.name).join(' | '))
const raw = wb.getWorksheet('Raw Data from UFBs')!
console.log('raw header:', raw.getRow(2).values)
raw.eachRow((row, n) => { if (String(v(row.getCell(1))) === '0717') console.log(n, [1, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => v(row.getCell(i))).join(' | ')) })
const sum = wb.getWorksheet('Summary By Town')!
const hdr2 = (sum.getRow(2).values as any[]).map((x) => x), hdr3 = sum.getRow(3).values as any[]
sum.eachRow((row, n) => { if (String(v(row.getCell(1))) === '0717') { const out: string[] = []; row.eachCell((c, i) => out.push(`${hdr2[i] ?? ''} ${hdr3[i] ?? ''}=${v(c)}`)); console.log('summary', out.join(' | ')) } })
for (const ws of wb.worksheets) {
  ws.eachRow((row, n) => row.eachCell((c) => { const s = String(v(c) ?? ''); if (/dca|nj\.gov|source|user friendly|http/i.test(s) && s.length < 400 && n < 40) console.log(`${ws.name}!${c.address}: ${s}`) }))
}
