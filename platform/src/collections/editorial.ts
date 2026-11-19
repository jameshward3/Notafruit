import type { CollectionConfig, Field } from 'payload'
import { hasRole, userOf } from '../access/roles'
import { sourceField, verificationField, withWorkflow } from '../fields/workflow'
import { notifySubscribers } from '../lib/notify'
import { lexicalToText } from '../lib/richtext'

export const slugField = (from = 'title'): Field => ({
  name: 'slug', type: 'text', required: true, unique: true, index: true,
  admin: { position: 'sidebar', description: `URL name. Lowercase words separated by hyphens. Generated from the ${from} if left empty.` },
  hooks: {
    beforeValidate: [({ value, data }) =>
      value || (data?.[from] ? String(data[from]).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 80) : value)],
  },
  validate: (v: unknown) => (typeof v === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) || 'Use lowercase letters, numbers and hyphens only.',
})

const departmentField: Field = { name: 'department', type: 'relationship', relationTo: 'departments', index: true, admin: { position: 'sidebar' } }
const reference = { read: () => true, create: ({ req }: any) => hasRole(userOf(req), 'publisher', 'administrator'), update: ({ req }: any) => hasRole(userOf(req), 'publisher', 'administrator'), delete: ({ req }: any) => hasRole(userOf(req), 'administrator') }

export const Departments: CollectionConfig = {
  slug: 'departments',
  admin: { group: 'Directory', useAsTitle: 'name', defaultColumns: ['name', 'phone', 'verificationStatus'] },
  access: reference,
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField('name'),
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'address', type: 'text' },
    { name: 'hours', type: 'text' },
    { name: 'officialUrl', type: 'text', admin: { description: 'Current page on the official City site.' } },
    verificationField, sourceField,
  ],
}

export const Officials: CollectionConfig = {
  slug: 'officials',
  admin: { group: 'Directory', useAsTitle: 'name', defaultColumns: ['name', 'office', 'category', 'ward', 'verificationStatus'] },
  access: reference,
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'office', type: 'text', required: true, admin: { description: 'e.g. "Councilmember", "City Clerk", "Mayor"' } },
    { name: 'category', type: 'select', required: true, defaultValue: 'council', index: true, options: [
      { label: 'Mayor & executive', value: 'executive' }, { label: 'City Council', value: 'council' },
      { label: 'City Clerk & council staff', value: 'clerk' }, { label: 'Department head', value: 'department' }, { label: 'Department staff', value: 'staff' },
    ] },
    { name: 'sortOrder', type: 'number', defaultValue: 100, admin: { position: 'sidebar', description: 'Lower numbers are listed first.' } },
    { name: 'ward', type: 'select', options: ['north', 'south', 'east', 'west', 'at-large'].map((v) => ({ label: v, value: v })), admin: { description: 'Only set when verified from an official roster.' } },
    { name: 'photo', type: 'upload', relationTo: 'media', admin: { description: 'Official portrait. Shown only when the asset is approved.' } },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'bio', type: 'textarea', admin: { description: 'Short biography as published by the City.' } },
    { name: 'department', type: 'relationship', relationTo: 'departments' },
    { name: 'termStart', type: 'date' },
    { name: 'termEnd', type: 'date' },
    { name: 'termNote', type: 'text', admin: { description: 'Term as published, when exact dates are not known (e.g. "Term ends June 30, 2028").' } },
    { name: 'contactUrl', type: 'text', admin: { description: 'Official profile page.' } },
    verificationField, sourceField,
  ],
}

export const Services = withWorkflow('editorial', {
  slug: 'services',
  admin: { group: 'Content', useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'summary', type: 'textarea', required: true, localized: true, admin: { description: 'One or two sentences. Plain language.' } },
    { name: 'body', type: 'richText', localized: true },
    { name: 'category', type: 'select', required: true, options: ['pay', 'permits', 'report', 'trash', 'meetings', 'records', 'health', 'other'].map((v) => ({ label: v, value: v })) },
    { name: 'shortcut', type: 'checkbox', defaultValue: false, admin: { description: 'Show in the homepage task strip.' } },
    { name: 'externalUrl', type: 'text', admin: { description: 'Verified external system (payments, permits). Residents see a clear hand-off notice.' } },
    { name: 'externalSystemName', type: 'text' },
    { name: 'infoPage', type: 'relationship', relationTo: 'info-pages', admin: { description: 'Full page carried over from orangenj.gov, shown below the summary.' } },
    departmentField, sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.summary ?? ''} ${lexicalToText(d.body)}`, url: `/services/${d.slug}`, contentType: 'service', department: d.department ? String(typeof d.department === 'object' ? d.department.id : d.department) : null }),
})

export const Notices = withWorkflow('editorial', {
  slug: 'notices',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'kind', 'workflowStatus', 'startsAt', 'expiresAt'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'kind', type: 'select', required: true, defaultValue: 'general', options: [
      { label: 'General notice', value: 'general' }, { label: 'Emergency alert', value: 'emergency' },
      { label: 'Holiday / schedule change', value: 'holiday' }, { label: 'Legal notice', value: 'legal' },
    ] },
    { name: 'summary', type: 'textarea', required: true, localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'When the notice applies (not when it is published).' } },
    { name: 'endsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'wards', type: 'select', hasMany: true, options: ['north', 'south', 'east', 'west'].map((v) => ({ label: v, value: v })) },
    departmentField, sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.summary ?? ''} ${lexicalToText(d.body)}`, url: `/notices/${d.slug}`, contentType: 'notice', date: d.publishedAt, department: d.department ? String(typeof d.department === 'object' ? d.department.id : d.department) : null }),
  onPublish: (d, req) => notifySubscribers(req, { topicType: 'notices', topicId: '*', key: `notice:${d.id}:${d.publishedAt}`, subject: `City notice: ${d.title}`, text: `${d.summary}\n\nRead more: ${process.env.PUBLIC_SITE_URL ?? ''}/notices/${d.slug}` }),
})

export const Events = withWorkflow('editorial', {
  slug: 'events',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'startsAt', 'workflowStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'startsAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'location', type: 'text' },
    { name: 'summary', type: 'textarea', localized: true },
    departmentField,
  ],
}, {
  search: (d) => ({ title: d.title, body: d.summary ?? '', url: `/calendar#event-${d.slug}`, contentType: 'event', date: d.startsAt }),
})

export const SeasonalFeatures = withWorkflow('editorial', {
  slug: 'seasonal-features',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'startsAt', 'endsAt', 'priority', 'workflowStatus'],
    description: 'Staff-controlled seasonal imagery and service priorities. Emergency notices always outrank these.' },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'message', type: 'textarea', required: true, localized: true },
    { name: 'linkUrl', type: 'text' },
    { name: 'linkLabel', type: 'text', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media', admin: { description: 'Must be an approved, location-verified photo. If missing, the standard image is used.' } },
    { name: 'startsAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endsAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'priority', type: 'number', defaultValue: 0, admin: { description: 'Higher wins when windows overlap.' } },
    { name: 'audienceWards', type: 'select', hasMany: true, options: ['north', 'south', 'east', 'west'].map((v) => ({ label: v, value: v })) },
    { name: 'approvedSource', type: 'text', required: true, admin: { description: 'Who confirmed this service change (e.g. "DPW memo 2026-11-10"). Do not infer from a generic holiday calendar.' } },
    departmentField,
  ],
})

export const ProjectUpdates = withWorkflow('editorial', {
  slug: 'project-updates',
  admin: { group: 'Projects & data', useAsTitle: 'title', defaultColumns: ['title', 'project', 'date', 'workflowStatus'] },
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'body', type: 'textarea', required: true },
    departmentField,
  ],
}, {
  onPublish: (d, req) => {
    const pid = String(typeof d.project === 'object' ? d.project.id : d.project)
    return notifySubscribers(req, { topicType: 'project', topicId: pid, key: `project-update:${d.id}:${d.publishedAt}`, subject: `Project update: ${d.title}`, text: `${d.body}\n\n${process.env.PUBLIC_SITE_URL ?? ''}/projects` })
  },
})

/** Files and outside systems referenced by imported City pages. Files on orangenj.gov open in the in-site viewer. */
const attachmentsField: Field = {
  name: 'attachments', type: 'array', labels: { singular: 'File', plural: 'Files' },
  admin: { description: 'Forms and documents as published on the official site. Files on orangenj.gov open in the in-site viewer.' },
  fields: [{ name: 'label', type: 'text', required: true }, { name: 'url', type: 'text', required: true }],
}
const externalLinksField: Field = {
  name: 'externalLinks', type: 'array', labels: { singular: 'Outside system', plural: 'Outside systems' },
  admin: { description: 'Payment portals and other systems run by vendors. They refuse to be embedded, so residents get a clear hand-off.' },
  fields: [{ name: 'label', type: 'text', required: true }, { name: 'url', type: 'text', required: true }, { name: 'provider', type: 'text' }],
}

export const INFO_SECTIONS = ['residents', 'business', 'uez', 'how-do-i', 'government', 'departments'] as const

/** Pages carried over from orangenj.gov (one per original page), shown at /info/<slug>. */
export const InfoPages = withWorkflow('editorial', {
  slug: 'info-pages',
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'section', 'department', 'workflowStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'section', type: 'select', required: true, index: true, options: INFO_SECTIONS.map((v) => ({ label: v, value: v })) },
    { name: 'parent', type: 'relationship', relationTo: 'info-pages', admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    attachmentsField, externalLinksField,
    { name: 'contacts', type: 'relationship', relationTo: 'officials', hasMany: true, admin: { description: 'People listed in the page\'s "Contact Us" box.' } },
    { name: 'officialUrl', type: 'text', admin: { description: 'Original page on orangenj.gov.' } },
    departmentField, sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.summary ?? ''} ${lexicalToText(d.body)} ${(d.attachments ?? []).map((a: any) => a.label).join(' ')}`, url: `/info/${d.slug}`, contentType: 'page', department: d.department ? String(typeof d.department === 'object' ? d.department.id : d.department) : null }),
})

/** Bid and RFP/RFQ postings (orangenj.gov Bids.aspx). */
export const Bids = withWorkflow('editorial', {
  slug: 'bids',
  admin: { group: 'Business', useAsTitle: 'title', defaultColumns: ['title', 'category', 'bidStatus', 'closesAt', 'workflowStatus'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'bidNumber', type: 'text' },
    { name: 'category', type: 'text', admin: { description: 'e.g. "Bids and Request for Proposals (RFPs)"' } },
    { name: 'bidStatus', type: 'select', required: true, defaultValue: 'open', index: true, options: ['open', 'closed', 'awarded', 'cancelled'].map((v) => ({ label: v, value: v })) },
    { name: 'publishedOn', type: 'date' },
    { name: 'closesAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'closesNote', type: 'text', admin: { description: 'Closing as published when not a date (e.g. "Upon Contract").' } },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'richText' },
    { name: 'contact', type: 'textarea' },
    attachmentsField,
    { name: 'officialUrl', type: 'text' },
    departmentField, sourceField,
  ],
}, {
  search: (d) => ({ title: d.title, body: `${d.bidNumber ?? ''} ${d.summary ?? ''} ${lexicalToText(d.body)}`, url: `/business/bids/${d.slug}`, contentType: 'bid' }),
})

/** Local business directory (orangenj.gov Resource Directory). */
export const BusinessListings: CollectionConfig = {
  slug: 'business-listings',
  admin: { group: 'Business', useAsTitle: 'name', defaultColumns: ['name', 'address', 'phone'] },
  access: reference,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'key', type: 'text', required: true, unique: true, admin: { readOnly: true, description: 'Name + address, used to keep imports idempotent.' } },
    { name: 'address', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'website', type: 'text' },
    { name: 'category', type: 'text' },
    verificationField, sourceField,
  ],
}
