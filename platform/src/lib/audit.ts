import type { PayloadRequest } from 'payload'

type AuditInput = {
  action: string
  collection: string
  docId?: string
  emergency?: boolean
  system?: boolean
  detail?: Record<string, unknown>
}

/** Append-only audit trail (audit-events collection denies update/delete to everyone). */
export async function writeAudit(req: PayloadRequest, input: AuditInput) {
  const user = req.user as { id?: number | string; email?: string } | null
  await req.payload.create({
    collection: 'audit-events',
    overrideAccess: true,
    req,
    data: {
      action: input.action,
      targetCollection: input.collection,
      targetId: input.docId,
      actor: user?.id ? Number(user.id) : undefined,
      actorEmail: user?.email ?? (input.system ? 'system' : 'anonymous'),
      emergency: !!input.emergency,
      detail: input.detail ?? {},
    },
  })
}
