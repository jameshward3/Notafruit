/**
 * Seeds (1) verified facts with source lineage, (2) the source inventory,
 * (3) redirect matrix, (4) development staff accounts and (5) ISOLATED DEMO
 * content. Every demo record has verificationStatus = 'demo' and is labeled on
 * public pages. Idempotent: re-running updates in place.
 *
 *   pnpm seed:demo --with-demo  # also load the isolated demo content
 *   pnpm seed:demo              # verified facts, inventory, redirects, dev accounts (no demo)
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../src/payload.config'
import { textToLexical } from '../src/lib/richtext'

// Demo content is opt-in (removed from this dataset 2026-11-18; see scripts/remove-demo.ts).
const withDemo = process.argv.includes('--with-demo')
if (process.env.NODE_ENV === 'production' && withDemo) {
  console.error('Refusing to load demo content with NODE_ENV=production.')
  process.exit(1)
}

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true } } as const
const RETRIEVED = '2026-11-17T00:00:00.000Z'

async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys }) as any
  return payload.create({ collection, data, ...sys } as any) as any
}
const pg = (payload.db as any).pool

// ---------------------------------------------------------------- sources
const src = {
  orangenj: await upsert('source-records', 'url', { title: 'Orange City Township official website (CivicPlus)', url: 'https://orangenj.gov', owner: 'City of Orange Township', ownerType: 'official', retrievedAt: RETRIEVED, status: 'captured',
    notes: 'Names the municipality "Orange City Township". Lists City Hall at 29 North Day Street, 973-952-6100. No budget, ward or GIS data found on the home page.' }),
  council: await upsert('source-records', 'url', { title: 'City of Orange Township City Council website', url: 'https://orangetwpnjcc.org', owner: 'City of Orange Township City Council', ownerType: 'official', retrievedAt: RETRIEVED, status: 'captured',
    notes: 'Names the municipality "City of Orange Township". Lists City Hall at 29 North Day Street, (973) 952-6100; council line (973) 952-6342. Meeting archives 2008–2026; budget pages 2017–2022 only. Council roster extracted but not yet verified field-by-field.' }),
  jwBudget: await upsert('source-records', 'url', { title: 'Municipal Budget Dashboard (campaign site)', url: 'https://jw4o.com/municipal-budget-dashboard', owner: 'James Ward for Orange (campaign committee)', ownerType: 'campaign', retrievedAt: RETRIEVED, status: 'excluded',
    notes: 'Campaign property ("Paid for by"). Not authoritative. No figures extracted (charts script-rendered). No content imported; any figures must be re-derived from official budget documents.' }),
  jwPaving: await upsert('source-records', 'url', { title: 'Street Paving Program (campaign site)', url: 'https://jw4o.com/street-paving-program', owner: 'James Ward for Orange (campaign committee)', ownerType: 'campaign', retrievedAt: RETRIEVED, status: 'excluded',
    notes: 'Campaign property. Map shows "110 streets / 97 completed / 13 upcoming / $28.5M programmed (2012–2026)" in a screenshot supplied with the brief; NOT imported. Street list must come from City Engineering / resolutions.' }),
  jwLeg: await upsert('source-records', 'url', { title: 'Legislative Tracker (campaign site)', url: 'https://jw4o.com/legislative-tracker', owner: 'James Ward for Orange (campaign committee)', ownerType: 'campaign', retrievedAt: RETRIEVED, status: 'excluded',
    notes: 'Campaign property. Not authoritative; legislation must come from the Clerk\'s official records.' }),
}

// ---------------------------------------------------------------- municipal boundary (official, U.S. Census Bureau)
{
  const { loadBoundary, ORANGE_MUNICIPAL_CENSUS } = await import('./load-boundary')
  const client = await pg.connect()
  try { console.log('municipal boundary', await loadBoundary(client, ORANGE_MUNICIPAL_CENSUS)) } finally { client.release() }
  await upsert('source-records', 'url', { title: 'City of Orange township legal boundary (U.S. Census Bureau TIGERweb, GEOID 3401313045)', url: ORANGE_MUNICIPAL_CENSUS.sourceUrl,
    owner: 'U.S. Census Bureau', ownerType: 'government', retrievedAt: RETRIEVED, status: 'verified', checksumSha256: 'd709b224953816f8a3f16a1259566383d0f2c594c53058192f998ab4116e214e',
    notes: ORANGE_MUNICIPAL_CENSUS.notes })
}

// ---------------------------------------------------------------- departments (names from official navigation)
const deptDefs = [
  { name: 'Office of the City Clerk', slug: 'city-clerk', officialUrl: 'https://orangetwpnjcc.org/city-clerk/', s: src.council },
  { name: 'Finance', slug: 'finance', officialUrl: 'https://orangenj.gov/166/Finance', s: src.orangenj },
  { name: "Mayor's Office", slug: 'mayors-office', officialUrl: 'https://orangenj.gov/170/Mayors-Office', s: src.orangenj },
  { name: 'Public Works', slug: 'public-works', officialUrl: 'https://orangenj.gov/175/Public-Works', s: src.orangenj },
  { name: 'Vital Statistics', slug: 'vital-statistics', officialUrl: 'https://orangenj.gov/163/Vital-Statistics', s: src.orangenj },
]
const depts: Record<string, any> = {}
for (const d of deptDefs) {
  depts[d.slug] = await upsert('departments', 'slug', {
    name: d.name, slug: d.slug, officialUrl: d.officialUrl, address: '29 North Day Street, Orange, NJ', phone: '(973) 952-6100',
    summary: 'Department details (hours, direct line, staff) have not yet been verified for this platform. Use the City Hall main number or the official page.',
    verificationStatus: 'unverified', sources: [d.s.id],
  })
}

// ---------------------------------------------------------------- wards (names from the project brief; no geometry)
for (const w of ['north', 'south', 'east', 'west']) {
  await upsert('wards', 'slug', { slug: w, name: `${w[0].toUpperCase()}${w.slice(1)} Ward`, verificationStatus: 'unverified', sources: [src.council.id] })
}

// ---------------------------------------------------------------- services (hand-offs to verified official pages)
const svc = (o: any) => upsert('services', 'slug', { workflowStatus: 'published', publishedAt: new Date().toISOString(), ...o, body: o.body ? textToLexical(o.body) : undefined })
await svc({ title: 'Pay a bill', slug: 'pay-a-bill', category: 'pay', shortcut: true, department: depts.finance.id, sources: [src.orangenj.id], verificationStatus: 'unverified',
  summary: 'Pay City bills online through the City\'s existing payment page.', externalUrl: 'https://orangenj.gov/181/Online-Bill-Payment', externalSystemName: 'Online Bill Payment (orangenj.gov)',
  body: 'This platform does not process payments. You will be taken to the City\'s existing online bill payment page.\n\nWhich bills can be paid online, and any fees, are listed on that page.' })
await svc({ title: 'Permits & licenses', slug: 'permits-and-licenses', category: 'permits', shortcut: true, sources: [src.orangenj.id], verificationStatus: 'unverified',
  summary: 'Find forms, permit and license applications.', externalUrl: 'https://orangenj.gov/180/Forms-Permits-License-Applications', externalSystemName: 'Forms, Permits & License Applications (orangenj.gov)',
  body: 'Applications are currently provided on the City\'s official website. Fee schedules and submission requirements are listed with each form.' })
await svc({ title: 'Trash & recycling', slug: 'trash-and-recycling', category: 'trash', shortcut: true, department: depts['public-works'].id, sources: [src.orangenj.id], verificationStatus: 'unverified',
  summary: 'Collection information from the Department of Public Works.', externalUrl: 'https://orangenj.gov/175/Public-Works', externalSystemName: 'Public Works (orangenj.gov)',
  body: 'Collection days and holiday changes will be published here only after Public Works confirms them. Until then, please use the Public Works page or call City Hall.' })
await svc({ title: 'Meetings & agendas', slug: 'meetings-and-agendas', category: 'meetings', shortcut: true, department: depts['city-clerk'].id, sources: [src.council.id], verificationStatus: 'unverified',
  summary: 'Agendas, minutes and video for City Council and boards.', externalUrl: 'https://orangetwpnjcc.org/meetings/2026-meetings-2/', externalSystemName: 'Council meetings archive (orangetwpnjcc.org)',
  body: 'New agendas will be published as web pages on this platform. Historic agendas and minutes remain on the Council website until migration is complete.' })
await svc({ title: 'Birth, death & marriage records', slug: 'vital-records', category: 'records', department: depts['vital-statistics'].id, sources: [src.orangenj.id], verificationStatus: 'unverified',
  summary: 'Request certified copies of vital records.', externalUrl: 'https://orangenj.gov/163/Vital-Statistics', externalSystemName: 'Vital Statistics (orangenj.gov)' })
await svc({ title: 'Municipal code', slug: 'municipal-code', category: 'records', department: depts['city-clerk'].id, sources: [src.council.id], verificationStatus: 'unverified',
  summary: 'Read the City\'s codified ordinances.', externalUrl: 'http://www.ecode360.com/OR0804', externalSystemName: 'eCode360' })

// ---------------------------------------------------------------- places
const place = async (o: any) => upsert('places', 'slug', { workflowStatus: 'published', publishedAt: new Date().toISOString(), ...o })
await place({ name: 'City Hall', slug: 'city-hall', kind: 'facility', jurisdiction: 'municipal', address: '29 North Day Street, Orange, NJ', sources: [src.orangenj.id, src.council.id],
  summary: 'Seat of City government. Address confirmed on both official websites. Map position is approximate and not yet verified.', latitude: 40.7704, longitude: -74.2326, verificationStatus: 'unverified' })

// ---------------------------------------------------------------- redirects (old official URLs → new routes)
for (const [from, to] of [
  ['/181/Online-Bill-Payment', '/services/pay-a-bill'], ['/180/Forms-Permits-License-Applications', '/services/permits-and-licenses'],
  ['/175/Public-Works', '/departments/public-works'], ['/166/Finance', '/departments/finance'], ['/170/Mayors-Office', '/departments/mayors-office'],
  ['/163/Vital-Statistics', '/departments/vital-statistics'], ['/AgendaCenter', '/government/meetings'], ['/431/Public-Notices', '/notices'],
  ['/101/Departments', '/departments'], ['/city-clerk', '/departments/city-clerk'], ['/latest-news', '/notices'], ['/calendar/city-of-orange-calendar', '/calendar'],
]) await upsert('redirects', 'from', { from, to, statusCode: '301', sourceUrl: from.startsWith('/city') || from.startsWith('/latest') || from.startsWith('/calendar') ? 'https://orangetwpnjcc.org' : 'https://orangenj.gov' })

// ---------------------------------------------------------------- development staff accounts
const staffPassword = process.env.SEED_STAFF_PASSWORD ?? `Dev-${randomBytes(9).toString('base64url')}`
if (process.env.AUTH_MODE !== 'proxy') {
  for (const [email, roles, d, extra] of [
    ['admin@orange.test', ['administrator'], [], { canEmergencyPublish: true }],
    ['contributor@orange.test', ['contributor'], ['public-works'], {}],
    ['reviewer@orange.test', ['department_reviewer'], ['public-works'], {}],
    ['publisher@orange.test', ['publisher'], [], { canEmergencyPublish: true }],
    ['clerk@orange.test', ['records_clerk'], ['city-clerk'], {}],
    ['data@orange.test', ['data_manager'], ['finance'], {}],
  ] as const) {
    const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
    const data = { email, name: email.split('@')[0], roles: [...roles], departments: d.map((s) => depts[s].id), ...extra }
    if (found.docs[0]) await payload.update({ collection: 'users', id: found.docs[0].id, data: process.env.SEED_STAFF_PASSWORD ? { ...data, password: staffPassword } : data, overrideAccess: true })
    else await payload.create({ collection: 'users', data: { ...data, password: staffPassword }, overrideAccess: true })
  }
  console.log(`Development staff accounts: *@orange.test (admin, contributor, reviewer, publisher, clerk, data). New accounts' password: ${staffPassword}`)
}

if (!withDemo) { console.log('Seed complete (no demo content).'); process.exit(0) }

// ================================================================= DEMO CONTENT (isolated, labeled)
const demo = { verificationStatus: 'demo', workflowStatus: 'published', publishedAt: new Date().toISOString() }

await place({ ...demo, name: 'Sample neighborhood park', slug: 'sample-neighborhood-park', kind: 'park', jurisdiction: 'municipal', summary: 'Illustrative place used to demonstrate the explorer. Not a real facility record.', latitude: 40.7655, longitude: -74.2405 })
await place({ ...demo, name: 'Sample county park', slug: 'sample-county-park', kind: 'park', jurisdiction: 'county', summary: 'Illustrative example of a non-municipal facility: residents are directed to the County for permits and maintenance.', latitude: 40.7745, longitude: -74.2260 })
await place({ ...demo, name: 'Sample public school', slug: 'sample-public-school', kind: 'school', jurisdiction: 'school_district', summary: 'Illustrative school record. The Board of Education, not the City, operates schools.', latitude: 40.7610, longitude: -74.2470 })

// Notices & seasonal
await upsert('notices', 'slug', { ...demo, title: 'Sample notice: holiday schedule example', slug: 'sample-holiday-schedule', kind: 'holiday', department: depts['public-works'].id,
  summary: 'Illustrative example of how a confirmed holiday collection change would appear. This is not a City announcement.', body: textToLexical('Holiday changes are published only after the responsible department confirms them.') })
await upsert('notices', 'slug', { ...demo, title: 'Sample notice: road resurfacing advisory', slug: 'sample-resurfacing-advisory', kind: 'general', department: depts['public-works'].id,
  summary: 'Illustrative traffic advisory showing parking restrictions and detours.' })
const now = Date.now()
// Upcoming sample meeting: 14 days out at 7:00 p.m. America/New_York (EST in winter = 00:00Z next day).
const upcomingAt = new Date(new Date(now + 864e5 * 14).toISOString().slice(0, 10) + 'T00:00:00.000Z')
upcomingAt.setUTCDate(upcomingAt.getUTCDate() + 1)
await payload.delete({ collection: 'seasonal-features', where: { title: { like: 'Sample' } }, ...sys })
await payload.create({ collection: 'seasonal-features', ...sys, data: { ...demo, title: 'Sample seasonal feature: leaf collection', message: 'Illustrative seasonal message. Real seasonal services are posted only with a confirmed source.', linkUrl: '/services/trash-and-recycling', linkLabel: 'Trash & recycling', startsAt: new Date(now - 864e5 * 7).toISOString(), endsAt: new Date(now + 864e5 * 30).toISOString(), priority: 1, approvedSource: 'Demo content — not a City announcement' } as any })
await upsert('events', 'slug', { ...demo, title: 'Sample community event', slug: 'sample-community-event', startsAt: new Date(now + 864e5 * 10).toISOString(), location: 'City Hall', summary: 'Illustrative calendar entry.' })

// Legislation, meetings, votes
const L = (o: any) => upsert('legislation', 'identifier', { ...demo, ...o })
const l1 = await L({ identifier: 'DEMO Ordinance 1-2026', slug: 'demo-ordinance-1-2026', type: 'ordinance', title: 'Sample ordinance: municipal code update', summary: 'Illustrative ordinance updating provisions in the municipal code for clarity and consistency.',
  textVersions: [{ label: 'As introduced (sample text)', text: 'SECTION 1. (Sample) Chapter X is amended as follows…\nSECTION 2. (Sample) This ordinance shall take effect upon final passage and publication as required by law.', reviewedAgainstOriginal: false }] })
const l2 = await L({ identifier: 'DEMO Resolution 2-2026', slug: 'demo-resolution-2-2026', type: 'resolution', title: 'Sample resolution: professional services', summary: 'Illustrative resolution authorizing professional services to support a city project.' })
const l3 = await L({ identifier: 'DEMO Ordinance 3-2026', slug: 'demo-ordinance-3-2026', type: 'ordinance', title: 'Sample ordinance: public space improvements', summary: 'Illustrative ordinance establishing improvements to public spaces.' })
const M = (o: any) => upsert('meetings', 'slug', { ...demo, body: 'city_council', meetingType: 'regular', location: 'City Hall – Council Chambers, 29 North Day Street',
  participation: 'Sample instructions: members of the public may comment during the public comment portion. Official participation rules are set by the Council and published with each real agenda.', ...o })
const past = await M({ title: 'City Council • Regular meeting (sample)', slug: 'sample-council-meeting-past', startsAt: '2026-11-04T00:00:00.000Z', meetingStatus: 'held',
  agendaItems: [
    { number: '1', title: 'Call to order and roll call', description: 'Opening of the meeting and recording of Council attendance.', videoSeconds: 0 },
    { number: '2', title: 'Public comment', description: 'Time for members of the public to address the Council on agenda items.', videoSeconds: 180 },
    { number: '3', title: 'Legislation for introduction', description: 'Proposed ordinances and resolutions for introduction.', legislation: [l1.id, l3.id], videoSeconds: 1260 },
    { number: '4', title: 'Legislation for final consideration', description: 'Ordinances and resolutions for adoption.', legislation: [l2.id], videoSeconds: 2100 },
    { number: '5', title: 'Adjournment', description: 'Close of the regular meeting.', videoSeconds: 3300 },
  ],
  minutes: [{ versionLabel: 'Draft minutes (sample)', status: 'draft', text: textToLexical('Sample minutes text for demonstration only.') }],
  transcript: [{ seconds: 0, speaker: 'Presiding officer (sample)', text: 'The meeting will come to order.' }, { seconds: 1260, speaker: 'Clerk (sample)', text: 'Sample ordinance one, introduced on first reading.' }],
})
const upcoming = await M({ title: 'City Council • Regular meeting (sample)', slug: 'sample-council-meeting-upcoming', startsAt: upcomingAt.toISOString(),
  agendaItems: [
    { number: '1', title: 'Call to order and roll call', description: 'Opening of the meeting and recording of Council attendance.' },
    { number: '2', title: 'Public comment', description: 'Time for members of the public to address the Council on items on the agenda.' },
    { number: '3', title: 'Legislation for final consideration', description: 'Ordinances for adoption on second reading.', legislation: [l1.id] },
    { number: '4', title: 'Reports and updates', description: 'Updates from the Mayor, City Council, and City departments.' },
    { number: '5', title: 'Adjournment', description: 'Close of the regular meeting.' },
  ] })
const roll = ['Member A (sample)', 'Member B (sample)', 'Member C (sample)', 'Member D (sample)', 'Member E (sample)', 'Member F (sample)', 'Member G (sample)']
const V = (motion: string, legislation: number, result: string, pattern: string[]) => upsert('votes', 'motion', { ...demo, meeting: past.id, legislation, motion, result, entries: roll.map((member, i) => ({ member, vote: pattern[i] })) })
const v2 = await V('Sample: adopt DEMO Resolution 2-2026', l2.id, 'carried', ['yes', 'yes', 'yes', 'yes', 'no', 'yes', 'absent'])
const v3 = await V('Sample: table DEMO Ordinance 3-2026', l3.id, 'carried', ['yes', 'yes', 'no', 'yes', 'no', 'yes', 'yes'])
await payload.update({ collection: 'legislation', id: l1.id, ...sys, data: { actions: [{ date: '2026-11-04', action: 'introduced', meeting: past.id, note: 'Sample: passed on first reading' }, { date: new Date(upcomingAt.getTime() - 864e5).toISOString().slice(0, 10), action: 'public_hearing', meeting: upcoming.id, note: 'Sample: scheduled for public hearing and second reading' }] } as any })
await payload.update({ collection: 'legislation', id: l2.id, ...sys, data: { actions: [{ date: '2026-11-04', action: 'adopted', meeting: past.id, vote: v2.id }] } as any })
await payload.update({ collection: 'legislation', id: l3.id, ...sys, data: { actions: [{ date: '2026-11-04', action: 'introduced', meeting: past.id }, { date: '2026-11-04', action: 'tabled', meeting: past.id, vote: v3.id, note: 'Sample: tabled pending engineering review' }] } as any })

// Projects with illustrative geometry
const P = (o: any) => upsert('projects', 'slug', { ...demo, agency: 'City of Orange Township (sample)', contact: 'Public Works — (973) 952-6100', ...o })
const projects = [
  await P({ title: 'Sample resurfacing: Example Avenue', slug: 'sample-resurfacing-example-avenue', projectType: 'paving', phase: 'construction', programYear: 2026, wards: ['north'],
    streets: [{ name: 'Example Avenue', limits: 'First St to Third St (sample)' }], scope: 'Illustrative mill-and-overlay project with curb ramp upgrades.',
    cost: { estimatedCents: 85000000, awardedCents: 79250000, actualCents: null, basis: 'Sample figures for demonstration only.' },
    funding: [{ source: 'Sample state municipal aid', amountCents: 50000000, status: 'awarded' }, { source: 'Sample capital ordinance', amountCents: 29250000, status: 'appropriated' }],
    milestones: [{ kind: 'approval', label: 'Contract award (sample)', actualDate: '2026-05-12' }, { kind: 'construction_start', plannedDate: '2026-09-08', actualDate: '2026-09-15' }, { kind: 'substantial_completion', plannedDate: '2026-12-15' }],
    impacts: 'Sample: daytime lane closures 7 a.m.–4 p.m.; no parking signs posted 72 hours ahead.' }),
  await P({ title: 'Sample sidewalk program: Demo Street', slug: 'sample-sidewalk-demo-street', projectType: 'sidewalks', phase: 'design', programYear: 2027, wards: ['south'],
    streets: [{ name: 'Demo Street' }], scope: 'Illustrative sidewalk replacement and ADA ramps.', cost: { estimatedCents: 32000000, basis: 'Sample engineer\'s estimate.' },
    milestones: [{ kind: 'funding', label: 'Grant application (sample)', plannedDate: '2027-01-15' }] }),
  await P({ title: 'Sample resurfacing: Placeholder Road', slug: 'sample-resurfacing-placeholder-road', projectType: 'paving', phase: 'closed_out', programYear: 2025, wards: ['east'],
    streets: [{ name: 'Placeholder Road' }], scope: 'Illustrative completed resurfacing project.', cost: { estimatedCents: 61000000, awardedCents: 58800000, actualCents: 60125000, basis: 'Sample final payment certificate.' },
    milestones: [{ kind: 'construction_start', actualDate: '2025-06-02' }, { kind: 'substantial_completion', actualDate: '2025-08-29' }, { kind: 'closeout', actualDate: '2025-11-20' }] }),
  await P({ title: 'Sample traffic safety: Illustration Lane', slug: 'sample-traffic-illustration-lane', projectType: 'traffic_safety', phase: 'planned', programYear: 2027, wards: ['west'],
    streets: [{ name: 'Illustration Lane' }], scope: 'Illustrative traffic calming study.', cost: { estimatedCents: null, basis: 'Cost not yet estimated.' } }),
]
await pg.query(`DELETE FROM civic.project_geometries WHERE verification='demo'`)
const lines = [
  'LINESTRING(-74.2345 40.7745, -74.2290 40.7770, -74.2250 40.7790)',
  'LINESTRING(-74.2420 40.7630, -74.2370 40.7650)',
  'LINESTRING(-74.2280 40.7700, -74.2230 40.7680, -74.2195 40.7665)',
  'LINESTRING(-74.2480 40.7680, -74.2440 40.7705)',
]
for (const [i, p] of projects.entries()) await pg.query(`INSERT INTO civic.project_geometries (project_id, label, geom, verification) VALUES ($1,$2,ST_GeomFromText($3,4326),'demo')`, [p.id, p.title, lines[i]])
await upsert('project-updates', 'title', { ...demo, project: projects[0].id, title: 'Sample update: milling complete', date: '2026-10-20', body: 'Illustrative update: milling is complete; paving is scheduled next, weather permitting.', department: depts['public-works'].id })

// Budget datasets (illustrative figures)
const years = [
  { y: 2022, basis: 'actual', k: 0.90 }, { y: 2023, basis: 'actual', k: 0.94 }, { y: 2024, basis: 'adopted', k: 0.98 }, { y: 2025, basis: 'adopted', k: 1.0 }, { y: 2026, basis: 'adopted', k: 1.03 },
]
const base = { public_safety: 3150000000, public_works: 1920000000, parks_recreation: 640000000, general_government: 1480000000, other: 910000000 }
const revenueBase = { property_taxes: 5260000000, local_revenues: 1150000000, state_aid: 1240000000, other_revenues: 610000000 }
for (const { y, basis, k } of years) {
  const ds = await upsert('budget-datasets', 'slug', { ...demo, title: `FY${y} operating budget (${basis}, illustrative)`, slug: `demo-fy${y}-operating-${basis}`, fiscalYear: y, basis, kind: 'operating', units: 'US dollars (nominal)',
    sourceDescription: 'Illustrative figures generated for demonstration. Not City data.', dataUpdatedAt: '2026-11-17T17:00:00.000Z',
    definitions: 'Expenditure categories group departmental appropriations. "Other" includes debt service and statutory expenditures (illustrative). Empty amounts mean "not available", not zero.' })
  await payload.delete({ collection: 'budget-lines', where: { dataset: { equals: ds.id } }, overrideAccess: true })
  for (const [cat, c] of Object.entries(base)) {
    // Parks actuals deliberately unavailable for FY2022 to demonstrate null handling.
    const amount = y === 2022 && cat === 'parks_recreation' ? null : Math.round((c * k) / 100) * 100
    await payload.create({ collection: 'budget-lines', overrideAccess: true, data: { dataset: ds.id, rowKey: `current||${cat}|${cat}`, direction: 'expenditure', fund: 'Current fund', department: cat.replace('_', ' '), category: cat as any, description: `${cat.replace('_', ' ')} (illustrative)`, amountCents: amount } })
  }
  for (const [cat, c] of Object.entries(revenueBase)) {
    await payload.create({ collection: 'budget-lines', overrideAccess: true, data: { dataset: ds.id, rowKey: `current||rev|${cat}`, direction: 'revenue', fund: 'Current fund', category: cat as any, description: `${cat.replace('_', ' ')} (illustrative)`, amountCents: Math.round((c * k) / 100) * 100 } })
  }
}
await upsert('budget-datasets', 'slug', { ...demo, title: 'FY2026 capital budget (adopted, illustrative)', slug: 'demo-fy2026-capital-adopted', fiscalYear: 2026, basis: 'adopted', kind: 'capital', sourceDescription: 'Illustrative figures. Not City data.', dataUpdatedAt: '2026-11-17T17:00:00.000Z' })

const { reconcileSearch } = await import('../src/jobs/tasks')
console.log('search', await reconcileSearch(payload))
console.log('Seed complete (demo content included and labeled).')
process.exit(0)
