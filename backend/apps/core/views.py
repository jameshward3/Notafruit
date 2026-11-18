from datetime import timedelta

from django.db import connection
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import LoginEvent, UserSession
from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.boards.models import Appointment, BoardSeat
from apps.compliance.models import BackupJob, ComplianceControl
from apps.core.api import AuditedModelViewSet
from apps.legislation.models import Ordinance, Resolution
from apps.licensing.models import License
from apps.meetings.models import AgendaItem, Meeting
from apps.notices.models import PublicNotice
from apps.opra.models import OPRARequest
from apps.records.models import Document
from apps.workflow.models import Task

from .models import SystemSetting


@api_view(["GET"])
@permission_classes([AllowAny])
def health_view(request):
    """Liveness/readiness for Nginx, monitoring, and the System Health page."""
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False
    last_backup = BackupJob.objects.filter(status=BackupJob.Status.SUCCESS).first()
    return Response({
        "status": "ok" if db_ok else "degraded",
        "database": "up" if db_ok else "down",
        "time": timezone.now(),
        "last_successful_backup": last_backup.completed_at if last_backup else None,
        "version": "0.1.0",
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """Every number on the Command Center dashboard in one round trip."""
    today = timezone.localdate()
    now = timezone.now()
    active_cutoff = now - timedelta(minutes=15)

    open_opra = OPRARequest.objects.filter(status__in=OPRARequest.OPEN_STATUSES)
    opra_overdue = sum(1 for r in open_opra if r.effective_due_date < today)
    opra_due_soon = sum(1 for r in open_opra if 0 <= (r.effective_due_date - today).days <= 2)

    controls = ComplianceControl.objects.aggregate(
        total=Count("id"),
        implemented=Count("id", filter=Q(status=ComplianceControl.Status.IMPLEMENTED)),
        not_applicable=Count("id", filter=Q(status=ComplianceControl.Status.NOT_APPLICABLE)),
    )
    applicable = controls["total"] - controls["not_applicable"]
    compliance_score = round(100 * controls["implemented"] / applicable) if applicable else None

    last_backup = BackupJob.objects.exclude(status=BackupJob.Status.RUNNING).first()

    vacancies = sum(1 for seat in BoardSeat.objects.prefetch_related("appointments") if seat.is_vacant)

    work_queue = list(
        Task.objects.filter(status__in=["open", "in_progress", "blocked"])
        .values("department__name")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    upcoming_meetings = [
        {"id": m.pk, "title": m.title, "date": m.date, "start_time": m.start_time, "status": m.status,
         "meeting_type": m.meeting_type}
        for m in Meeting.objects.filter(date__gte=today).exclude(status="cancelled").order_by("date")[:8]
    ]

    recent_audit = [
        {"id": e.pk, "created_at": e.created_at, "actor": e.actor_username or "system", "action": e.action,
         "module": e.module, "object_repr": e.object_repr, "success": e.success, "severity": e.severity}
        for e in AuditLog.objects.all()[:12]
    ]

    active_sessions = (
        UserSession.objects.filter(ended_at=None, is_revoked=False, last_activity__gte=active_cutoff)
        .select_related("user")
    )

    return Response({
        "metrics": {
            "active_users": active_sessions.values("user").distinct().count(),
            "open_opra_requests": open_opra.count(),
            "opra_overdue": opra_overdue,
            "opra_due_soon": opra_due_soon,
            "upcoming_meetings": Meeting.objects.filter(date__gte=today).exclude(status="cancelled").count(),
            "packets_pending": AgendaItem.objects.filter(status__in=["submitted", "department_review", "legal_review"]).count(),
            "active_ordinances": Ordinance.objects.exclude(status__in=["archived", "failed", "withdrawn"]).count(),
            "active_resolutions": Resolution.objects.exclude(status__in=["archived", "failed", "withdrawn"]).count(),
            "notices_awaiting_proof": PublicNotice.objects.filter(status__in=["submitted", "published"]).count(),
            "license_renewals_due": License.objects.filter(
                status="active", expiration_date__lte=today + timedelta(days=60), expiration_date__gte=today
            ).count(),
            "board_vacancies": vacancies,
            "retention_review": Document.objects.filter(status="retention_review").count(),
            "failed_logins_24h": LoginEvent.objects.filter(success=False, created_at__gte=now - timedelta(hours=24)).count(),
            "compliance_score": compliance_score,
        },
        "backup": {
            "status": last_backup.status if last_backup else "never_run",
            "completed_at": last_backup.completed_at if last_backup else None,
            "verified": last_backup.verified if last_backup else False,
        },
        "active_users": [
            {"username": s.user.username, "full_name": s.user.get_full_name() or s.user.username,
             "department": s.user.department.name if s.user.department_id else "", "since": s.created_at,
             "last_activity": s.last_activity}
            for s in active_sessions[:25]
        ],
        "upcoming_meetings": upcoming_meetings,
        "work_queue_by_department": work_queue,
        "recent_audit_events": recent_audit,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_search_view(request):
    """Quick search across the major record types for the top bar."""
    q = (request.query_params.get("q") or "").strip()
    if len(q) < 2:
        return Response({"query": q, "results": []})
    if not request.user.has_permission_code("records.view"):
        return Response({"query": q, "results": []})

    results = []

    def add(qs, kind, route, label_fn):
        for obj in qs[:5]:
            results.append({"type": kind, "id": obj.pk, "label": label_fn(obj), "route": f"{route}/{obj.pk}"})

    add(Document.objects.filter(Q(title__icontains=q) | Q(description__icontains=q)), "document", "/records", lambda o: o.title)
    add(Meeting.objects.filter(title__icontains=q), "meeting", "/meetings", lambda o: f"{o.title} ({o.date})")
    add(Ordinance.objects.filter(Q(number__icontains=q) | Q(title__icontains=q)), "ordinance", "/ordinances", lambda o: f"{o.number}: {o.title[:60]}")
    add(Resolution.objects.filter(Q(number__icontains=q) | Q(title__icontains=q)), "resolution", "/resolutions", lambda o: f"{o.number}: {o.title[:60]}")
    add(OPRARequest.objects.filter(Q(request_number__icontains=q) | Q(requestor_name__icontains=q) | Q(description__icontains=q)), "opra", "/opra", lambda o: f"{o.request_number} — {o.requestor_name}")
    add(PublicNotice.objects.filter(title__icontains=q), "notice", "/notices", lambda o: o.title)
    add(License.objects.filter(Q(license_number__icontains=q) | Q(holder_name__icontains=q)), "license", "/licenses", lambda o: f"{o.license_number} — {o.holder_name}")

    return Response({"query": q, "results": results})


class SystemSettingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.get_full_name", read_only=True, default="")

    class Meta:
        model = SystemSetting
        fields = ["id", "key", "value", "description", "updated_by", "updated_by_name", "updated_at"]
        read_only_fields = ["updated_by"]


class SystemSettingViewSet(AuditedModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    audit_module = "core"
    rbac = {"view": "system.configure", "create": "system.configure", "edit": "system.configure", "delete": "system.configure"}
    pagination_class = None

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        log_event(AuditLog.Action.ADMIN_ACTION, "core", obj=serializer.instance,
                  reason="System setting changed", after={"key": serializer.instance.key, "value": serializer.instance.value},
                  severity=AuditLog.Severity.NOTICE)
