/** Plain-text extraction from Lexical JSON (for search bodies and snippets). */
export function lexicalToText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: string; children?: unknown[]; root?: unknown }
  if (n.root) return lexicalToText(n.root)
  if (typeof n.text === 'string') return n.text
  return (n.children ?? []).map(lexicalToText).join(' ').replace(/\s+/g, ' ').trim()
}

/** Minimal Lexical document from plain paragraphs (used by seed/import). */
export function textToLexical(text: string) {
  return {
    root: {
      type: 'root', version: 1, direction: 'ltr' as const, format: '' as const, indent: 0,
      children: text.split(/\n{2,}/).map((p) => ({
        type: 'paragraph', version: 1, direction: 'ltr' as const, format: '' as const, indent: 0, textFormat: 0, textStyle: '',
        children: [{ type: 'text', version: 1, text: p.trim(), format: 0, detail: 0, mode: 'normal', style: '' }],
      })),
    },
  }
}
