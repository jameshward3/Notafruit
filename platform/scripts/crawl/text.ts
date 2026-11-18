/** HTML/PDF → plain text helpers for the migration importers. Input is untrusted; nothing is executed. */
import { readFileSync } from 'node:fs'

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…' }
export const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)

/** Block-aware HTML → text. `keepMarkers` leaves \u0001…\u0003 link markers intact. */
export function htmlToText(html: string, keepMarkers = false) {
  let s = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol|section)>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
  if (!keepMarkers) s = decode(s)
  return s.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

let extract: ((buf: Uint8Array) => Promise<string>) | null = null
/** Unofficial text from a PDF (empty for scanned/image-only PDFs). */
export async function pdfText(file: string): Promise<string> {
  try {
    if (!extract) {
      const { extractText, getDocumentProxy } = await import('unpdf')
      extract = async (buf) => { const pdf = await getDocumentProxy(buf); const { text } = await extractText(pdf, { mergePages: true }); return text as unknown as string }
    }
    const text = await extract(new Uint8Array(readFileSync(file)))
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 200_000)
  } catch {
    return ''
  }
}
