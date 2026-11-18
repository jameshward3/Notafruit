/** Dev helper: print the extracted text of a cached document URL. */
import { join } from 'node:path'
import { CRAWL_DIR, readManifest } from './fetch'
import { pdfText } from './text'

const url = process.argv[2]
const row = readManifest(new URL(url).hostname).get(url)
if (!row?.file) { console.log('not cached', url); process.exit(1) }
console.log((await pdfText(join(CRAWL_DIR, row.file))).slice(0, Number(process.argv[3] ?? 6000)))
