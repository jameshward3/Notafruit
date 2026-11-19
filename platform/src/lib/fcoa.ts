/**
 * New Jersey Financial Codes of Accounts (FCOA): the first two digits of an appropriation
 * account name its function. Used to group budget lines and map them to the site's categories.
 */
export const FCOA_FUNCTIONS: Record<string, { label: string; category: 'public_safety' | 'public_works' | 'parks_recreation' | 'general_government' | 'other' }> = {
  '20': { label: 'General administration', category: 'general_government' },
  '21': { label: 'Land use administration', category: 'general_government' },
  '22': { label: 'Code enforcement', category: 'general_government' },
  '23': { label: 'Insurance', category: 'general_government' },
  '25': { label: 'Public safety', category: 'public_safety' },
  '26': { label: 'Public works', category: 'public_works' },
  '27': { label: 'Health & human services', category: 'other' },
  '28': { label: 'Parks & recreation', category: 'parks_recreation' },
  '29': { label: 'Library & education', category: 'other' },
  '30': { label: 'Unclassified', category: 'other' },
  '31': { label: 'Utilities & bulk purchases', category: 'public_works' },
  '32': { label: 'Landfill & solid waste', category: 'public_works' },
  '36': { label: 'Pensions & social security', category: 'general_government' },
  '37': { label: 'Judgments', category: 'other' },
  '40': { label: 'Grant programs', category: 'other' },
  '41': { label: 'Grant programs', category: 'other' },
  '42': { label: 'Shared services', category: 'other' },
  '43': { label: 'Municipal court', category: 'general_government' },
  '44': { label: 'Capital improvements', category: 'other' },
  '45': { label: 'Debt service', category: 'other' },
  '46': { label: 'Deferred charges', category: 'other' },
  '50': { label: 'Reserve for uncollected taxes', category: 'other' },
  '55': { label: 'Water & sewer utility', category: 'public_works' },
}

export const fcoaFunction = (account?: string | null) => FCOA_FUNCTIONS[(account ?? '').slice(0, 2)] ?? { label: 'Other', category: 'other' as const }
