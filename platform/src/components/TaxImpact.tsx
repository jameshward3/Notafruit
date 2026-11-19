'use client'
/**
 * Property-tax impact estimator. Estimates the municipal-levy part of a bill change only;
 * county, school and library rates are held at their 2025 values.
 */
import { useId, useState } from 'react'

type Props = { levy2025: number; levy2026: number; generalRate2025: number; effectiveRate2025: number; estimatedTotalLevy2025: number; balconyUrl: string }
const money = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function TaxImpact(p: Props) {
  const id = useId()
  const [raw, setRaw] = useState('')
  const base = p.estimatedTotalLevy2025 / (p.generalRate2025 / 100) // estimated taxable base
  const rateChange = ((p.levy2026 - p.levy2025) / base) * 100
  const rate2026 = p.generalRate2025 + rateChange
  const effective2026 = rate2026 * (p.effectiveRate2025 / p.generalRate2025)
  const value = Number(raw.replace(/[$,\s]/g, '')) || 0
  const bill2025 = (value * p.generalRate2025) / 100
  const bill2026 = (value * rate2026) / 100
  const diff = bill2026 - bill2025
  return (
    <div className="grid grid-2">
      <div className="panel">
        <h3>Find your assessed value</h3>
        <p>Look up your property on Balcony (search by owner, address, or block and lot) and copy the <strong>Total Assessed Value</strong>.</p>
        <p><a className="btn btn--secondary" href={p.balconyUrl} target="_blank" rel="noopener noreferrer">Open Balcony (NJ-0717)</a></p>
        <label htmlFor={`${id}-v`} style={{ fontWeight: 700, display: 'block', marginTop: 16 }}>Total assessed value</label>
        <input id={`${id}-v`} inputMode="decimal" placeholder="e.g. 350,000" value={raw} onChange={(e) => setRaw(e.target.value)}
          style={{ width: '100%', minHeight: 'var(--control-h)', padding: '0 12px', font: 'inherit', border: '1px solid var(--control-border)' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn--secondary" onClick={() => setRaw('350,000')}>Use $350,000</button>
          <button type="button" className="btn btn--secondary" onClick={() => setRaw('500,000')}>Use $500,000</button>
        </div>
      </div>
      <div className="panel" aria-live="polite">
        <h3>Estimated result</h3>
        <dl className="facts">
          <dt>2025 estimated bill</dt><dd className="tabular">{money(bill2025)}</dd>
          <dt>2026 estimated bill</dt><dd className="tabular">{money(bill2026)}</dd>
          <dt>Estimated change</dt><dd className="tabular"><strong>{diff >= 0 ? '+' : '−'}{money(Math.abs(diff))}</strong> ({value ? ((diff / bill2025) * 100).toFixed(2) : '0.00'}%)</dd>
          <dt>Projected general rate</dt><dd className="tabular">{rate2026.toFixed(3)} per $100 (2025: {p.generalRate2025.toFixed(3)})</dd>
          <dt>Projected effective rate</dt><dd className="tabular">{effective2026.toFixed(3)}% (for comparison, not the bill multiplier)</dd>
        </dl>
        <p className="meta">Estimate only. It adds the change in the municipal levy ({money(p.levy2025)} → {money(p.levy2026)}) to the 2025 certified general rate; county, school and library rates, appeals and exemptions also affect the final bill.</p>
      </div>
    </div>
  )
}
