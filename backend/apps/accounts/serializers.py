from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Department, LoginEvent, Permission, Role, User, UserSession


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "label", "module"]


class RoleSerializer(serializers.ModelSerializer):
    permission_codes = serializers.SlugRelatedField(
        source="permissions", slug_field="code", queryset=Permission.objects.all(), many=True, required=False
    )
    user_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "description", "is_system", "permission_codes", "user_count"]


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source="head.get_full_name", read_only=True, default="")
    user_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "description", "head", "head_name", "is_active", "user_count"]


class UserSerializer(serializers.ModelSerializer):
    role_ids = serializers.PrimaryKeyRelatedField(source="roles", queryset=Role.objects.all(), many=True, required=False)
    role_names = serializers.SlugRelatedField(source="roles", slug_field="name", read_only=True, many=True)
    department_name = serializers.CharField(source="department.name", read_only=True, default="")
    is_locked = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", "title", "phone",
            "department", "department_name", "role_ids", "role_names",
            "is_active", "is_superuser", "is_locked", "must_change_password", "mfa_enabled",
            "failed_login_attempts", "locked_until", "temporary_access_expires",
            "last_login", "last_login_ip", "last_password_change", "date_joined",
        ]
        read_only_fields = [
            "is_superuser", "failed_login_attempts", "locked_until",
            "last_login", "last_login_ip", "last_password_change", "date_joined",
        ]


class UserCreateSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        roles = validated_data.pop("roles", [])
        user = User(**validated_data)
        user.set_password(password)
        user.must_change_password = True
        user.save()
        user.roles.set(roles)
        return user


class UserSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    department = serializers.CharField(source="user.department.name", read_only=True, default="")
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSession
        fields = [
            "id", "username", "full_name", "department", "ip_address", "user_agent",
            "created_at", "last_activity", "ended_at", "is_revoked", "is_active",
        ]


class LoginEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginEvent
        fields = ["id", "username_attempted", "success", "failure_reason", "ip_address", "user_agent", "created_at"]
