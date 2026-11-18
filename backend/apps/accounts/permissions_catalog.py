"""
The RBAC permission catalog and default role definitions.

This is the single source of truth for permission codes. The seed command
loads it into the Permission/Role tables; code references permissions only by
these constants so a typo fails loudly at import time.
"""

# (code, label, module)
PERMISSIONS = [
    ("records.view", "View records", "records"),
    ("records.create", "Create records", "records"),
    ("records.edit", "Edit records", "records"),
    ("records.delete", "Delete records", "records"),
    ("records.approve", "Approve records", "records"),
    ("records.publish", "Publish records", "records"),
    ("documents.upload", "Upload documents", "records"),
    ("documents.download", "Download documents", "records"),
    ("documents.redact", "Redact documents", "records"),
    ("opra.manage", "Manage OPRA requests", "opra"),
    ("meetings.manage", "Manage meetings", "meetings"),
    ("agendas.manage", "Manage agendas and packets", "meetings"),
    ("ordinances.manage", "Manage ordinances", "legislation"),
    ("resolutions.manage", "Manage resolutions", "legislation"),
    ("notices.manage", "Manage public notices", "notices"),
    ("licenses.manage", "Manage licenses", "licensing"),
    ("boards.manage", "Manage boards and appointments", "boards"),
    ("users.manage", "Manage users", "accounts"),
    ("logs.view", "View audit logs", "audit"),
    ("logs.export", "Export audit logs", "audit"),
    ("system.configure", "Configure system settings", "core"),
    ("retention.approve_destruction", "Approve retention destruction", "records"),
    ("locks.override", "Override document locks", "records"),
    ("legalhold.place", "Place legal holds", "records"),
    ("legalhold.remove", "Remove legal holds", "records"),
    ("public.export", "Export public records", "records"),
    ("compliance.access", "Access compliance center", "compliance"),
]

ALL_CODES = [code for code, _, _ in PERMISSIONS]

_VIEW_DOWNLOAD = ["records.view", "documents.download"]
_CONTRIBUTE = _VIEW_DOWNLOAD + ["records.create", "records.edit", "documents.upload"]
_CLERK_OPS = _CONTRIBUTE + [
    "records.approve",
    "records.publish",
    "documents.redact",
    "opra.manage",
    "meetings.manage",
    "agendas.manage",
    "ordinances.manage",
    "resolutions.manage",
    "notices.manage",
    "licenses.manage",
    "boards.manage",
    "public.export",
    "logs.view",
]

# Role name -> permission codes. "*" = every permission.
DEFAULT_ROLES = {
    "Super Admin": "*",
    "Municipal Clerk": _CLERK_OPS
    + [
        "records.delete",
        "users.manage",
        "logs.export",
        "retention.approve_destruction",
        "locks.override",
        "legalhold.place",
        "legalhold.remove",
        "compliance.access",
    ],
    "Deputy Clerk": _CLERK_OPS + ["locks.override", "compliance.access"],
    "Clerk Staff": _CONTRIBUTE + ["meetings.manage", "agendas.manage", "notices.manage", "licenses.manage"],
    "Records Custodian": _CONTRIBUTE
    + ["documents.redact", "retention.approve_destruction", "legalhold.place", "public.export"],
    "Department Head": _CONTRIBUTE + ["records.approve", "opra.manage"],
    "Department Contributor": _CONTRIBUTE,
    "Legal Counsel": _VIEW_DOWNLOAD + ["documents.redact", "legalhold.place", "legalhold.remove", "records.approve"],
    "Council Member View-Only": _VIEW_DOWNLOAD,
    "Mayor/Business Administrator View-Only": _VIEW_DOWNLOAD + ["compliance.access"],
    "Public Portal Publisher": _VIEW_DOWNLOAD + ["records.publish", "public.export"],
    "Auditor View-Only": _VIEW_DOWNLOAD + ["logs.view", "logs.export", "compliance.access"],
}
