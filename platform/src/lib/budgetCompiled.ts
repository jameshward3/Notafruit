/**
 * Figures that are not in the adopted budget's line items, as compiled by the Municipal Budget
 * Dashboard (jw4o.com/municipal-budget-dashboard). Shown with that attribution and marked
 * unverified until the City's Finance Department confirms them.
 */
export const COMPILED_SOURCE = { label: 'Municipal Budget Dashboard (jw4o.com)', url: 'https://jw4o.com/municipal-budget-dashboard' }

/** Budget history 2020–2024 (dollars). 2025 and 2026 come from the City's adopted budgets instead. */
export const HISTORY = [
  { year: 2020, total: 77_636_060, taxLevy: 51_658_519, nonTax: 25_503_023, surplus: 4_700_000, debtService: 2_241_939 },
  { year: 2021, total: 79_358_417, taxLevy: 54_801_505, nonTax: 24_086_710, surplus: 3_700_000, debtService: 2_981_982 },
  { year: 2022, total: 81_720_157, taxLevy: 56_756_859, nonTax: 24_431_644, surplus: 3_700_000, debtService: 3_474_731 },
  { year: 2023, total: 88_844_923, taxLevy: 60_801_150, nonTax: 27_352_735, surplus: 3_000_000, debtService: 3_352_875 },
  { year: 2024, total: 93_280_851, taxLevy: 64_977_993, nonTax: 27_550_421, surplus: 4_680_000, debtService: 4_236_363 },
]

export const CAPITAL_PROJECTS = [
  { name: 'Water/Sewer System Improvements', category: 'Utilities', total: 6_900_000, budget2026: 5_400_000, status: 'Priority', years: 6, description: 'Comprehensive water and sewer infrastructure modernization.' },
  { name: 'Road Improvements', category: 'Infrastructure', total: 5_000_000, budget2026: 250_000, status: 'Active', years: 6, description: 'Multi-year street resurfacing and infrastructure upgrades across the city.' },
  { name: 'DPW Projects — OPD/Courts', category: 'Municipal facilities', total: 2_667_000, budget2026: 133_350, status: 'Active', years: 1, description: 'Police Department and Courts building improvements.' },
  { name: 'DPW Projects — City Hall', category: 'Municipal facilities', total: 410_000, budget2026: 20_500, status: 'Planning', years: 1, description: 'City Hall facility upgrades and maintenance.' },
  { name: 'Fire Department Radios', category: 'Equipment', total: 300_000, budget2026: 15_000, status: 'Active', years: 1, description: 'Communications equipment upgrade for fire operations.' },
]

export const SIX_YEAR_PLAN = [
  { year: 2026, general: 4_327_000, waterSewer: 5_400_000 },
  { year: 2027, general: 1_000_000, waterSewer: 300_000 },
  { year: 2028, general: 1_000_000, waterSewer: 300_000 },
  { year: 2029, general: 1_000_000, waterSewer: 300_000 },
  { year: 2030, general: 1_000_000, waterSewer: 300_000 },
  { year: 2031, general: 1_000_000, waterSewer: 300_000 },
]

export const CHANGE_ORDERS = [
  { project: '2022 Safe Streets to Transit', contractor: 'Portofino Builders, LLC', original: 229_535, increase: 113_319.6, scope: 'Additional conduit, PSE&G hand hole, drainage changes, intersection paving, curb installation, tree removal and replacement.' },
  { project: 'NJDOT 2020 Roadway Improvements', contractor: 'Cifelli & Son General Construction', original: 518_882.39, increase: 112_731.92, scope: 'Additional concrete sidewalk, milling and paving on North Day, Hillyer and Hickory Streets, plus traffic directors.' },
  { project: 'Public Works Garage Roof Removal & Replacement', contractor: 'Weatherproof Technologies, Inc.', original: 370_747.83, increase: 75_781.45, scope: 'HVAC, ladder installation, new door, NJ Transit training, metal deck replacement and split unit.' },
]

/** Property-tax estimator inputs: NJ Division of Taxation 2025 rates for Orange City Township (per $100 of assessed value). */
export const TAX = {
  balconyUrl: 'https://app.balcony.technology/municipality/NJ-0717',
  generalRate2025: 4.03,
  effectiveRate2025: 3.765,
  estimatedTotalLevy2025: 89_654_326, // all taxing districts (municipal, county, school, library)
}
