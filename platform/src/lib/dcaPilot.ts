/**
 * NJ DCA PILOT Database figures for Orange (src/data/dca-pilot-orange.json, written by
 * scripts/crawl/import-dca-pilot.ts), and matching of the City budget's PILOT lines to DCA projects.
 */
import data from '@/data/dca-pilot-orange.json'

export type DcaProject = (typeof data.projects)[number]
export const DCA = data

const STOP = new Set(['pilot', 'the', 'of', 'sr', 'senior', 'citizens', 'condos', 'at', 'development', 'partners', 'dev', 'urban', 'renewal', 'ii', 'll', 'and', 'phase', 'plaza', 'street', 'st', 'avenue', 'ave', 'corp', 'village', 'apartments', 'towers', 'south', 'center', 'centre'])
const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', berkley: 'berkeley' }
const tokens = (s: string) => s.toLowerCase().replace(/\(pilot\)/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  .map((w) => ROMAN[w] ?? w).filter((w) => !STOP.has(w) || /^\d$/.test(w))
const sig = (s: string) => new Set(tokens(s))

/** Best DCA project for a budget line name (shared significant words; phase numbers must agree). */
export function matchDca(name: string): DcaProject | null {
  const a = sig(name)
  const num = (x: Set<string>) => [...x].filter((w) => /^[1-3]$/.test(w)).join(',')
  let best: { p: DcaProject; score: number } | null = null
  for (const p of data.projects) {
    const b = sig(p.project)
    if (num(a) !== num(b)) continue
    const shared = [...a].filter((w) => b.has(w) && !/^[1-3]$/.test(w)).length
    const score = shared / Math.max(1, a.size, b.size)
    if (shared > 0 && score >= 0.5 && (!best || score > best.score)) best = { p, score }
  }
  return best?.p ?? null
}
