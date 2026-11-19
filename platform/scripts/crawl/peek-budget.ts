/** Fetch (cached) and print text stats for City budget PDFs. Usage: tsx scripts/crawl/peek-budget.ts <DocumentCenter id> [...] */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CRAWL_DIR, get } from './fetch'
import { pdfText } from './text'
for (const id of process.argv.slice(2)) {
  const url = `https://orangenj.gov/DocumentCenter/View/${id}`
  const { row } = await get(url)
  if (row.status !== 200 || !row.file) { console.log(id, 'status', row.status, row.contentType); continue }
  const text = await pdfText(join(CRAWL_DIR, row.file))
  writeFileSync(join(CRAWL_DIR, `budget-${id}.txt`), text)
  console.log(id, row.contentType, row.bytes, 'bytes, text chars', text.length)
}
