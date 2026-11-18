"""
Smoke tests: authentication + lockout, RBAC enforcement, audit chain
integrity, record locking, and the dashboard endpoint.
"""
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditLog


class SeededTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed", verbosity=0)

    def login(self, username, password="ChangeMe!2026"):
        client = APIClient()
        response = client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")
        return client, response


class AuthTests(SeededTestCase):
    def test_login_success_creates_session_and_audit(self):
        client, response = self.login("lmitchell")
        self.assertEqual(response.status_code, 200)
        self.assertIn("opra.manage", response.data["permissions"])
        self.assertTrue(AuditLog.objects.filter(action="login", actor_username="lmitchell").exists())

    def test_bad_password_recorded_and_lockout_after_threshold(self):
        for _ in range(5):
            _, response = self.login("janderson", "wrong-password")
        self.assertEqual(response.status_code, 401)
        user = User.objects.get(username="janderson")
        self.assertTrue(user.is_locked)
        # Correct password is now rejected while locked.
        _, response = self.login("janderson")
        self.assertEqual(response.status_code, 401)
        self.assertTrue(AuditLog.objects.filter(action="security", severity="critical").exists())

    def test_me_requires_auth(self):
        self.assertEqual(APIClient().get("/api/v1/auth/me/").status_code, 403)


class RBACTests(SeededTestCase):
    def test_view_only_role_cannot_create_ordinance(self):
        client, _ = self.login("councilview")
        response = client.post("/api/v1/ordinances/", {"number": "X-1", "title": "Test"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_clerk_can_create_ordinance(self):
        client, _ = self.login("lmitchell")
        response = client.post("/api/v1/ordinances/", {"number": "2026-99", "title": "Test Ordinance"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditLog.objects.filter(action="create", module="legislation", object_repr__contains="2026-99").exists())

    def test_non_admin_cannot_list_users(self):
        client, _ = self.login("srivera")
        self.assertEqual(client.get("/api/v1/users/").status_code, 403)

    def test_auditor_can_read_logs_but_not_records_edit(self):
        client, _ = self.login("auditor")
        self.assertEqual(client.get("/api/v1/audit-logs/").status_code, 200)
        response = client.post("/api/v1/documents/", {"title": "x"}, format="json")
        self.assertEqual(response.status_code, 403)


class AuditChainTests(SeededTestCase):
    def test_chain_verifies_and_detects_tampering(self):
        client, _ = self.login("lmitchell")
        client.post("/api/v1/resolutions/", {"number": "R-T-1", "title": "Chain test"}, format="json")
        response = client.get("/api/v1/audit-logs/verify/")
        self.assertTrue(response.data["intact"])

        # Tamper with an entry mid-chain and verify detection.
        entry = AuditLog.objects.order_by("id").first()
        AuditLog.objects.filter(pk=entry.pk).update(action="delete")
        response = client.get("/api/v1/audit-logs/verify/")
        self.assertFalse(response.data["intact"])


class LockingTests(SeededTestCase):
    def test_lock_blocks_other_editor_and_admin_can_override(self):
        clerk, _ = self.login("lmitchell")
        response = clerk.post("/api/v1/ordinances/", {"number": "2026-50", "title": "Lock test"}, format="json")
        ordinance_id = response.data["id"]

        deputy, _ = self.login("dcarter")
        self.assertEqual(deputy.post(f"/api/v1/ordinances/{ordinance_id}/lock/").status_code, 200)

        # Clerk cannot edit while deputy holds the lock…
        response = clerk.patch(f"/api/v1/ordinances/{ordinance_id}/", {"title": "Changed"}, format="json")
        self.assertEqual(response.status_code, 423)
        # …but holds locks.override, so may take the lock over.
        response = clerk.post(f"/api/v1/ordinances/{ordinance_id}/lock/", {"override": True}, format="json")
        self.assertEqual(response.status_code, 200)
        response = clerk.patch(f"/api/v1/ordinances/{ordinance_id}/", {"title": "Changed"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="lock_override").exists())


class DashboardTests(SeededTestCase):
    def test_dashboard_payload(self):
        client, _ = self.login("lmitchell")
        response = client.get("/api/v1/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("metrics", response.data)
        self.assertIn("open_opra_requests", response.data["metrics"])

    def test_health_is_public(self):
        response = APIClient().get("/api/v1/system/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["database"], "up")
