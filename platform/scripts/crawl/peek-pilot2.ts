import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(process.argv[2])
const v = (c: any) => { const x = c.value; return x && typeof x === 'object' ? (x.result !== undefined ? x.result : x.richText ? x.richText.map((t: any) => t.text).join('') : x instanceof Date ? x.toISOString().slice(0, 10) : '(formula, no cached value)') : x }
const s = wb.getWorksheet('Summary By Town')!
const h2 = s.getRow(2), h3 = s.getRow(3)
for (let c = 1; c <= 71; c++) console.log(c, s.getColumn(c).letter, `${v(h2.getCell(c)) ?? ''} / ${v(h3.getCell(c)) ?? ''}`, '| 0717:', v(s.getRow(213).getCell(c)), '| row5:', v(s.getRow(5).getCell(c)))
let filled = 0; for (let r = 4; r <= 567; r++) if (typeof v(s.getRow(r).getCell(36)) === 'number') filled++
console.log('rows with cached total billing', filled)
for (const r of [568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580]) { const row = s.getRow(r); const out: string[] = []; row.eachCell((c) => { const x = v(c); if (x !== '' && x != null) out.push(`${c.address}=${String(x).slice(0, 30)}`) }); if (out.length) console.log(r, out.slice(0, 12).join(' | ')) }
