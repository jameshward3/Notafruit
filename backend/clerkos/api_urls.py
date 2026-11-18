"""Single versioned API surface: /api/v1/..."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views as accounts_views
from apps.audit import views as audit_views
from apps.boards import views as boards_views
from apps.compliance import views as compliance_views
from apps.core import views as core_views
from apps.legislation import views as legislation_views
from apps.licensing import views as licensing_views
from apps.meetings import views as meetings_views
from apps.notices import views as notices_views
from apps.opra import views as opra_views
from apps.records import views as records_views
from apps.workflow import views as workflow_views

router = DefaultRouter()
# Accounts / admin
router.register("users", accounts_views.UserViewSet, basename="user")
router.register("roles", accounts_views.RoleViewSet, basename="role")
router.register("permissions", accounts_views.PermissionViewSet, basename="permission")
router.register("departments", accounts_views.DepartmentViewSet, basename="department")
router.register("sessions", accounts_views.UserSessionViewSet, basename="session")
# Records vault
router.register("documents", records_views.DocumentViewSet, basename="document")
router.register("record-categories", records_views.RecordCategoryViewSet, basename="recordcategory")
router.register("retention-rules", records_views.RetentionRuleViewSet, basename="retentionrule")
router.register("legal-holds", records_views.LegalHoldViewSet, basename="legalhold")
# Meetings
router.register("meetings", meetings_views.MeetingViewSet, basename="meeting")
router.register("agenda-items", meetings_views.AgendaItemViewSet, basename="agendaitem")
router.register("votes", meetings_views.VoteViewSet, basename="vote")
router.register("minutes", meetings_views.MinutesViewSet, basename="minutes")
# Legislation
router.register("ordinances", legislation_views.OrdinanceViewSet, basename="ordinance")
router.register("resolutions", legislation_views.ResolutionViewSet, basename="resolution")
# OPRA
router.register("opra-requests", opra_views.OPRARequestViewSet, basename="oprarequest")
router.register("opra-assignments", opra_views.OPRAAssignmentViewSet, basename="opraassignment")
router.register("opra-responses", opra_views.OPRAResponseViewSet, basename="opraresponse")
# Notices / licenses / boards
router.register("public-notices", notices_views.PublicNoticeViewSet, basename="publicnotice")
router.register("licenses", licensing_views.LicenseViewSet, basename="license")
router.register("license-applications", licensing_views.LicenseApplicationViewSet, basename="licenseapplication")
router.register("boards", boards_views.BoardViewSet, basename="board")
router.register("board-seats", boards_views.BoardSeatViewSet, basename="boardseat")
router.register("appointments", boards_views.AppointmentViewSet, basename="appointment")
# Workflow
router.register("tasks", workflow_views.TaskViewSet, basename="task")
router.register("notifications", workflow_views.NotificationViewSet, basename="notification")
router.register("correspondence", workflow_views.CorrespondenceViewSet, basename="correspondence")
# Compliance
router.register("compliance-controls", compliance_views.ComplianceControlViewSet, basename="compliancecontrol")
router.register("compliance-evidence", compliance_views.ComplianceEvidenceViewSet, basename="complianceevidence")
router.register("risk-register", compliance_views.RiskRegisterItemViewSet, basename="riskregisteritem")
router.register("backup-jobs", compliance_views.BackupJobViewSet, basename="backupjob")
# Audit
router.register("audit-logs", audit_views.AuditLogViewSet, basename="auditlog")
# System settings
router.register("system-settings", core_views.SystemSettingViewSet, basename="systemsetting")

urlpatterns = [
    path("auth/csrf/", accounts_views.csrf_token_view),
    path("auth/login/", accounts_views.login_view),
    path("auth/logout/", accounts_views.logout_view),
    path("auth/me/", accounts_views.me_view),
    path("auth/change-password/", accounts_views.change_password_view),
    path("dashboard/", core_views.dashboard_view),
    path("search/", core_views.global_search_view),
    path("system/health/", core_views.health_view),
    path("", include(router.urls)),
]
