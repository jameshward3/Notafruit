/**
 * Role model and permission matrix — single source of truth.
 * Documented in docs/permission-matrix.md; enforced server-side by collection
 * access functions and the workflow transition hook (src/fields/workflow.ts).
 */
import type { Access, PayloadRequest, Where } from 'payload'

export const ROLES = [
  'contributor',
  'department_reviewer',
  'publisher',
  'records_clerk',
  'data_manager',
  'administrator',
] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  contributor: 'Contributor',
  department_reviewer: 'Department reviewer',
  publisher: 'Publisher',
  records_clerk: 'Records clerk',
  data_manager: 'Data manager',
  administrator: 'Administrator',
}

export const WORKFLOW_STATES = [
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived',
] as const
export type WorkflowState = (typeof WORKFLOW_STATES)[number]

/** Editorial domains. Each workflow collection belongs to exactly one. */
export type Domain = 'editorial' | 'records' | 'data'

type StaffUser = {
  id: number | string
  roles?: Role[] | null
  departments?: (number | string | { id: number | string })[] | null
  canEmergencyPublish?: boolean | null
  collection?: string
}

export const userOf = (req: PayloadRequest): StaffUser | null =>
  req.user && (req.user as StaffUser).collection === 'users' ? (req.user as StaffUser) : null

export const hasRole = (user: StaffUser | null | undefined, ...roles: Role[]) =>
  !!user?.roles?.some((r) => roles.includes(r))

export const isAdmin = (user: StaffUser | null | undefined) => hasRole(user, 'administrator')

export const departmentIds = (user: StaffUser | null | undefined): (number | string)[] =>
  (user?.departments ?? []).map((d) => (typeof d === 'object' ? d.id : d))

/** Roles that may move content in a domain to approved / published, regardless of department. */
const DOMAIN_PUBLISHERS: Record<Domain, Role[]> = {
  editorial: ['publisher', 'administrator'],
  records: ['records_clerk', 'publisher', 'administrator'],
  data: ['data_manager', 'publisher', 'administrator'],
}
/** Roles that may author (create / edit drafts) in a domain. Contributors are department-scoped. */
const DOMAIN_AUTHORS: Record<Domain, Role[]> = {
  editorial: ['contributor', 'department_reviewer', 'publisher', 'administrator'],
  records: ['records_clerk', 'administrator'],
  data: ['data_manager', 'administrator'],
}

export const canPublishIn = (user: StaffUser | null, domain: Domain) =>
  hasRole(user, ...DOMAIN_PUBLISHERS[domain])
export const canAuthorIn = (user: StaffUser | null, domain: Domain) =>
  hasRole(user, ...DOMAIN_AUTHORS[domain])
/** Reviewers approve within their own departments; domain publishers approve anywhere. */
export const canApproveIn = (user: StaffUser | null, domain: Domain) =>
  canPublishIn(user, domain) || hasRole(user, 'department_reviewer')

/** True when the user acts across all departments in this domain (not department-scoped). */
export const unscopedIn = (user: StaffUser | null, domain: Domain) =>
  canPublishIn(user, domain) || (domain === 'records' && hasRole(user, 'records_clerk'))

/**
 * Allowed workflow transitions and which capability each requires.
 * 'author' = may edit; 'approve' = reviewer/publisher; 'publish' = domain publisher.
 */
export const TRANSITIONS: Record<WorkflowState, Partial<Record<WorkflowState, 'author' | 'approve' | 'publish'>>> = {
  draft: { in_review: 'author' },
  in_review: { draft: 'approve', approved: 'approve' },
  approved: { draft: 'approve', scheduled: 'publish', published: 'publish' },
  scheduled: { approved: 'publish', published: 'publish', archived: 'publish' },
  published: { archived: 'publish', draft: 'publish' },
  archived: { draft: 'publish', published: 'publish' },
}

/** Public filter applied to every public read of workflow content. */
export const publishedWhere = (): Where => ({
  and: [
    { workflowStatus: { equals: 'published' } },
    {
      or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }],
    },
  ],
})

/**
 * Read access for workflow collections:
 * - anonymous / non-staff: published only (applies to REST, GraphQL and Local API with overrideAccess:false)
 * - department-scoped staff: published + anything in their departments
 * - unscoped staff in this domain: everything
 */
export const workflowRead =
  (domain: Domain, opts: { departmentField?: string } = {}): Access =>
  ({ req }) => {
    const user = userOf(req)
    if (!user) return publishedWhere()
    if (unscopedIn(user, domain) || isAdmin(user)) return true
    const field = opts.departmentField ?? 'department'
    const depts = departmentIds(user)
    return { or: [publishedWhere(), { [field]: { in: depts.length ? depts : [-1] } }] }
  }

export const workflowCreate =
  (domain: Domain): Access =>
  ({ req }) => canAuthorIn(userOf(req), domain)

/** Update: unscoped staff anywhere; scoped authors only in their departments. */
export const workflowUpdate =
  (domain: Domain, opts: { departmentField?: string } = {}): Access =>
  ({ req }) => {
    const user = userOf(req)
    if (!user) return false
    if (unscopedIn(user, domain) || isAdmin(user)) return true
    if (!canAuthorIn(user, domain) && !hasRole(user, 'department_reviewer')) return false
    const depts = departmentIds(user)
    return { [opts.departmentField ?? 'department']: { in: depts.length ? depts : [-1] } }
  }

export const adminOnly: Access = ({ req }) => isAdmin(userOf(req))
export const staffOnly: Access = ({ req }) => !!userOf(req)
export const nobody: Access = () => false
export const anyone: Access = () => true
