import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '@/lib/csv'
import { formatCents, parseDollarsToCents, pct, sumCents } from '@/lib/money'
import { selectHomepage } from '@/lib/seasonal'
import { civilDate, fmtTime, isActiveWindow } from '@/lib/time'
import { validateCsv } from '@/lib/imports'

describe('money', () => {
  it('parses dollars to integer cents without float error', () => {
    expect(parseDollarsToCents('$1,234.56')).toBe(123456)
    expect(parseDollarsToCents('0.1')).toBe(10)
    expect(parseDollarsToCents('(500)')).toBe(-50000)
    expect(parseDollarsToCents('')).toBeNull()
    expect(parseDollarsToCents('N/A')).toBeNull()
    expect(() => parseDollarsToCents('12.345')).toThrow()
    expect(() => parseDollarsToCents('abc')).toThrow()
  })
  it('keeps null distinct from zero', () => {
    expect(sumCents([null, undefined])).toBeNull()
    expect(sumCents([0, null])).toBe(0)
    expect(formatCents(null)).toBe('Not available')
    expect(formatCents(0)).toBe('$0')
    expect(pct(null, 100)).toBeNull()
    expect(pct(25, 100)).toBe(25)
  })
})

describe('csv export', () => {
  it('neutralizes spreadsheet formula injection but keeps numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1+1')).toBe("'+1+1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('-12.50')).toBe('-12.50')
    expect(csvCell(null)).toBe('')
    expect(toCsv(['a'], [['x,y']])).toBe('a\r\n"x,y"\r\n')
  })
})

describe('time (America/New_York)', () => {
  it('handles DST transitions for civil dates and windows', () => {
    // 2026-03-08 02:00 EST -> 03:00 EDT; 2026-11-01 02:00 EDT -> 01:00 EST
    expect(civilDate('2026-03-08T06:59:00Z')).toBe('2026-03-08') // 01:59 EST
    expect(fmtTime('2026-03-08T07:00:00Z')).toBe('3:00 AM') // jumps to EDT
    expect(civilDate('2026-11-01T04:30:00Z')).toBe('2026-11-01') // 00:30 EDT
    expect(fmtTime('2026-11-01T06:30:00Z')).toBe('1:30 AM') // second 1:30 (EST)
    expect(civilDate('2026-11-17T04:59:00Z')).toBe('2026-11-16')
    expect(isActiveWindow('2026-11-01T05:00:00Z', '2026-11-02T05:00:00Z', new Date('2026-11-01T06:30:00Z'))).toBe(true)
    expect(isActiveWindow('2026-11-01T05:00:00Z', '2026-11-02T05:00:00Z', new Date('2026-11-02T05:00:00Z'))).toBe(false)
  })
})

describe('seasonal selection', () => {
  const f = (id: number, s: string, e: string, priority = 0, audienceWards: string[] = []) => ({ id, startsAt: s, endsAt: e, priority, audienceWards })
  const now = new Date('2026-11-20T15:00:00Z')
  it('emergency outranks routine features', () => {
    const r = selectHomepage([f(1, '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z')], [{ kind: 'emergency', startsAt: '2026-11-20T00:00:00Z', endsAt: null }], now)
    expect(r.feature).toBeNull()
    expect(r.emergencies).toHaveLength(1)
  })
  it('priority then recency; expired and ward-targeted excluded', () => {
    const r = selectHomepage([
      f(1, '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z', 1),
      f(2, '2026-11-10T00:00:00Z', '2026-12-01T00:00:00Z', 5),
      f(3, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z', 9),
      f(4, '2026-11-15T00:00:00Z', '2026-12-01T00:00:00Z', 10, ['east']),
    ], [], now)
    expect(r.feature?.id).toBe(2)
    expect(selectHomepage([f(4, '2026-11-15T00:00:00Z', '2026-12-01T00:00:00Z', 10, ['east'])], [], now, 'east').feature?.id).toBe(4)
  })
})

describe('import validation', () => {
  it('maps columns and reports missing headers', () => {
    const r = validateCsv('A,B\n1,2\n', { fund: 'Fund', description: 'Description', category: 'Category', amount: 'Amount' })
    expect(r.errors[0].message).toMatch(/Column "Fund" not found/)
  })
})
