from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.api import AuditedModelViewSet

from .models import Appointment, Board, BoardSeat


class AppointmentSerializer(serializers.ModelSerializer):
    seat_name = serializers.CharField(source="seat.seat_name", read_only=True)
    board_name = serializers.CharField(source="seat.board.name", read_only=True)
    days_until_expiration = serializers.IntegerField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "seat", "seat_name", "board_name", "member_name", "member_email", "appointed_by",
            "term_start", "term_end", "status", "council_approval_date", "application_document",
            "notes", "days_until_expiration", "created_at",
        ]


class BoardSeatSerializer(serializers.ModelSerializer):
    board_name = serializers.CharField(source="board.name", read_only=True)
    is_vacant = serializers.BooleanField(read_only=True)
    current_appointment = AppointmentSerializer(read_only=True)

    class Meta:
        model = BoardSeat
        fields = [
            "id", "board", "board_name", "seat_name", "term_length_years", "appointing_authority",
            "qualifications", "is_vacant", "current_appointment",
        ]


class BoardSerializer(serializers.ModelSerializer):
    seat_count = serializers.IntegerField(source="seats.count", read_only=True)
    vacancy_count = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            "id", "name", "board_type", "description", "meeting_schedule", "enabling_authority",
            "is_active", "seat_count", "vacancy_count",
        ]

    def get_vacancy_count(self, obj) -> int:
        return sum(1 for seat in obj.seats.all() if seat.is_vacant)


class BoardViewSet(AuditedModelViewSet):
    queryset = Board.objects.prefetch_related("seats__appointments")
    serializer_class = BoardSerializer
    audit_module = "boards"
    rbac = {
        "view": "records.view", "create": "boards.manage", "edit": "boards.manage", "delete": "boards.manage",
        "directory": "public.export", "terms_timeline": "records.view",
    }
    search_fields = ["name", "description"]
    filterset_fields = ["board_type", "is_active"]

    @action(detail=False, methods=["get"])
    def terms_timeline(self, request):
        """Gantt data: every seat with its active term span and vacancy state."""
        rows = []
        for board in self.get_queryset().filter(is_active=True):
            for seat in board.seats.all():
                current = seat.current_appointment
                rows.append({
                    "board": board.name,
                    "seat": seat.seat_name,
                    "vacant": current is None,
                    "member": current.member_name if current else None,
                    "term_start": current.term_start if current else None,
                    "term_end": current.term_end if current else None,
                    "expiring_soon": bool(current and current.days_until_expiration <= 90),
                })
        return Response(rows)

    @action(detail=False, methods=["get"])
    def directory(self, request):
        """Public board directory export (only public-safe fields)."""
        data = []
        for board in self.get_queryset().filter(is_active=True):
            members = []
            for seat in board.seats.all():
                current = seat.current_appointment
                if current:
                    members.append({"seat": seat.seat_name, "member": current.member_name, "term_end": current.term_end})
                else:
                    members.append({"seat": seat.seat_name, "member": None, "vacant": True})
            data.append({"board": board.name, "type": board.board_type, "schedule": board.meeting_schedule, "members": members})
        return Response(data)


class BoardSeatViewSet(AuditedModelViewSet):
    queryset = BoardSeat.objects.select_related("board").prefetch_related("appointments")
    serializer_class = BoardSeatSerializer
    audit_module = "boards"
    rbac = {"view": "records.view", "create": "boards.manage", "edit": "boards.manage", "delete": "boards.manage"}
    filterset_fields = ["board"]


class AppointmentViewSet(AuditedModelViewSet):
    queryset = Appointment.objects.select_related("seat__board")
    serializer_class = AppointmentSerializer
    audit_module = "boards"
    rbac = {
        "view": "records.view", "create": "boards.manage", "edit": "boards.manage", "delete": "boards.manage",
        "expiring": "records.view",
    }
    filterset_fields = ["seat", "status", "seat__board"]
    search_fields = ["member_name", "appointed_by"]
    ordering_fields = ["term_end", "term_start"]

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        days = int(request.query_params.get("days", 90))
        horizon = timezone.localdate() + timedelta(days=days)
        qs = self.get_queryset().filter(status=Appointment.Status.ACTIVE, term_end__lte=horizon).order_by("term_end")
        return Response(AppointmentSerializer(qs, many=True).data)
