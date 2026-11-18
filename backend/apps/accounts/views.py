import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.audit.middleware import client_ip
from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.core.api import AuditedModelViewSet, ReadOnlyAuditedViewSet

from .models import Department, LoginEvent, Permission, Role, User, UserSession
from .serializers import (
    DepartmentSerializer,
    PermissionSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserSessionSerializer,
)

MAX_ATTEMPTS = settings.CLERKOS_LOCKOUT_THRESHOLD
LOCKOUT = timedelta(minutes=settings.CLERKOS_LOCKOUT_MINUTES)


def _user_payload(user: User) -> dict:
    return {
        "id": user.pk,
        "username": user.username,
        "full_name": user.get_full_name() or user.username,
        "email": user.email,
        "title": user.title,
        "department": user.department.name if user.department_id else None,
        "roles": list(user.roles.values_list("name", flat=True)),
        "permissions": sorted(user.permission_codes()),
        "is_superuser": user.is_superuser,
        "must_change_password": user.must_change_password,
        "mfa_enabled": user.mfa_enabled,
    }


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token_view(request):
    return Response({"detail": "CSRF cookie set"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    ip = client_ip(request)
    ua = request.META.get("HTTP_USER_AGENT", "")[:300]

    def fail(reason: str, status_code=status.HTTP_401_UNAUTHORIZED, user=None, detail=None):
        LoginEvent.objects.create(
            user=user, username_attempted=username, success=False, failure_reason=reason, ip_address=ip, user_agent=ua
        )
        log_event(
            AuditLog.Action.LOGIN_FAILED, "accounts", object_repr=username, success=False,
            severity=AuditLog.Severity.WARNING, reason=reason, actor=user,
        )
        return Response({"detail": detail or "Invalid credentials."}, status=status_code)

    known = User.objects.filter(username=username).first()
    if known is not None:
        if known.is_locked:
            return fail("account_locked", detail="Account is temporarily locked. Try again later or contact an administrator.")
        if known.access_expired:
            return fail("access_expired", detail="Temporary access has expired.")

    user = authenticate(request, username=username, password=password)
    if user is None:
        if known is not None:
            known.failed_login_attempts += 1
            if known.failed_login_attempts >= MAX_ATTEMPTS:
                known.locked_until = timezone.now() + LOCKOUT
                known.failed_login_attempts = 0
                known.save(update_fields=["failed_login_attempts", "locked_until"])
                log_event(
                    AuditLog.Action.SECURITY, "accounts", obj=known, success=False,
                    severity=AuditLog.Severity.CRITICAL, reason="Account locked after repeated failed logins",
                )
                return fail("account_locked", detail="Account locked after repeated failed attempts.", user=known)
            known.save(update_fields=["failed_login_attempts"])
        return fail("bad_credentials")

    if not user.is_active:
        return fail("inactive", user=user, detail="Account is deactivated.")

    login(request, user)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_ip = ip
    user.save(update_fields=["failed_login_attempts", "locked_until", "last_login_ip"])

    UserSession.objects.update_or_create(
        session_key=request.session.session_key,
        defaults={"user": user, "ip_address": ip, "user_agent": ua, "ended_at": None, "is_revoked": False},
    )
    LoginEvent.objects.create(user=user, username_attempted=username, success=True, ip_address=ip, user_agent=ua)
    log_event(AuditLog.Action.LOGIN, "accounts", obj=user, actor=user)
    return Response(_user_payload(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    key = request.session.session_key
    if key:
        UserSession.objects.filter(session_key=key).update(ended_at=timezone.now())
    log_event(AuditLog.Action.LOGOUT, "accounts", obj=request.user)
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(_user_payload(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    current = request.data.get("current_password") or ""
    new = request.data.get("new_password") or ""
    if not user.check_password(current):
        log_event(AuditLog.Action.SECURITY, "accounts", obj=user, success=False, reason="Password change: wrong current password", severity=AuditLog.Severity.WARNING)
        return Response({"detail": "Current password is incorrect."}, status=400)
    try:
        validate_password(new, user=user)
    except ValidationError as exc:
        return Response({"detail": exc.messages}, status=400)
    user.set_password(new)
    user.must_change_password = False
    user.last_password_change = timezone.now()
    user.save(update_fields=["password", "must_change_password", "last_password_change"])
    update_session_auth_hash(request, user)  # keep the session valid after rotation
    log_event(AuditLog.Action.SECURITY, "accounts", obj=user, reason="Password changed", severity=AuditLog.Severity.NOTICE)
    return Response({"detail": "Password updated."})


class UserViewSet(AuditedModelViewSet):
    queryset = User.objects.select_related("department").prefetch_related("roles").order_by("username")
    audit_module = "accounts"
    rbac = {
        "view": "users.manage", "create": "users.manage", "edit": "users.manage", "delete": "users.manage",
        "reset_password": "users.manage", "unlock": "users.manage", "revoke_sessions": "users.manage",
    }
    filterset_fields = ["is_active", "department", "roles"]
    search_fields = ["username", "first_name", "last_name", "email", "title"]

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == "create" else UserSerializer

    def perform_destroy(self, instance):
        # Government accounts are deactivated, never hard-deleted, so the
        # audit trail keeps a resolvable actor.
        before = {"is_active": instance.is_active}
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        log_event(
            AuditLog.Action.ADMIN_ACTION, "accounts", obj=instance, before=before,
            after={"is_active": False}, reason="User deactivated", severity=AuditLog.Severity.NOTICE,
        )

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        temp = request.data.get("new_password") or secrets.token_urlsafe(12)
        user.set_password(temp)
        user.must_change_password = True
        user.locked_until = None
        user.failed_login_attempts = 0
        user.save(update_fields=["password", "must_change_password", "locked_until", "failed_login_attempts"])
        log_event(AuditLog.Action.ADMIN_ACTION, "accounts", obj=user, reason="Password reset by administrator", severity=AuditLog.Severity.NOTICE)
        generated = "new_password" not in request.data
        return Response({"detail": "Password reset.", "temporary_password": temp if generated else None})

    @action(detail=True, methods=["post"])
    def unlock(self, request, pk=None):
        user = self.get_object()
        user.locked_until = None
        user.failed_login_attempts = 0
        user.save(update_fields=["locked_until", "failed_login_attempts"])
        log_event(AuditLog.Action.ADMIN_ACTION, "accounts", obj=user, reason="Account unlocked", severity=AuditLog.Severity.NOTICE)
        return Response({"detail": "Account unlocked."})

    @action(detail=True, methods=["post"])
    def revoke_sessions(self, request, pk=None):
        user = self.get_object()
        count = UserSession.objects.filter(user=user, ended_at=None, is_revoked=False).update(
            is_revoked=True, revoked_by=request.user
        )
        log_event(AuditLog.Action.ADMIN_ACTION, "accounts", obj=user, reason=f"{count} session(s) revoked", severity=AuditLog.Severity.NOTICE)
        return Response({"detail": f"{count} session(s) revoked."})


class RoleViewSet(AuditedModelViewSet):
    queryset = Role.objects.prefetch_related("permissions").order_by("name")
    serializer_class = RoleSerializer
    audit_module = "accounts"
    rbac = {"view": None, "create": "users.manage", "edit": "users.manage", "delete": "users.manage"}

    def perform_update(self, serializer):
        before = sorted(serializer.instance.permissions.values_list("code", flat=True))
        instance = serializer.save()
        after = sorted(instance.permissions.values_list("code", flat=True))
        log_event(
            AuditLog.Action.PERMISSION_CHANGE, "accounts", obj=instance,
            before={"permissions": before}, after={"permissions": after},
            severity=AuditLog.Severity.NOTICE,
        )

    def perform_destroy(self, instance):
        if instance.is_system:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("System roles cannot be deleted.")
        super().perform_destroy(instance)


class PermissionViewSet(ReadOnlyAuditedViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    rbac = {"view": None}
    pagination_class = None


class DepartmentViewSet(AuditedModelViewSet):
    queryset = Department.objects.order_by("name")
    serializer_class = DepartmentSerializer
    audit_module = "accounts"
    rbac = {"view": None, "create": "users.manage", "edit": "users.manage", "delete": "users.manage"}
    pagination_class = None


class UserSessionViewSet(ReadOnlyAuditedViewSet):
    serializer_class = UserSessionSerializer
    audit_module = "accounts"
    rbac = {"view": "users.manage", "revoke": "users.manage"}
    filterset_fields = ["user", "is_revoked"]

    def get_queryset(self):
        qs = UserSession.objects.select_related("user", "user__department")
        if self.request.query_params.get("active") == "true":
            cutoff = timezone.now() - timedelta(minutes=15)
            qs = qs.filter(ended_at=None, is_revoked=False, last_activity__gte=cutoff)
        return qs

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        tracked = self.get_object()
        tracked.is_revoked = True
        tracked.revoked_by = request.user
        tracked.save(update_fields=["is_revoked", "revoked_by"])
        log_event(AuditLog.Action.ADMIN_ACTION, "accounts", obj=tracked.user, reason="Session revoked", severity=AuditLog.Severity.NOTICE)
        return Response({"detail": "Session revoked."})
