/** WCAG 2.x relative luminance and contrast ratio. */
const lin = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** Best of navy or white text on a fill, by measured contrast. */
export const textOn = (fill: string) => (contrast('#0B2035', fill) >= contrast('#FFFFFF', fill) ? '#0B2035' : '#FFFFFF')

/**
 * Label style on a colored fill. If neither navy nor white reaches 4.5:1 (e.g. the
 * guide's fixed Parks color #9A752F), use WCAG "large text" (≥ 14pt bold ≈ 18.66px
 * bold), whose threshold is 3:1.
 */
export function labelStyle(fill: string) {
  const color = textOn(fill)
  const small = contrast(color, fill) >= 4.5
  return { fill: color, fontSize: small ? 13 : 19, fontWeight: small ? 600 : 700, charWidth: small ? 8 : 12, large: !small, ratio: contrast(color, fill) }
}
