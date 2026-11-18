import type { CollectionBeforeChangeHook, Field } from 'payload'
import { sourceField, withWorkflow } from '../fields/workflow'
import { lexicalToText } from '../lib/richtext'
import { slugField } from './editorial'

export const LEGISLATIVE_ACTIONS = [
  { label: 'Introduced / first reading', value: 'introduced' },
  { label: 'Referred', value: 'referred' },
  { label: 'Public hearing held', value: 'public_hearing' },
  { label: 'Amended', value: 'amended' },
  { label: 'Second reading', value: 'second_reading' },
  { label: 'Adopted', value: 'adopted' },
  { label: 'Defeated', value: 'defeated' },
  { label: 'Tabled', value: 'tabled' },
  { label: 'Deferred / carried to later meeting', value: 'deferred' },
  { label: 'Withdrawn', value: 'withdrawn' },
  { label: 'Vetoed', value: 'vetoed' },
  { label: 'Veto overridden', value: 'veto_overridden' },
  { label: 'Effective', value: 'effective' },
] as const

const STATUS_FROM_ACTION: Record<string, string> = {
  introduced: 'introduced', referred: 'in_review', public_hearing: 'in_review', amended: 'in_review', second_reading: 'in_review',
  adopted: 'adopted', defeated: 'defeated', tabled: 'tabled', deferred: 'deferred', withdrawn: 'withdrawn', vetoed: 'vetoed',
  veto_overridden: 'adopted', effective: 'adopted',
}

/** Current status is derived from the latest dated action — never set by hand. */
const deriveStatus: CollectionBeforeChangeHook = ({ data }) => {
  const actions = [...(data.actions ?? [])].filter((a: any) => a.date && a.action)
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
  data.currentStatus = actions.length ? STATUS_FROM_ACTION[actions[actions.length - 1].action] ?? 'in_review' : 'pending'
  return data
}


/** Links to original documents (PDFs on the official sites) with checksum and unofficial extracted text. */
export const documentsField: Field = {
  name: 'documents', type: 'array', labels: { singular: 'Document', plural: 'Documents' },
  admin: { description: 'Original documents as published on the official sites. Extracted text is unofficial until reviewed against the original.' },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'kind', type: 'select', required: true, defaultValue: 'other', options: ['agenda', 'minutes', 'legislation', 'video', 'bill_list', 'notice', 'comments', 'other'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'session', type: 'text', admin: { description: 'e.g. "Conference", "Regular"' } },
    { name: 'url', type: 'text', required: true },
    { name: 'checksumSha256', type: 'text', admin: { readOnly: true } },
    { name: 'retrievedAt', type: 'date', admin: { readOnly: true } },
    { name: 'text', type: 'textarea', maxLength: 200_000, admin: { description: 'Unofficial machine-extracted text. Not reviewed.' } },
  ],
}

export const Meetings = withWorkflow('records', {
  slug: 'meetings',
  admin: { group: 'Council & records', useAsTitle: 'title', defaultColumns: ['title', 'startsAt', 'workflowStatus', 'verificationStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'e.g. "City Council • Regular meeting"' } },
    slugField(),
    { name: 'body', type: 'select', required: true, defaultValue: 'city_council', options: [
      { label: 'City Council', value: 'city_council' }, { label: 'Planning Board', value: 'planning_board' },
      { label: 'Zoning Board of Adjustment', value: 'zoning_board' }, { label: 'Other board / commission', value: 'other' },
    ] },
    { name: 'meetingType', type: 'select', required: true, defaultValue: 'regular', options: ['regular', 'special', 'work_session', 'public_hearing'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'startsAt', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'timeConfirmed', type: 'checkbox', defaultValue: true, admin: { description: 'Uncheck when only the date is known (e.g. imported archives). Pages then show the date only.' } },
    { name: 'location', type: 'text', required: true },
    { name: 'participation', type: 'textarea', admin: { description: 'How the public can attend, comment, or watch. Required before publishing an agenda.' } },
    { name: 'meetingStatus', type: 'select', defaultValue: 'scheduled', options: ['scheduled', 'held', 'cancelled', 'rescheduled'].map((v) => ({ label: v, value: v })) },
    {
      name: 'agendaItems', type: 'array', labels: { singular: 'Agenda item', plural: 'Agenda items' },
      admin: { description: 'Web-native agenda. Each item can link to legislation and records.' },
      fields: [
        { name: 'number', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'legislation', type: 'relationship', relationTo: 'legislation', hasMany: true },
        { name: 'videoSeconds', type: 'number', min: 0, admin: { description: 'Where this item starts in the video (seconds).' } },
      ],
    },
    {
      name: 'minutes', type: 'array', labels: { singular: 'Minutes version', plural: 'Minutes versions' },
      admin: { description: 'Keep every version. Only "approved" minutes are labeled official.' },
      fields: [
        { name: 'versionLabel', type: 'text', required: true },
        { name: 'status', type: 'select', required: true, defaultValue: 'draft', options: ['draft', 'approved', 'corrected'].map((v) => ({ label: v, value: v })) },
        { name: 'approvedOn', type: 'date' },
        { name: 'text', type: 'richText' },
      ],
    },
    { name: 'videoUrl', type: 'text' },
    { name: 'transcript', type: 'array', fields: [
      { name: 'seconds', type: 'number', required: true, min: 0 },
      { name: 'speaker', type: 'text' },
      { name: 'text', type: 'textarea', required: true },
    ] },
    { name: 'originalDocuments', type: 'upload', relationTo: 'media', hasMany: true, admin: { description: 'Signed or archival originals (supplementary).' } },
    documentsField,
    sourceField,
  ],
}, {
  search: (d) => ({
    title: d.title,
    body: [...(d.agendaItems ?? []).map((a: any) => `${a.title} ${a.description ?? ''}`), ...(d.minutes ?? []).map((m: any) => lexicalToText(m.text)), ...(d.documents ?? []).map((x: any) => (x.text ?? '').slice(0, 20000))].join(' '),
    url: `/government/meetings/${d.slug}`, contentType: 'meeting', date: d.startsAt,
  }),
})

export const Legislation = withWorkflow('records', {
  slug: 'legislation',
  admin: { group: 'Council & records', useAsTitle: 'identifier', defaultColumns: ['identifier', 'title', 'currentStatus', 'workflowStatus'] },
  hooks: { beforeChange: [deriveStatus] },
  fields: [
    { name: 'identifier', type: 'text', required: true, unique: true, index: true, admin: { description: 'Official number exactly as recorded, e.g. "Ordinance 40-2026".' } },
    slugField('identifier'),
    { name: 'type', type: 'select', required: true, options: ['ordinance', 'resolution', 'bond_ordinance'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'title', type: 'text', required: true },
    { name: 'summary', type: 'textarea' },
    { name: 'currentStatus', type: 'select', index: true, admin: { readOnly: true, position: 'sidebar', description: 'Derived from the latest action.' },
      options: ['pending', 'introduced', 'in_review', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
    { name: 'sponsors', type: 'array', fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'verified', type: 'checkbox', defaultValue: false, admin: { description: 'Only verified sponsors are shown publicly.' } },
    ] },
    { name: 'effectiveDate', type: 'date' },
    {
      name: 'fiscal', type: 'group', admin: { description: 'Budget connection. Machine-derived values are labeled by their basis until Finance confirms them.' },
      fields: [
        { name: 'amountCents', type: 'number', min: 0, admin: { description: 'Dollar amount authorized or accepted (largest amount stated in the title).' } },
        { name: 'kind', type: 'select', options: ['spending', 'revenue', 'no_cost', 'unknown'].map((v) => ({ label: v.replace('_', ' '), value: v })) },
        { name: 'category', type: 'text', index: true, admin: { description: 'Budget category (matches budget line categories).' } },
        { name: 'basis', type: 'text', admin: { description: 'How amount/category were determined, e.g. "Inferred from title".' } },
      ],
    },
    {
      name: 'textVersions', type: 'array', labels: { singular: 'Text version', plural: 'Text versions' },
      fields: [
        { name: 'label', type: 'text', required: true, admin: { description: 'e.g. "As introduced", "As amended 2026-10-20", "As adopted"' } },
        { name: 'date', type: 'date' },
        { name: 'text', type: 'textarea', required: true, admin: { description: 'Paste the official text. Numbering is preserved exactly.' } },
        { name: 'reviewedAgainstOriginal', type: 'checkbox', defaultValue: false, admin: { description: 'Unchecked text (e.g. OCR) is shown as unofficial draft text.' } },
        { name: 'original', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'actions', type: 'array', labels: { singular: 'Action', plural: 'Actions' },
      admin: { description: 'Every step on the record, with evidence. Status is derived from these.' },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'action', type: 'select', required: true, options: LEGISLATIVE_ACTIONS as any },
        { name: 'meeting', type: 'relationship', relationTo: 'meetings' },
        { name: 'vote', type: 'relationship', relationTo: 'votes' },
        { name: 'note', type: 'text' },
        { name: 'evidenceUrl', type: 'text', admin: { description: 'Minutes, certified copy, or official notice.' } },
      ],
    },
    documentsField,
    sourceField,
  ],
}, {
  search: (d) => ({
    title: d.title, identifier: d.identifier,
    body: `${d.summary ?? ''} ${(d.textVersions ?? []).map((t: any) => t.text).join(' ')} ${(d.documents ?? []).map((x: any) => (x.text ?? '').slice(0, 20000)).join(' ')}`,
    url: `/government/legislation/${d.slug}`, contentType: 'legislation',
    date: (d.actions ?? []).map((a: any) => a.date).sort().pop() ?? null,
  }),
})

const tally: CollectionBeforeChangeHook = ({ data }) => {
  const e = data.entries ?? []
  data.yesCount = e.filter((x: any) => x.vote === 'yes').length
  data.noCount = e.filter((x: any) => x.vote === 'no').length
  data.abstainCount = e.filter((x: any) => x.vote === 'abstain').length
  data.absentCount = e.filter((x: any) => x.vote === 'absent').length
  return data
}

export const Votes = withWorkflow('records', {
  slug: 'votes',
  admin: { group: 'Council & records', useAsTitle: 'motion', defaultColumns: ['motion', 'meeting', 'result', 'workflowStatus'] },
  hooks: { beforeChange: [tally] },
  fields: [
    { name: 'meeting', type: 'relationship', relationTo: 'meetings', required: true, index: true },
    { name: 'legislation', type: 'relationship', relationTo: 'legislation', index: true },
    { name: 'motion', type: 'text', required: true },
    { name: 'result', type: 'select', required: true, options: ['carried', 'failed', 'tie', 'no_action'].map((v) => ({ label: v.replace('_', ' '), value: v })), admin: { description: 'As recorded in the minutes. Not computed.' } },
    { name: 'entries', type: 'array', required: true, minRows: 1, fields: [
      { name: 'member', type: 'text', required: true },
      { name: 'official', type: 'relationship', relationTo: 'officials' },
      { name: 'vote', type: 'select', required: true, options: ['yes', 'no', 'abstain', 'absent', 'recused'].map((v) => ({ label: v, value: v })) },
    ] },
    { name: 'yesCount', type: 'number', admin: { readOnly: true } },
    { name: 'noCount', type: 'number', admin: { readOnly: true } },
    { name: 'abstainCount', type: 'number', admin: { readOnly: true } },
    { name: 'absentCount', type: 'number', admin: { readOnly: true } },
  ],
})
