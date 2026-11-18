from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="departments_headed"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Permission(models.Model):
    """RBAC permission catalog entry (see permissions_catalog.py)."""

    code = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=120)
    module = models.CharField(max_length=40)

    class Meta:
        ordering = ["module", "code"]

    def __str__(self):
        return self.code


class Role(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False, help_text="System roles cannot be deleted.")
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="users")
    roles = models.ManyToManyField(Role, blank=True, related_name="users")
    title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)

    must_change_password = models.BooleanField(default=False)
    last_password_change = models.DateTimeField(null=True, blank=True)

    # MFA readiness: fields exist so TOTP can be enabled without a migration.
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=64, blank=True)

    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    temporary_access_expires = models.DateTimeField(
        null=True, blank=True, help_text="If set, the account stops authenticating after this time."
    )
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    def permission_codes(self) -> set[str]:
        if self.is_superuser:
            from .permissions_catalog import ALL_CODES

            return set(ALL_CODES)
        return set(Permission.objects.filter(roles__users=self).values_list("code", flat=True))

    def has_permission_code(self, code: str) -> bool:
        if self.is_superuser:
            return True
        return Permission.objects.filter(code=code, roles__users=self).exists()

    @property
    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > timezone.now())

    @property
    def access_expired(self) -> bool:
        return bool(self.temporary_access_expires and self.temporary_access_expires < timezone.now())


class UserSession(models.Model):
    """Tracks each browser session for the active-user list and admin revocation."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tracked_sessions")
    session_key = models.CharField(max_length=64, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_revoked = models.BooleanField(default=False)
    revoked_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="sessions_revoked"
    )

    class Meta:
        ordering = ["-last_activity"]

    @property
    def is_active(self) -> bool:
        return self.ended_at is None and not self.is_revoked


class LoginEvent(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="login_events")
    username_attempted = models.CharField(max_length=150)
    success = models.BooleanField()
    failure_reason = models.CharField(max_length=120, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
