import type { CollectionConfig } from 'payload'
import { hasRole, userOf } from '../access/roles'
import { sourceField, verificationField, withWorkflow } from '../fields/workflow'
import { q } from '../lib/db'
import { slugField } from './editorial'

const WARDS = ['north', 'south', 'east', 'west'].map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))
const cents = (name: string, label: string, description?: string) => ({
  name, label, type: 'number' as const,
  admin: { description: `${description ?? ''} In cents (e.g. 1250000 = $12,500.00). Leave empty if not available — empty is not zero.`.trim() },
  validate: (v: unknown) => v == null || Number.isInteger(v) || 'Use whole cents (no fractions).',
})

export const PROJECT_PHASES = ['planned', 'design', 'bidding', 'awarded', 'construction', 'substantially_complete', 'closed_out', 'on_hold', 'cancelled']

export const Projects = withWorkflow('data', {
  slug: 'projects',
  admin: { group: 'Projects & data', useAsTitle: 'title', defaultColumns: ['title', 'phase', 'programYear', 'workflowStatus', 'verificationStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'projectType', type: 'select', required: true, options: ['paving', 'sidewalks', 'water_sewer', 'parks', 'facilities', 'traffic_safety', 'other'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'phase', type: 'select', required: true, defaultValue: 'planned', index: true, options: PROJECT_PHASES.map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'programYear', type: 'number', index: true },
    { name: 'wards', type: 'select', hasMany: true, options: WARDS, admin: { description: 'Only from verified geometry or official project records.' } },
    { name: 'streets', type: 'array', fields: [{ name: 'name', type: 'text', required: true }, { name: 'limits', type: 'text', admin: { description: 'From / to' } }] },
    { name: 'scope', type: 'textarea', required: true },
    { name: 'agency', type: 'text', admin: { description: 'Responsible agency (City, Essex County, NJDOT, utility…).' } },
    { name: 'contact', type: 'text' },
    {
      type: 'group', name: 'cost', fields: [
        cents('estimatedCents', 'Estimated cost'), cents('awardedCents', 'Contract award'), cents('actualCents', 'Actual cost to date'),
        { name: 'basis', type: 'textarea', admin: { description: 'Where each cost figure comes from (resolution, bid tab, invoice summary).' } },
      ],
    },
    {
      name: 'funding', type: 'array', fields: [
        { name: 'source', type: 'text', required: true, admin: { description: 'e.g. "NJDOT Municipal Aid FY2026", "Capital ordinance 12-2025"' } },
        cents('amountCents', 'Amount'),
        { name: 'status', type: 'select', required: true, options: ['applied', 'awarded', 'appropriated', 'received'].map((v) => ({ label: v, value: v })) },
        { name: 'evidenceUrl', type: 'text' },
      ],
    },
    {
      name: 'milestones', type: 'array',
      admin: { description: 'Approval, funding, scheduling, construction, substantial completion and closeout are separate facts.' },
      fields: [
        { name: 'kind', type: 'select', required: true, options: ['approval', 'funding', 'scheduled', 'construction_start', 'substantial_completion', 'closeout', 'other'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
        { name: 'label', type: 'text' },
        { name: 'plannedDate', type: 'date' },
        { name: 'actualDate', type: 'date' },
        { name: 'evidenceUrl', type: 'text' },
      ],
    },
    { name: 'impacts', type: 'textarea', admin: { description: 'Parking, detours, water shut-offs, noise windows.' } },
    { name: 'documents', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'geometryNote', type: 'text', admin: { description: 'Map geometry is stored in PostGIS (civic.project_geometries) and managed by data managers via import.' } },
    sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.scope} ${(d.streets ?? []).map((s: any) => s.name).join(' ')}`, url: `/projects/${d.slug}`, contentType: 'project', ward: d.wards?.[0] ?? null }),
})

export const BudgetDatasets = withWorkflow('data', {
  slug: 'budget-datasets',
  admin: { group: 'Projects & data', useAsTitle: 'title', defaultColumns: ['title', 'fiscalYear', 'basis', 'workflowStatus', 'verificationStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'fiscalYear', type: 'number', required: true, index: true },
    { name: 'basis', type: 'select', required: true, options: [
      { label: 'Adopted', value: 'adopted' }, { label: 'Amended', value: 'amended' }, { label: 'Actual', value: 'actual' },
    ] },
    { name: 'kind', type: 'select', required: true, options: [
      { label: 'Operating budget', value: 'operating' }, { label: 'Capital budget', value: 'capital' },
      { label: 'Appropriations', value: 'appropriations' }, { label: 'Obligations / encumbrances', value: 'obligations' },
      { label: 'Actual payments', value: 'payments' }, { label: 'Revenues', value: 'revenues' },
    ] },
    { name: 'units', type: 'text', defaultValue: 'US dollars (nominal)', required: true },
    { name: 'sourceDescription', type: 'text', required: true, admin: { description: 'e.g. "FY2026 Adopted Municipal Budget, Sheet 3"' } },
    { name: 'dataUpdatedAt', type: 'date', required: true },
    { name: 'definitions', type: 'textarea', admin: { description: 'Data dictionary notes shown on the dataset page.' } },
    { name: 'corrections', type: 'array', fields: [{ name: 'date', type: 'date', required: true }, { name: 'note', type: 'text', required: true }] },
    sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.sourceDescription} ${d.definitions ?? ''}`, url: `/transparency/budget/datasets/${d.slug}`, contentType: 'dataset' }),
})

export const BUDGET_CATEGORIES = ['public_safety', 'public_works', 'parks_recreation', 'general_government', 'other'] as const

export const BudgetLines: CollectionConfig = {
  slug: 'budget-lines',
  admin: { group: 'Projects & data', useAsTitle: 'description', defaultColumns: ['dataset', 'fund', 'department', 'category', 'amountCents'] },
  access: {
    // Public rows only through a published dataset.
    read: ({ req }) => (userOf(req) ? true : { 'dataset.workflowStatus': { equals: 'published' } }),
    create: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
    update: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
    delete: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
  },
  indexes: [{ fields: ['dataset', 'rowKey'], unique: true }],
  fields: [
    { name: 'dataset', type: 'relationship', relationTo: 'budget-datasets', required: true, index: true },
    { name: 'rowKey', type: 'text', required: true, admin: { description: 'Stable key for de-duplication (fund|department|account).' } },
    { name: 'direction', type: 'select', required: true, defaultValue: 'expenditure', options: ['expenditure', 'revenue'].map((v) => ({ label: v, value: v })) },
    { name: 'fund', type: 'text', required: true },
    { name: 'department', type: 'text' },
    { name: 'category', type: 'select', required: true, options: [...BUDGET_CATEGORIES, 'property_taxes', 'local_revenues', 'state_aid', 'other_revenues'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'account', type: 'text' },
    { name: 'description', type: 'text', required: true },
    {
      name: 'amountCents', type: 'number',
      validate: (v: unknown) => v == null || Number.isInteger(v) || 'Whole cents only.',
      admin: { description: 'Empty = not available (never treated as zero).' },
    },
    { name: 'importBatch', type: 'relationship', relationTo: 'import-batches', index: true },
  ],
}

export const Wards: CollectionConfig = {
  slug: 'wards',
  admin: { group: 'Places & maps', useAsTitle: 'name' },
  access: { read: () => true, create: ({ req }) => hasRole(userOf(req), 'administrator'), update: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'), delete: () => false },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'select', required: true, unique: true, options: WARDS },
    { name: 'summary', type: 'textarea', admin: { description: 'Only verified facts. Leave empty rather than guess.' } },
    { name: 'representatives', type: 'relationship', relationTo: 'officials', hasMany: true, admin: { description: 'Set only from an official roster.' } },
    verificationField, sourceField,
  ],
}

export const Places = withWorkflow('data', {
  slug: 'places',
  admin: { group: 'Places & maps', useAsTitle: 'name', defaultColumns: ['name', 'kind', 'jurisdiction', 'workflowStatus', 'verificationStatus'] },
  hooks: {
    afterChange: [async ({ doc, req }) => {
      if (typeof doc.latitude === 'number' && typeof doc.longitude === 'number') {
        const v = doc.verificationStatus === 'verified' ? 'verified' : doc.verificationStatus === 'demo' ? 'demo' : 'unverified'
        await q(req.payload, `INSERT INTO civic.place_points (place_id, geom, verification) VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326), $4)
          ON CONFLICT (place_id) DO UPDATE SET geom=EXCLUDED.geom, verification=EXCLUDED.verification`, [doc.id, doc.longitude, doc.latitude, v])
      } else {
        await q(req.payload, 'DELETE FROM civic.place_points WHERE place_id=$1', [doc.id])
      }
      return doc
    }],
    afterDelete: [async ({ id, req }) => { await q(req.payload, 'DELETE FROM civic.place_points WHERE place_id=$1', [id]) }],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'kind', type: 'select', required: true, options: ['facility', 'park', 'school', 'library', 'historic_site', 'transit'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'jurisdiction', type: 'select', required: true, options: [
      { label: 'City of Orange Township', value: 'municipal' }, { label: 'Essex County', value: 'county' },
      { label: 'State of New Jersey', value: 'state' }, { label: 'Orange Board of Education', value: 'school_district' },
      { label: 'Other / private', value: 'other' },
    ], admin: { description: 'Who owns or operates it. Shown publicly so residents know whom to contact.' } },
    { name: 'address', type: 'text' },
    { name: 'summary', type: 'textarea' },
    { name: 'history', type: 'textarea' },
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
    { name: 'ward', type: 'select', options: WARDS, admin: { description: 'Set only when determined from verified ward geometry.' } },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    sourceField,
  ],
}, {
  search: (d) => ({ title: d.name, body: `${d.summary ?? ''} ${d.history ?? ''} ${d.address ?? ''}`, url: `/explore/places/${d.slug}`, contentType: 'place', ward: d.ward }),
})

export const ImportBatches: CollectionConfig = {
  slug: 'import-batches',
  admin: { group: 'Projects & data', useAsTitle: 'label', defaultColumns: ['label', 'kind', 'status', 'updatedAt'],
    description: 'Upload a CSV, run a dry run, review row errors, then commit. Import is not approval: the dataset still goes through review.' },
  access: {
    read: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
    create: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
    update: ({ req }) => hasRole(userOf(req), 'data_manager', 'administrator'),
    delete: () => false,
  },
  upload: { mimeTypes: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], staticDir: process.env.PRIVATE_UPLOAD_DIR ?? 'private-uploads/imports' },
  hooks: {
    afterChange: [async ({ doc, previousDoc, req }) => {
      if (doc.requestedAction && doc.requestedAction !== previousDoc?.requestedAction && doc.requestedAction !== 'none') {
        await req.payload.jobs.queue({ task: 'importBatch', input: { batchId: doc.id, action: doc.requestedAction }, req })
      }
      return doc
    }],
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'kind', type: 'select', required: true, defaultValue: 'budget-lines', options: [{ label: 'Budget lines', value: 'budget-lines' }] },
    { name: 'dataset', type: 'relationship', relationTo: 'budget-datasets', required: true },
    { name: 'source', type: 'relationship', relationTo: 'source-records', required: true, admin: { description: 'Required: where this file came from.' } },
    {
      name: 'mapping', type: 'json', required: true,
      defaultValue: { fund: 'Fund', department: 'Department', category: 'Category', account: 'Account', description: 'Description', amount: 'Amount', direction: 'Direction' },
      admin: { description: 'Map platform fields (left) to your spreadsheet column headings (right).' },
    },
    { name: 'requestedAction', type: 'select', defaultValue: 'none', options: [
      { label: '—', value: 'none' }, { label: 'Run dry run', value: 'dry_run' }, { label: 'Commit (after successful dry run)', value: 'commit' }, { label: 'Roll back committed rows', value: 'rollback' },
    ] },
    { name: 'status', type: 'select', defaultValue: 'uploaded', admin: { readOnly: true },
      options: ['uploaded', 'validated', 'invalid', 'committed', 'rolled_back', 'failed'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'report', type: 'json', admin: { readOnly: true, description: 'Row counts, duplicates, and row-level errors from the last run.' } },
  ],
}
