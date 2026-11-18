"""log_event(): the one call sites use to write the audit trail."""
from .middleware import client_ip, get_current_request
from .models import AuditLog


def log_event(
    action: str,
    module: str,
    *,
    obj=None,
    object_type: str = "",
    object_id: str = "",
    object_repr: str = "",
    before=None,
    after=None,
    success: bool = True,
    severity: str = AuditLog.Severity.INFO,
    reason: str = "",
    actor=None,
    retention_category: str = "audit-standard",
) -> AuditLog:
    request = get_current_request()
    if actor is None and request is not None and getattr(request, "user", None) is not None:
        if request.user.is_authenticated:
            actor = request.user

    if obj is not None:
        object_type = object_type or type(obj).__name__
        object_id = object_id or str(getattr(obj, "pk", ""))
        object_repr = object_repr or str(obj)[:300]

    role_names = ""
    department = ""
    if actor is not None:
        role_names = ", ".join(actor.roles.values_list("name", flat=True))[:200]
        department = actor.department.name if actor.department_id else ""

    return AuditLog.append(
        actor=actor,
        actor_username=actor.get_username() if actor else "",
        actor_role=role_names,
        department=department,
        ip_address=client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "")[:300] if request else ""),
        action=action,
        module=module,
        object_type=object_type,
        object_id=object_id,
        object_repr=object_repr,
        before=before,
        after=after,
        success=success,
        severity=severity,
        reason=reason,
        retention_category=retention_category,
    )
