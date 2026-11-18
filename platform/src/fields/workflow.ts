/**
 * Editorial workflow + verification fields, transition enforcement and audit.
 *
 * Publication state (workflowStatus) and factual verification state
 * (verificationStatus) are deliberately separate: a record can be published but
 * flagged "demo", or verified but still in draft.
 */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
} from 'payload'
import { APIError } from 'payload'

import {
  canApproveIn,
  canAuthorIn,
  canPublishIn,
  departmentIds,
  isAdmin,
  TRANSITIONS,
  unscopedIn,
  userOf,
  WORKFLOW_STATES,
  workflowCreate,
  workflowRead,
  workflowUpdate,
  type Domain,
  type WorkflowState,
} from '../access/roles'
import { writeAudit } from '../lib/audit'
import { indexDoc, isPubliclyVisible, removeDoc, type SearchDoc } from '../lib/search'

export const verificationField: Field = {
  name: 'verificationStatus',
  type: 'select',
  required: true,
  defaultValue: 'unverified',
  options: [
    { label: 'Unverified', value: 'unverified' },
    { label: 'Verified against official source', value: 'verified' },
    { label: 'Needs review (discrepancy)', value: 'needs_review' },
    { label: 'Illustrative demo content', value: 'demo' },
  ],
  admin: {
    position: 'sidebar',
    description:
      'Factual verification is separate from publication. "Demo" content is always labeled on public pages.',
  },
}

export const sourceField: Field = {
  name: 'sources',
  type: 'relationship',
  relationTo: 'source-records',
  hasMany: true,
  admin: { position: 'sidebar', description: 'Where these facts came from (lineage).' },
}

export const workflowFields = (): Field[] => [
  {
    name: 'sourceWarning', type: 'ui',
    admin: { position: 'sidebar', components: { Field: '/components/admin/SourceWarning#SourceWarning' } },
  },
  {
    name: 'workflowStatus',
    type: 'select',
    required: true,
    defaultValue: 'draft',
    index: true,
    options: WORKFLOW_STATES.map((s) => ({ label: s.replace('_', ' '), value: s })),
    admin: {
      position: 'sidebar',
      description:
        'Draft → In review → Approved → Scheduled/Published → Archived. Approval and publication are separate steps.',
    },
  },
  {
    name: 'publishAt',
    type: 'date',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
      description: 'For "scheduled": the worker publishes at this time (America/New_York shown).',
    },
  },
  {
    name: 'expiresAt',
    type: 'date',
    index: true,
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
      description: 'Optional. The worker archives the item after this time; public pages hide it immediately.',
    },
  },
  {
    name: 'emergencyPublish',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description: 'Bypass review (authorized staff only; always audited).',
    },
  },
  {
    name: 'publishedAt',
    type: 'date',
    admin: { position: 'sidebar', readOnly: true },
  },
  verificationField,
]

const transitionHook =
  (domain: Domain): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req, operation, context }) => {
    // Trusted system actions (worker, seed, import commit) set context.system.
    if (context?.system) return data
    const user = userOf(req)
    if (!user) throw new APIError('Authentication required.', 401)

    const from: WorkflowState = (originalDoc?.workflowStatus as WorkflowState) ?? 'draft'
    const to: WorkflowState = (data.workflowStatus as WorkflowState) ?? from

    if (operation === 'create' && to !== 'draft') {
      if (!(data.emergencyPublish && to === 'published')) {
        throw new APIError('New content starts as a draft.', 403)
      }
    }

    // Department scoping on create/move: scoped staff may only assign their own departments.
    const dept = data.department ?? originalDoc?.department
    if (!unscopedIn(user, domain) && !isAdmin(user)) {
      if (!dept) throw new APIError('Choose one of your departments for this item.', 400)
      const id = typeof dept === 'object' ? dept.id : dept
      if (!departmentIds(user).map(String).includes(String(id))) {
        throw new APIError('You can only edit content for your own departments.', 403)
      }
    }

    if (from !== to || (operation === 'create' && to !== 'draft')) {
      if (data.emergencyPublish && to === 'published') {
        if (!user.canEmergencyPublish && !isAdmin(user)) {
          throw new APIError('You are not authorized for emergency publishing.', 403)
        }
      } else {
        const needed = TRANSITIONS[from]?.[to]
        if (!needed) throw new APIError(`Transition ${from} → ${to} is not allowed.`, 400)
        const ok =
          needed === 'author'
            ? canAuthorIn(user, domain) || canApproveIn(user, domain)
            : needed === 'approve'
              ? canApproveIn(user, domain)
              : canPublishIn(user, domain)
        if (!ok) throw new APIError(`Your role cannot move content from ${from} to ${to}.`, 403)
      }
      if (to === 'scheduled' && !data.publishAt) {
        throw new APIError('Scheduled content needs a publish time.', 400)
      }
      if (to === 'published') data.publishedAt = new Date().toISOString()
    } else if (from === 'published' && !canPublishIn(user, domain)) {
      // Non-publishers may not silently edit live content.
      throw new APIError('Published content can only be corrected by a publisher. Create a revision request.', 403)
    }
    return data
  }

const auditAfterChange =
  (slug: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, operation, context }) => {
    await writeAudit(req, {
      action:
        operation === 'create'
          ? 'create'
          : previousDoc?.workflowStatus !== doc.workflowStatus
            ? `transition:${previousDoc?.workflowStatus}->${doc.workflowStatus}`
            : 'update',
      collection: slug,
      docId: String(doc.id),
      emergency: !!doc.emergencyPublish && doc.workflowStatus === 'published',
      system: !!context?.system,
    })
    return doc
  }

const auditAfterDelete =
  (slug: string): CollectionAfterDeleteHook =>
  async ({ id, req }) => {
    await writeAudit(req, { action: 'delete', collection: slug, docId: String(id) })
  }

export type WorkflowOpts = {
  departmentField?: string
  /** Map a publicly visible doc to its search entry (null = not searchable). */
  search?: (doc: any) => Omit<SearchDoc, 'collection' | 'docId'> | null
  /** Runs once when a doc becomes published (notification fan-out). */
  onPublish?: (doc: any, req: any) => Promise<unknown>
}

const searchAfterChange =
  (slug: string, opts: WorkflowOpts): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, context }) => {
    if (opts.search) {
      const entry = isPubliclyVisible(doc) ? opts.search(doc) : null
      if (entry) await indexDoc(req.payload, { ...entry, collection: slug, docId: String(doc.id), isDemo: doc.verificationStatus === 'demo' })
      else await removeDoc(req.payload, slug, String(doc.id))
    }
    // Bulk imports of historic records set context.skipNotify so subscribers are not emailed about the archive.
    if (opts.onPublish && !context?.skipNotify && doc.workflowStatus === 'published' && previousDoc?.workflowStatus !== 'published') {
      await opts.onPublish(doc, req)
    }
    return doc
  }

/** Search mappers by collection slug (used by the reconcile job). */
export const SEARCH_REGISTRY = new Map<string, NonNullable<WorkflowOpts['search']>>()
/** Collections that use the workflow (used by the publication sweep). */
export const WORKFLOW_COLLECTIONS = new Set<string>()

/** Apply workflow fields, access control, versioning, transition rules and audit to a collection. */
export const withWorkflow = (
  domain: Domain,
  config: CollectionConfig,
  opts: WorkflowOpts = {},
): CollectionConfig => {
  WORKFLOW_COLLECTIONS.add(config.slug)
  if (opts.search) SEARCH_REGISTRY.set(config.slug, opts.search)
  return {
  ...config,
  versions: { maxPerDoc: 100 },
  access: {
    read: workflowRead(domain, opts),
    create: workflowCreate(domain),
    update: workflowUpdate(domain, opts),
    delete: ({ req }) => canPublishIn(userOf(req), domain),
    readVersions: ({ req }) => !!userOf(req),
    ...config.access,
  },
  fields: [...config.fields, ...workflowFields()],
  hooks: {
    ...config.hooks,
    beforeChange: [transitionHook(domain), ...(config.hooks?.beforeChange ?? [])],
    afterChange: [...(config.hooks?.afterChange ?? []), searchAfterChange(config.slug, opts), auditAfterChange(config.slug)],
    afterDelete: [
      ...(config.hooks?.afterDelete ?? []),
      async ({ id, req }) => { await removeDoc(req.payload, config.slug, String(id)) },
      auditAfterDelete(config.slug),
    ],
  },
  admin: {
    ...config.admin,
    // Staff-only draft preview (requires a signed-in session; see app/(site)/preview).
    preview: (doc) => `${process.env.PUBLIC_SITE_URL ?? ''}/preview/${config.slug}/${doc.id}`,
    defaultColumns: config.admin?.defaultColumns ?? ['title', 'workflowStatus', 'verificationStatus', 'updatedAt'],
  },
}
}
