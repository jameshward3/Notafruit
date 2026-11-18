"""
Seed the RBAC catalog, default roles, departments, demo users, and (with
--demo-data) a realistic sample data set for evaluation environments.

All seeded users get the password from CLERKOS_SEED_PASSWORD (default
"ChangeMe!2026") with must_change_password=True.
"""
import os
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Department, Permission, Role, User
from apps.accounts.permissions_catalog import DEFAULT_ROLES, PERMISSIONS


class Command(BaseCommand):
    help = "Seed permissions, roles, departments, and demo users."

    def add_arguments(self, parser):
        parser.add_argument("--demo-data", action="store_true", help="Also create sample municipal records.")

    def handle(self, *args, **options):
        password = os.environ.get("CLERKOS_SEED_PASSWORD", "ChangeMe!2026")

        for code, label, module in PERMISSIONS:
            Permission.objects.update_or_create(code=code, defaults={"label": label, "module": module})
        self.stdout.write(f"Permissions: {Permission.objects.count()}")

        for name, codes in DEFAULT_ROLES.items():
            role, _ = Role.objects.update_or_create(name=name, defaults={"is_system": True})
            if codes == "*":
                role.permissions.set(Permission.objects.all())
            else:
                role.permissions.set(Permission.objects.filter(code__in=codes))
        self.stdout.write(f"Roles: {Role.objects.count()}")

        departments = {}
        for name, code in [
            ("Clerk's Office", "CLERK"), ("Administration", "ADMIN"), ("Legal", "LEGAL"),
            ("Finance", "FIN"), ("Public Works", "DPW"), ("Police", "PD"),
            ("Building & Zoning", "BLDG"), ("Health", "HLTH"),
        ]:
            departments[code], _ = Department.objects.get_or_create(name=name, defaults={"code": code})
        self.stdout.write(f"Departments: {Department.objects.count()}")

        def make_user(username, first, last, role_name, dept, title, superuser=False):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first, "last_name": last, "email": f"{username}@clerkos.local",
                    "department": departments.get(dept), "title": title,
                    "is_superuser": superuser, "is_staff": superuser,
                },
            )
            if created:
                user.set_password(password)
                user.must_change_password = True
                user.save()
            if role_name:
                user.roles.add(Role.objects.get(name=role_name))
            return user

        make_user("admin", "System", "Administrator", "Super Admin", "ADMIN", "IT Administrator", superuser=True)
        clerk = make_user("lmitchell", "Lauren", "Mitchell", "Municipal Clerk", "CLERK", "Municipal Clerk")
        make_user("dcarter", "Diane", "Carter", "Deputy Clerk", "CLERK", "Deputy Municipal Clerk")
        make_user("janderson", "James", "Anderson", "Clerk Staff", "CLERK", "Clerk Typist")
        make_user("mpatel", "Meera", "Patel", "Records Custodian", "CLERK", "Records Custodian")
        make_user("srivera", "Sofia", "Rivera", "Department Contributor", "DPW", "Administrative Assistant")
        make_user("tbrown", "Thomas", "Brown", "Department Head", "BLDG", "Construction Official")
        make_user("kwalsh", "Katherine", "Walsh", "Legal Counsel", "LEGAL", "Township Attorney")
        make_user("councilview", "Council", "Member", "Council Member View-Only", "ADMIN", "Council Member")
        make_user("auditor", "External", "Auditor", "Auditor View-Only", "ADMIN", "Auditor")
        self.stdout.write(f"Users: {User.objects.count()} (password: set via CLERKOS_SEED_PASSWORD)")

        if options["demo_data"]:
            self._demo_data(clerk, departments)
            self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _demo_data(self, clerk, departments):
        from apps.boards.models import Appointment, Board, BoardSeat
        from apps.compliance.models import BackupJob, ComplianceControl, RiskRegisterItem
        from apps.legislation.models import Ordinance, Resolution
        from apps.licensing.models import License
        from apps.meetings.models import AgendaItem, Meeting
        from apps.notices.models import PublicNotice
        from apps.opra.models import OPRAAssignment, OPRARequest
        from apps.records.models import Document, RecordCategory, RetentionRule
        from apps.workflow.models import Task

        today = timezone.localdate()

        rules = {}
        for code, name, years, permanent in [
            ("PERM", "Permanent Retention", None, True),
            ("Y7", "Seven Year Retention", 7, False),
            ("Y3", "Three Year Retention", 3, False),
        ]:
            rules[code], _ = RetentionRule.objects.get_or_create(
                code=code, defaults={"name": name, "retention_years": years, "permanent": permanent,
                                     "authority_citation": "NJ Division of Revenue and Enterprise Services Records Retention Schedule"},
            )

        categories = {}
        for name, classification, rule in [
            ("Ordinances", "public", "PERM"), ("Resolutions", "public", "PERM"),
            ("Meeting Agendas", "public", "PERM"), ("Meeting Minutes", "public", "PERM"),
            ("Meeting Packets", "internal", "Y7"), ("OPRA Requests", "internal", "Y7"),
            ("OPRA Responses", "internal", "Y7"), ("Public Notices", "public", "PERM"),
            ("Legal Advertisements", "public", "Y7"), ("Licenses", "internal", "Y7"),
            ("Boards and Appointments", "public", "Y7"), ("Correspondence", "internal", "Y3"),
            ("Election Records", "restricted", "PERM"), ("Contracts", "confidential", "PERM"),
            ("Policies", "internal", "PERM"), ("Archived Records", "internal", "PERM"),
        ]:
            categories[name], _ = RecordCategory.objects.get_or_create(
                name=name, defaults={"slug": name.lower().replace(" ", "-"),
                                     "default_classification": classification, "retention_rule": rules[rule]},
            )

        boards = {}
        for name, btype, seats in [
            ("Planning Board", "board", 9), ("Zoning Board of Adjustment", "board", 7),
            ("Environmental Commission", "commission", 5), ("Shade Tree Committee", "committee", 5),
        ]:
            board, created = Board.objects.get_or_create(
                name=name, defaults={"board_type": btype, "meeting_schedule": "Monthly, 7:00 PM"}
            )
            boards[name] = board
            if created:
                for i in range(1, seats + 1):
                    seat = BoardSeat.objects.create(board=board, seat_name=f"Seat {i}", term_length_years=3,
                                                    appointing_authority="Mayor with Council consent")
                    if i <= seats - 2:  # leave a couple of vacancies for the dashboard
                        Appointment.objects.create(
                            seat=seat, member_name=f"Member {i} {name.split()[0]}",
                            term_start=today - timedelta(days=365 * (i % 3)),
                            term_end=today + timedelta(days=90 * i),
                            status="active", appointed_by="Mayor", council_approval_date=today - timedelta(days=365),
                        )

        meetings = []
        for offset, title, status in [
            (-14, "Township Council Regular Meeting", "archived"),
            (5, "Township Council Regular Meeting", "agenda_open"),
            (12, "Planning Board Meeting", "scheduled"),
            (19, "Township Council Regular Meeting", "scheduled"),
            (26, "Zoning Board Meeting", "scheduled"),
        ]:
            meeting, _ = Meeting.objects.get_or_create(
                title=title, date=today + timedelta(days=offset),
                defaults={"meeting_type": "council" if "Council" in title else "board",
                          "location": "Council Chambers, Municipal Building", "status": status,
                          "agenda_deadline": today + timedelta(days=offset - 7), "created_by": clerk},
            )
            meetings.append(meeting)

        ord1, _ = Ordinance.objects.get_or_create(
            number="2026-14",
            defaults={"title": "Zoning Text Amendment — Downtown Mixed Use District", "sponsor": "Council President",
                      "department": departments["BLDG"], "status": "public_hearing",
                      "introduced_date": today - timedelta(days=21), "public_hearing_date": today + timedelta(days=5),
                      "legal_review": "approved", "related_meeting": meetings[1], "created_by": clerk},
        )
        Ordinance.objects.get_or_create(
            number="2026-15",
            defaults={"title": "Capital Improvement Bond Ordinance — Road Program", "sponsor": "Mayor",
                      "department": departments["FIN"], "status": "draft", "legal_review": "pending", "created_by": clerk},
        )
        Resolution.objects.get_or_create(
            number="R-2026-101",
            defaults={"title": "Authorizing Shared Services Agreement for Snow Removal",
                      "department": departments["DPW"], "status": "adopted",
                      "adoption_date": today - timedelta(days=14), "created_by": clerk, "consent_agenda": True},
        )
        Resolution.objects.get_or_create(
            number="R-2026-102",
            defaults={"title": "Award of Contract — Municipal Building HVAC Replacement",
                      "department": departments["ADMIN"], "status": "ready_for_agenda",
                      "legal_review": "approved", "created_by": clerk},
        )

        for i, (order, item_type, title) in enumerate([
            (1, "consent", "Approval of Minutes — Previous Regular Meeting"),
            (2, "ordinance", "Ordinance 2026-14 — Public Hearing and Second Reading"),
            (3, "resolution", "Resolution R-2026-102 — Award of Contract (HVAC)"),
            (4, "discussion", "Discussion: OPRA processing workload"),
        ]):
            AgendaItem.objects.get_or_create(
                meeting=meetings[1], order=order,
                defaults={"item_type": item_type, "title": title, "department": departments["CLERK"],
                          "submitted_by": clerk, "status": "approved" if i < 2 else "submitted"},
            )

        for i, (days_ago, desc, status) in enumerate([
            (2, "All correspondence between the Township Engineer and Acme Paving re: 2025 road program", "assigned"),
            (5, "Building permits issued for 100-200 Main Street, 2020-2024", "in_progress"),
            (9, "Police incident reports for the intersection of Oak Ave and 3rd St, 2024", "extension"),
            (1, "Township Council executive session minutes, January-March 2026", "received"),
            (30, "All invoices from XYZ Consulting 2023-2025", "fulfilled"),
        ], start=1):
            req, created = OPRARequest.objects.get_or_create(
                request_number=f"OPRA-2026-{i:03d}",
                defaults={"requestor_name": ["J. Doe", "Acme Title LLC", "M. Reporter", "Civic Watch NJ", "R. Smith"][i - 1],
                          "description": desc, "received_date": today - timedelta(days=days_ago),
                          "due_date": today - timedelta(days=days_ago) + timedelta(days=9),
                          "status": status, "custodian": clerk},
            )
            if created and status in ("assigned", "in_progress"):
                OPRAAssignment.objects.get_or_create(
                    request=req, department=departments["DPW" if i == 1 else "BLDG"],
                    defaults={"internal_due_date": req.due_date - timedelta(days=2)},
                )

        PublicNotice.objects.get_or_create(
            title="Notice of Public Hearing — Ordinance 2026-14",
            defaults={"category": "hearing", "newspaper": "The Star-Ledger",
                      "required_publication_date": today + timedelta(days=2),
                      "public_hearing_date": today + timedelta(days=5),
                      "status": "submitted", "related_ordinance": ord1, "created_by": clerk},
        )
        PublicNotice.objects.get_or_create(
            title="2026 Annual Meeting Schedule Notice",
            defaults={"category": "meeting", "newspaper": "The Record",
                      "required_publication_date": today - timedelta(days=30),
                      "publication_date": today - timedelta(days=32), "status": "proof_received", "created_by": clerk},
        )

        for i, (ltype, holder, days) in enumerate([
            ("Raffle License", "VFW Post 2294", 40), ("Peddler License", "Garden State Ice Cream LLC", 25),
            ("Dog License", "S. Johnson", 300), ("Taxi Owner License", "Riverview Taxi Co.", 55),
        ], start=1):
            License.objects.get_or_create(
                license_number=f"LIC-2026-{i:03d}",
                defaults={"license_type": ltype, "holder_name": holder, "status": "active",
                          "issued_date": today - timedelta(days=200), "expiration_date": today + timedelta(days=days),
                          "fee_amount": 25, "fee_paid": True},
            )

        for title, module, priority, days, dept in [
            ("Assemble packet for Council meeting", "meetings", "high", 3, "CLERK"),
            ("Respond to OPRA-2026-004 (executive session minutes)", "opra", "urgent", 1, "CLERK"),
            ("Publish proof of publication for hearing notice", "notices", "high", 2, "CLERK"),
            ("Review Planning Board alternate vacancy applications", "boards", "medium", 10, "CLERK"),
            ("Quarterly user access review", "compliance", "medium", 14, "ADMIN"),
        ]:
            Task.objects.get_or_create(
                title=title,
                defaults={"module": module, "priority": priority, "due_date": today + timedelta(days=days),
                          "department": departments[dept], "assigned_to": clerk, "created_by": clerk},
            )

        soc2 = [
            ("soc2_security", "CC6.1", "Logical access controls restrict access to authorized users"),
            ("soc2_security", "CC6.2", "User registration, authorization, and deprovisioning"),
            ("soc2_security", "CC6.3", "Role-based access and least privilege"),
            ("soc2_security", "CC7.2", "Security event monitoring and anomaly detection"),
            ("soc2_availability", "A1.2", "Backup and recovery capability"),
            ("soc2_availability", "A1.3", "Recovery plan testing"),
            ("soc2_confidentiality", "C1.1", "Confidential information identification and classification"),
            ("soc2_confidentiality", "C1.2", "Confidential information disposal"),
            ("iso27001", "A.5.15", "Access control policy"),
            ("iso27001", "A.8.13", "Information backup"),
            ("iso27001", "A.8.15", "Logging"),
            ("iso27001", "A.5.28", "Collection of evidence"),
        ]
        for framework, control_id, name in soc2:
            ComplianceControl.objects.get_or_create(
                framework=framework, control_id=control_id,
                defaults={"name": name, "status": "implemented" if control_id in ("CC6.1", "CC6.3", "A1.2", "A.8.15", "A.8.13") else "in_progress",
                          "owner": clerk, "last_reviewed": today - timedelta(days=30)},
            )

        RiskRegisterItem.objects.get_or_create(
            title="Single server hosts application and database",
            defaults={"category": "availability", "likelihood": 3, "impact": 4, "treatment": "mitigate",
                      "treatment_plan": "Nightly verified backups; documented 4-hour restore procedure; spare VM image.",
                      "owner": clerk, "status": "in_treatment"},
        )

        if not BackupJob.objects.exists():
            BackupJob.objects.create(job_type="full", status="success", completed_at=timezone.now(),
                                     size_bytes=734003200, location="/backups/clerkos-demo.dump", verified=True,
                                     verified_at=timezone.now())

        Document.objects.get_or_create(
            title="Ordinance 2026-14 — Adopted Text",
            defaults={"category": categories["Ordinances"], "department": departments["CLERK"], "owner": clerk,
                      "classification": "public", "status": "active", "retention_rule": rules["PERM"],
                      "permanent_archive": True, "tags": ["ordinance", "zoning"]},
        )
        Document.objects.get_or_create(
            title="Council Meeting Packet — Upcoming Regular Meeting",
            defaults={"category": categories["Meeting Packets"], "department": departments["CLERK"], "owner": clerk,
                      "classification": "internal", "status": "draft", "retention_rule": rules["Y7"],
                      "tags": ["packet", "council"]},
        )
