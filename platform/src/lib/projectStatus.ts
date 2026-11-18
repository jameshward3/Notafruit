/**
 * Guide §6 project status styles. Phases (data) map to four display groups.
 * Never uses ward colors. Shape (dash/solid + symbol) carries meaning, not color alone.
 */
export type StatusGroup = 'planning' | 'scheduled' | 'active' | 'complete' | 'paused'
export const GROUP_OF_PHASE: Record<string, StatusGroup> = {
  planned: 'planning', design: 'planning', bidding: 'scheduled', awarded: 'scheduled', construction: 'active',
  substantially_complete: 'complete', closed_out: 'complete', on_hold: 'paused', cancelled: 'paused',
}
export const GROUP_STYLE: Record<StatusGroup, { label: string; color: string; dash: number[] | null; symbol: 'work' | 'check' | null }> = {
  planning: { label: 'Planning (navy dashed)', color: '#0B2035', dash: [2, 1.5], symbol: null },
  scheduled: { label: 'Scheduled (gold dashed)', color: '#70551F', dash: [3, 1.5], symbol: null },
  active: { label: 'Work under way (teal solid, work symbol)', color: '#0E6B66', dash: null, symbol: 'work' },
  complete: { label: 'Complete (navy solid, check symbol)', color: '#0B2035', dash: null, symbol: 'check' },
  paused: { label: 'On hold or cancelled (gray dotted)', color: '#526171', dash: [0.5, 1.5], symbol: null },
}
export const groupOf = (phase?: string | null): StatusGroup => GROUP_OF_PHASE[phase ?? ''] ?? 'planning'
