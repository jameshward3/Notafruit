import { createHash } from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { verificationField } from '../fields/workflow'
import { adminOnly, hasRole, isAdmin, nobody, ROLE_LABELS, ROLES, staffOnly, userOf } from '../access/roles'

import { proxyStrategy } from '../auth/proxyStrategy'

const authMode = process.env.AUTH_MODE ?? 'local'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', group: 'Administration', defaultColumns: ['email', 'name', 'roles', 'departments'] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
    useSessions: true,
    cookies: { sameSite: 'Strict', secure: process.env.NODE_ENV === 'production' },
    // Production: local passwords are disabled; staff sign in through the
    // MFA-enforcing identity provider (see src/auth/proxyStrategy.ts).
    disableLocalStrategy: authMode === 'proxy' ? true : undefined,
    strategies: authMode === 'proxy' ? [proxyStrategy] : [],
  },
  access: {
    read: ({ req }) => {
      const u = userOf(req)
      if (!u) return false
      return isAdmin(u) ? true : { id: { equals: u.id } }
    },
    create: adminOnly,
    update: ({ req }) => {
      const u = userOf(req)
      if (!u) return false
      return isAdmin(u) ? true : { id: { equals: u.id } }
    },
    delete: adminOnly,
    admin: ({ req }) => !!userOf(req),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles', type: 'select', hasMany: true, required: true, defaultValue: ['contributor'],
      options: ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
      access: { update: ({ req }) => isAdmin(userOf(req)), create: ({ req }) => isAdmin(userOf(req)) },
      admin: { description: 'See docs/permission-matrix.md. Only administrators can change roles.' },
    },
    {
      name: 'departments', type: 'relationship', relationTo: 'departments', hasMany: true,
      access: { update: ({ req }) => isAdmin(userOf(req)), create: ({ req }) => isAdmin(userOf(req)) },
      admin: { description: 'Contributors and reviewers can only work on content for these departments.' },
    },
    {
      name: 'canEmergencyPublish', type: 'checkbox', defaultValue: false,
      access: { update: ({ req }) => isAdmin(userOf(req)), create: ({ req }) => isAdmin(userOf(req)) },
      admin: { description: 'May publish emergency notices without review. Every use is audited.' },
    },
    { name: 'identityProviderSubject', type: 'text', index: true, admin: { readOnly: true, description: 'Linked identity from the staff sign-in provider.' } },
  ],
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content', useAsTitle: 'alt', defaultColumns: ['filename', 'kind', 'alt', 'approvalStatus', 'verificationStatus'],
    description: 'Asset manifest (style guide §2). Approval (may it be used?) and verification (are its facts — location, rights — confirmed?) are separate.' },
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: ({ req }) => hasRole(userOf(req), 'publisher', 'administrator') },
  upload: {
    // SVG is deliberately not accepted: SVGs must be sanitized offline before entering the asset pipeline.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    focalPoint: true,
    // The uploaded original is preserved unchanged; only derivatives are re-encoded (hero 16:9, card 4:3).
    imageSizes: [
      { name: 'card', width: 640, height: 480, position: 'centre', formatOptions: { format: 'webp' } },
      { name: 'cardAvif', width: 640, height: 480, position: 'centre', formatOptions: { format: 'avif' } },
      { name: 'hero', width: 1600, height: 900, position: 'centre', formatOptions: { format: 'webp' } },
      { name: 'heroAvif', width: 1600, height: 900, position: 'centre', formatOptions: { format: 'avif' } },
    ],
  },
  hooks: {
    beforeChange: [async ({ data, req, originalDoc }) => {
      // Checksum of the original file (manifest requirement).
      const file = (req as any).file as { data?: Buffer } | undefined
      if (file?.data) data.checksumSha256 = createHash('sha256').update(file.data).digest('hex')
      // Record who approved and when; clear on un-approval.
      if (data.approvalStatus && data.approvalStatus !== originalDoc?.approvalStatus) {
        const u = userOf(req)
        if (data.approvalStatus === 'approved') { data.approvedBy = u?.id; data.approvedAt = new Date().toISOString() }
        else { data.approvedBy = null; data.approvedAt = null }
      }
      return data
    }],
  },
  fields: [
    {
      name: 'kind', type: 'select', required: true, defaultValue: 'photo',
      options: [{ label: 'Photograph', value: 'photo' }, { label: 'Official seal / logo', value: 'seal' }, { label: 'Illustration / graphic', value: 'illustration' }, { label: 'Document scan', value: 'document' }],
    },
    { name: 'decorative', type: 'checkbox', defaultValue: false, admin: { description: 'Purely decorative (conveys no information). Decorative images use empty alt text.' } },
    {
      name: 'alt', type: 'text',
      admin: { description: 'Describe what the image shows for people who cannot see it. Not "image of…". Leave empty only for decorative images.' },
      validate: (v: unknown, { data }: any) => (data?.decorative ? true : (typeof v === 'string' && v.trim().length >= 5) || 'Alt text is required unless the image is decorative.'),
    },
    { name: 'captureDate', type: 'date', admin: { description: 'When the photo was taken, if known.' } },
    { name: 'credit', type: 'text' },
    { name: 'rightsHolder', type: 'text', required: true },
    { name: 'license', type: 'text', required: true, admin: { description: 'e.g. "City-owned", "CC BY 4.0", "Licensed from …"' } },
    { name: 'sourceUrl', type: 'text' },
    { name: 'location', type: 'text', admin: { description: 'Where in Orange the photo was taken.' } },
    { name: 'locationVerified', type: 'checkbox', defaultValue: false },
    { name: 'isGenerated', type: 'checkbox', defaultValue: false, admin: { description: 'AI-generated or illustrative. Never use to depict a real Orange location.' } },
    {
      name: 'approvalStatus', type: 'select', defaultValue: 'pending', required: true,
      options: ['pending', 'approved', 'rejected'].map((v) => ({ label: v, value: v })),
      access: { update: ({ req }) => hasRole(userOf(req), 'publisher', 'administrator') },
    },
    { name: 'approvedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'approvedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'checksumSha256', type: 'text', admin: { readOnly: true, position: 'sidebar', description: 'SHA-256 of the uploaded original.' } },
    verificationField,
  ],
}

export const SourceRecords: CollectionConfig = {
  slug: 'source-records',
  admin: { group: 'Records & provenance', useAsTitle: 'title', defaultColumns: ['title', 'ownerType', 'retrievedAt', 'status'] },
  // Lineage is public by design (residents can see where facts came from).
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'url', type: 'text' },
    { name: 'owner', type: 'text', required: true },
    {
      name: 'ownerType', type: 'select', required: true,
      options: [
        { label: 'Official municipal', value: 'official' },
        { label: 'Other government (County/State)', value: 'government' },
        { label: 'Third party', value: 'third_party' },
        { label: 'Campaign / private (not authoritative)', value: 'campaign' },
      ],
    },
    { name: 'retrievedAt', type: 'date', required: true },
    { name: 'checksumSha256', type: 'text' },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'captured',
      options: ['captured', 'verified', 'discrepancy', 'inaccessible', 'excluded'].map((v) => ({ label: v, value: v })),
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Discrepancies and what remains unverified.' } },
  ],
}

export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  admin: { group: 'Administration', useAsTitle: 'action', defaultColumns: ['createdAt', 'actorEmail', 'action', 'targetCollection', 'targetId'] },
  access: {
    read: ({ req }) => hasRole(userOf(req), 'administrator', 'publisher', 'records_clerk'),
    create: nobody, update: nobody, delete: nobody,
  },
  fields: [
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'targetCollection', type: 'text', index: true },
    { name: 'targetId', type: 'text', index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorEmail', type: 'text' },
    { name: 'emergency', type: 'checkbox' },
    { name: 'detail', type: 'json' },
  ],
}

/** Private resident service requests. Never publicly readable; created only through /api/public/concerns. */
export const ServiceRequests: CollectionConfig = {
  slug: 'service-requests',
  admin: { group: 'Resident requests', useAsTitle: 'reference', defaultColumns: ['reference', 'category', 'status', 'createdAt'] },
  access: {
    read: staffOnly,
    create: nobody,
    update: ({ req }) => hasRole(userOf(req), 'administrator', 'publisher', 'department_reviewer'),
    delete: adminOnly,
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true },
    { name: 'category', type: 'select', required: true, options: ['pothole', 'streetlight', 'trash', 'sidewalk', 'tree', 'other'].map((v) => ({ label: v, value: v })) },
    { name: 'description', type: 'textarea', required: true },
    { name: 'locationText', type: 'text', required: true },
    { name: 'contactName', type: 'text' },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    { name: 'status', type: 'select', defaultValue: 'received', options: ['received', 'routed', 'in_progress', 'resolved', 'closed'].map((v) => ({ label: v, value: v })) },
    { name: 'department', type: 'relationship', relationTo: 'departments' },
    { name: 'internalNotes', type: 'textarea' },
  ],
}

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: { group: 'Notifications', useAsTitle: 'email', defaultColumns: ['email', 'topicType', 'topicId', 'status'] },
  access: { read: ({ req }) => hasRole(userOf(req), 'administrator'), create: nobody, update: adminOnly, delete: adminOnly },
  indexes: [{ fields: ['email', 'topicType', 'topicId'], unique: true }],
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'topicType', type: 'select', required: true, options: ['notices', 'meetings', 'project'].map((v) => ({ label: v, value: v })) },
    { name: 'topicId', type: 'text', defaultValue: '*', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', options: ['pending', 'confirmed', 'unsubscribed', 'suppressed'].map((v) => ({ label: v, value: v })) },
    { name: 'confirmedAt', type: 'date' },
  ],
}

export const Outbox: CollectionConfig = {
  slug: 'outbox',
  admin: { group: 'Notifications', useAsTitle: 'subject', defaultColumns: ['subject', 'to', 'status', 'attempts', 'updatedAt'] },
  access: { read: ({ req }) => hasRole(userOf(req), 'administrator'), create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'dedupeKey', type: 'text', required: true, unique: true, index: true },
    { name: 'to', type: 'email', required: true },
    { name: 'subject', type: 'text', required: true },
    { name: 'text', type: 'textarea', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', index: true, options: ['pending', 'sending', 'sent', 'failed', 'suppressed'].map((v) => ({ label: v, value: v })) },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'nextAttemptAt', type: 'date' },
    { name: 'providerMessageId', type: 'text' },
    { name: 'lastError', type: 'textarea' },
    { name: 'sentAt', type: 'date' },
  ],
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: { group: 'Records & provenance', useAsTitle: 'from', defaultColumns: ['from', 'to', 'statusCode'] },
  access: { read: () => true, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'from', type: 'text', required: true, unique: true, admin: { description: 'Old path, e.g. /181/Online-Bill-Payment' } },
    { name: 'to', type: 'text', required: true },
    { name: 'statusCode', type: 'select', defaultValue: '301', options: ['301', '302', '410'].map((v) => ({ label: v, value: v })) },
    { name: 'sourceUrl', type: 'text' },
  ],
}

/** Link-check report (written only by the worker). One row per URL. */
export const LinkChecks: CollectionConfig = {
  slug: 'link-checks',
  admin: { group: 'Administration', useAsTitle: 'url', defaultColumns: ['url', 'status', 'httpStatus', 'checkedAt', 'referencedBy'],
    description: 'Daily check of links entered by editors (services, departments). Fix broken links in the referencing item.' },
  access: { read: staffOnly, create: nobody, update: nobody, delete: adminOnly },
  fields: [
    { name: 'url', type: 'text', required: true, unique: true, index: true },
    { name: 'status', type: 'select', required: true, options: ['ok', 'broken', 'blocked', 'error'].map((v) => ({ label: v, value: v })) },
    { name: 'httpStatus', type: 'number' },
    { name: 'finalUrl', type: 'text' },
    { name: 'detail', type: 'text' },
    { name: 'checkedAt', type: 'date', required: true },
    { name: 'referencedBy', type: 'text', admin: { description: 'Where the link is used.' } },
  ],
}
