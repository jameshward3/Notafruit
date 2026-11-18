import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { budgetView } from '@/lib/budget'
import { toCsv } from '@/lib/csv'
import { lookupWard, validateWardVersion } from '@/lib/gis'
import { runImport } from '@/lib/imports'
import { search } from '@/lib/search'
import { makeUser, payloadForTests } from '../helpers'

let payload: Payload, clerk: any, dm: any
const sys = { overrideAccess: true, context: { system: true } } as const

beforeAll(async () => {
  payload = await payloadForTests()
  clerk = await makeUser(payload, ['records_clerk'])
  dm = await makeUser(payload, ['data_manager'])
})

describe('meetings, legislation and votes', () => {
  it('agenda links to legislation and votes; status derives from actions; search ranks exact identifier first', async () => {
    const leg = await payload.create({ collection: 'legislation', ...sys, data: {
      identifier: 'Ordinance 99-2099', type: 'ordinance', title: 'Amending the sidewalk code', summary: 'Test ordinance about sidewalks.',
      textVersions: [{ label: 'As introduced', text: 'Section 1. Sidewalks shall…', reviewedAgainstOriginal: true }], workflowStatus: 'published', verificationStatus: 'demo',
    } as any })
    expect(leg.currentStatus).toBe('pending')
    const other = await payload.create({ collection: 'legislation', ...sys, data: { identifier: 'Resolution 1-2099', type: 'resolution', title: 'Ordinance 99-2099 related sidewalk resolution', workflowStatus: 'published' } as any })
    const meeting = await payload.create({ collection: 'meetings', ...sys, data: {
      title: 'City Council • Regular meeting', body: 'city_council', meetingType: 'regular', startsAt: '2099-03-18T23:00:00.000Z', location: 'City Hall',
      agendaItems: [{ number: '3', title: 'Legislation for introduction', legislation: [leg.id] }], workflowStatus: 'published',
    } as any })
    const vote = await payload.create({ collection: 'votes', ...sys, data: {
      meeting: meeting.id, legislation: leg.id, motion: 'Motion to table', result: 'carried', workflowStatus: 'published',
      entries: [{ member: 'Member A', vote: 'yes' }, { member: 'Member B', vote: 'yes' }, { member: 'Member C', vote: 'no' }, { member: 'Member D', vote: 'absent' }],
    } as any })
    expect([vote.yesCount, vote.noCount, vote.absentCount]).toEqual([2, 1, 1])

    const updated = await payload.update({ collection: 'legislation', id: leg.id, ...sys, data: { actions: [
      { date: '2099-03-18', action: 'introduced', meeting: meeting.id },
      { date: '2099-04-01', action: 'tabled', meeting: meeting.id, vote: vote.id },
    ] } as any })
    expect(updated.currentStatus).toBe('tabled') // actual outcome preserved, not assumed "adopted"

    const pubMeeting = await payload.findByID({ collection: 'meetings', id: meeting.id, depth: 1, overrideAccess: false })
    expect((pubMeeting.agendaItems![0].legislation![0] as any).identifier).toBe('Ordinance 99-2099')
    const votes = await payload.find({ collection: 'votes', where: { legislation: { equals: leg.id } }, overrideAccess: false })
    expect(votes.docs).toHaveLength(1)

    const s = await search(payload, 'Ordinance 99-2099')
    expect(s.hits[0].docId).toBe(String(leg.id))
    expect(s.hits.map((h) => h.docId)).toContain(String(other.id))
    expect((await search(payload, 'sidewalk code')).hits.some((h) => h.collection === 'legislation')).toBe(true)
  })

  it('draft legislation is not readable publicly', async () => {
    const d = await payload.create({ collection: 'legislation', data: { identifier: 'Ordinance 98-2099', type: 'ordinance', title: 'Secret draft' } as any, user: clerk, overrideAccess: false })
    expect((await payload.find({ collection: 'legislation', where: { id: { equals: d.id } }, overrideAccess: false })).docs).toHaveLength(0)
    expect((await search(payload, 'Secret draft')).hits).toHaveLength(0)
  })
})

describe('budget data and imports', () => {
  let ds: any, src: any
  const CSV = `Fund,Department,Category,Account,Description,Amount,Direction
Current,Police,Public safety,1-01,Salaries,"$1,000,000.10",expenditure
Current,DPW,Public works,1-02,Road repair,250000,expenditure
Current,Parks,Parks & recreation,1-03,Field upkeep,,expenditure
Current,Tax Collector,Property taxes,9-01,Levy,"900,000",revenue
`
  async function batch(label: string, csv: string) {
    const name = `${label.replace(/\W/g, '')}-${Date.now()}.csv`
    return payload.create({
      collection: 'import-batches', overrideAccess: true,
      file: { data: Buffer.from(csv), mimetype: 'text/csv', name, size: csv.length },
      data: { label, kind: 'budget-lines', dataset: ds.id, source: src.id,
        mapping: { fund: 'Fund', department: 'Department', category: 'Category', account: 'Account', description: 'Description', amount: 'Amount', direction: 'Direction' } } as any,
    })
  }

  beforeAll(async () => {
    src = await payload.create({ collection: 'source-records', overrideAccess: true, data: { title: 'Test fixture', owner: 'Test', ownerType: 'third_party', retrievedAt: new Date().toISOString() } as any })
    ds = await payload.create({ collection: 'budget-datasets', data: { title: 'FY2099 demo', fiscalYear: 2099, basis: 'adopted', kind: 'operating', sourceDescription: 'Test', dataUpdatedAt: new Date().toISOString(), verificationStatus: 'demo' } as any, user: dm, overrideAccess: false })
  })

  it('dry run reports row errors and duplicates without writing', async () => {
    const b = await batch('bad', CSV + 'Current,Police,Public safety,1-01,Salaries,5,expenditure\nCurrent,X,Snacks,1,Chips,abc,expenditure\n')
    expect(await runImport(payload, b.id, 'dry_run')).toBe('invalid')
    const after = await payload.findByID({ collection: 'import-batches', id: b.id, overrideAccess: true })
    const report = after.report as any
    expect(report.duplicatesInFile).toBe(1)
    expect(report.errors.map((e: any) => e.field)).toEqual(expect.arrayContaining(['category', 'amount', '*']))
    expect((await payload.count({ collection: 'budget-lines', overrideAccess: true, where: { dataset: { equals: ds.id } } })).totalDocs).toBe(0)
    expect(await runImport(payload, b.id, 'commit')).toBe('invalid')
  })

  it('commit requires a dry run, is transactional and idempotent, and can roll back', async () => {
    const b = await batch('good', CSV)
    expect(await runImport(payload, b.id, 'commit')).toBe('needs_dry_run')
    expect(await runImport(payload, b.id, 'dry_run')).toBe('validated')
    expect(await runImport(payload, b.id, 'commit')).toBe('committed')
    expect(await runImport(payload, b.id, 'commit')).toBe('already_committed')
    expect((await payload.count({ collection: 'budget-lines', overrideAccess: true, where: { dataset: { equals: ds.id } } })).totalDocs).toBe(4)
    const dup = await batch('dup', CSV)
    expect(await runImport(payload, dup.id, 'dry_run')).toBe('invalid') // duplicates of existing rows
    expect(await runImport(payload, b.id, 'rollback')).toBe('rolled_back')
    expect((await payload.count({ collection: 'budget-lines', overrideAccess: true, where: { dataset: { equals: ds.id } } })).totalDocs).toBe(0)
    const again = await batch('good2', CSV)
    await runImport(payload, again.id, 'dry_run')
    expect(await runImport(payload, again.id, 'commit')).toBe('committed')
  })

  it('unpublished dataset rows are hidden; published totals, table and CSV agree; nulls stay null', async () => {
    expect((await budgetView(payload, { year: 2099 })).lines).toHaveLength(0)
    for (const [s, u] of [['in_review', dm], ['approved', dm], ['published', dm]] as const)
      await payload.update({ collection: 'budget-datasets', id: ds.id, data: { workflowStatus: s } as any, user: u, overrideAccess: false })
    const v = await budgetView(payload, { year: 2099 })
    const row = v.byYear.find((r) => r.fiscalYear === 2099)!
    expect(row.categories.public_safety).toBe(100000010)
    expect(row.categories.parks_recreation).toBeNull() // "Not available", not 0
    expect(row.categories.general_government).toBeNull()
    expect(row.total).toBe(100000010 + 25000000)
    const csvTotal = v.lines.filter((l) => l.direction === 'expenditure').reduce((a, l) => a + (l.amountCents ?? 0), 0)
    expect(csvTotal).toBe(row.total)
    const csv = toCsv(['amount'], v.lines.map((l) => [l.amountCents == null ? '' : (l.amountCents / 100).toFixed(2)]))
    expect(csv).toContain('1000000.10')
    expect(v.revenueMix.find((m) => m.key === 'property_taxes')!.cents).toBe(90000000)
    const filtered = await budgetView(payload, { year: 2099, category: 'public_works' })
    expect(filtered.byYear.find((r) => r.fiscalYear === 2099)!.total).toBe(25000000)
    // Import is blocked while the dataset is published.
    const b = await batch('late', CSV.replace('Salaries', 'Overtime'))
    expect(await runImport(payload, b.id, 'commit')).toBe('blocked')
  })
})

describe('ward lookup', () => {
  const sq = (x0: number, y0: number, x1: number, y1: number) => `MULTIPOLYGON(((${x0} ${y0},${x1} ${y0},${x1} ${y1},${x0} ${y1},${x0} ${y0})))`
  const pool = () => (payload.db as any).pool
  const created: number[] = []
  async function version(kind: string, verification: string) {
    const r = await pool().query(`INSERT INTO civic.boundary_versions (kind,label,custodian,source_crs,verification,effective_from) VALUES ($1,'test','Test custodian','EPSG:4326',$2,'2000-01-01') RETURNING id`, [kind, verification])
    created.push(r.rows[0].id)
    return r.rows[0].id as number
  }
  afterAll(async () => {
    // Synthetic test geometry must not leak into other specs.
    await pool().query('DELETE FROM civic.ward_geometries WHERE boundary_version_id = ANY($1::int[])', [created])
    await pool().query('DELETE FROM civic.municipal_geometries WHERE boundary_version_id = ANY($1::int[])', [created])
    await pool().query('DELETE FROM civic.boundary_versions WHERE id = ANY($1::int[])', [created])
  })

  it('with no verified boundaries, lookup is unavailable (never authoritative)', async () => {
    const r = await lookupWard(payload, -74.23, 40.77)
    expect(r.status).toBe('unavailable')
  })

  it('demo geometry is labeled illustrative and not authoritative', async () => {
    const v = await version('ward', 'demo')
    await pool().query(`INSERT INTO civic.ward_geometries (boundary_version_id, ward_slug, geom) VALUES ($1,'north',ST_GeomFromText($2,4326))`, [v, sq(0, 0, 1, 1)])
    expect((await lookupWard(payload, 0.5, 0.5)).status).toBe('unavailable')
    const r = await lookupWard(payload, 0.5, 0.5, { allowIllustrative: true })
    expect(r).toMatchObject({ status: 'illustrative', authoritative: false, ward: 'north' })
  })

  it('verified geometry: inside, outside, boundary-adjacent and gap cases', async () => {
    // Synthetic test squares far from any real place (not Orange geometry).
    const city = await version('municipal', 'verified')
    await pool().query(`INSERT INTO civic.municipal_geometries (boundary_version_id, geom) VALUES ($1, ST_GeomFromText($2,4326))`, [city, sq(10, 10, 10.02, 10.01)])
    const wards = await version('ward', 'verified')
    await pool().query(`INSERT INTO civic.ward_geometries (boundary_version_id, ward_slug, geom) VALUES ($1,'west',ST_GeomFromText($2,4326)),($1,'east',ST_GeomFromText($3,4326))`,
      [wards, sq(10, 10, 10.01, 10.01), sq(10.01, 10, 10.018, 10.01)])
    const report = await validateWardVersion(payload, wards, city)
    expect(report.invalid).toBe(0)
    expect(report.overlapM2).toBe(0)
    expect(report.gapM2).toBeGreaterThan(0) // the strip 10.018–10.02 has no ward: reported, not silently fixed

    expect(await lookupWard(payload, 10.004, 10.005)).toMatchObject({ status: 'ok', ward: 'west', authoritative: true })
    expect((await lookupWard(payload, 11, 11)).status).toBe('outside')
    const edge = await lookupWard(payload, 10.01 + 0.00005, 10.005) // ~5 m from the shared line
    expect(edge).toMatchObject({ status: 'ambiguous', candidates: ['east', 'west'] })
    expect((await lookupWard(payload, 10.019, 10.005)).status).toBe('unavailable') // gap: never guessed
    expect((await lookupWard(payload, Number.NaN, 1)).status).toBe('unavailable')
  })
})
