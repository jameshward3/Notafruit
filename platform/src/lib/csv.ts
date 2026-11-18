/**
 * CSV export with spreadsheet formula-injection protection: any cell beginning
 * with = + - @ TAB or CR is prefixed with a single quote (OWASP guidance).
 */
export function csvCell(v: unknown): string {
  if (v == null) return ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export const toCsv = (header: string[], rows: unknown[][]) =>
  [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
