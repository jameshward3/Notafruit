'use client'
/**
 * Horizontal stacked bars: rows = fiscal years, segments = additive categories. Zero baseline.
 * Guide §7: color is never the only encoding (direct segment labels + fixed-order legend +
 * equivalent table on the page); tooltips work with keyboard focus (accessibilityLayer) and tap.
 */
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { labelStyle } from '@/lib/contrast'

type Row = { label: string; [k: string]: number | string | null }
type Series = { key: string; label: string; short: string; color: string }
const usd = (cents: number) => `$${(cents / 1e8).toFixed(0)}M`
const money = (v: any) => (v == null ? 'Not available' : `$${(Number(v) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`)

function SegmentLabel({ s, ...p }: any & { s: Series }) {
  const w = Number(p.width), h = Number(p.height)
  const style = labelStyle(s.color)
  if (!p.value || w < s.short.length * style.charWidth + 12) return null // narrow segments: legend + table carry the value
  return (
    <text x={Number(p.x) + w / 2} y={Number(p.y) + h / 2} fill={style.fill} fontSize={style.fontSize} fontWeight={style.fontWeight} textAnchor="middle" dominantBaseline="central">
      {s.short}
    </text>
  )
}

export function StackedYears({ rows, series, title }: { rows: Row[]; series: Series[]; title: string }) {
  return (
    <div>
      <ul className="map-legend" aria-hidden="true" style={{ listStyle: 'none', padding: 0 }}>
        {series.map((s) => <li key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 14, height: 14, background: s.color, display: 'inline-block', border: '1px solid #526171' }} />{s.label}</li>)}
      </ul>
      <div role="group" aria-label={`${title}. Use the arrow keys to read values; the table below has every figure.`} style={{ width: '100%', height: 70 + rows.length * 56 }} data-chart={title}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="#CDD4DC" />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={usd} tick={{ fill: '#17283A', fontSize: 14 }} />
            <YAxis type="category" dataKey="label" width={150} tick={{ fill: '#17283A', fontSize: 14 }} />
            <Tooltip formatter={money} trigger="hover" />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#FFFFFF" strokeWidth={1} isAnimationActive={false}>
                <LabelList dataKey={s.key} content={(p: any) => <SegmentLabel s={s} {...p} />} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function SimpleBars({ rows, title }: { rows: { label: string; cents: number | null; color: string }[]; title: string }) {
  return (
    <div role="group" aria-label={`${title}. Use the arrow keys to read values; the table below has every figure.`} style={{ width: '100%', height: 60 + rows.length * 48 }} data-chart={title}>
      <ResponsiveContainer>
        <BarChart data={rows.map((r) => ({ ...r, value: r.cents }))} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="#CDD4DC" />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={usd} tick={{ fill: '#17283A', fontSize: 14 }} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#17283A', fontSize: 14 }} />
          <Tooltip formatter={money} />
          {/* Each bar is named on the axis, so one color does not carry meaning. */}
          <Bar dataKey="value" name="Amount" fill="#0B2035" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
