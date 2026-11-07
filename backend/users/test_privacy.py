import tempfile
from io import StringIO
from pathlib import Path

from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from chat.models import Conversation, Message
from games.models import Attempt, Game
from school.models import Classroom, Enrollment, FamilyCode, MoodEntry, ParentLink

from .models import AuditLog, User

PW = "Str0ng!pass9"


def mk(username, role, **kw):
    return User.objects.create_user(username, password=PW, role=role, is_active=True, first_name=username.title(), **kw)


def client_for(user, real_token=False):
    c = APIClient()
    if real_token:   # a real login token: this is the path where the consent gate lives
        from rest_framework_simplejwt.tokens import RefreshToken
        c.credentials(HTTP_AUTHORIZATION="Bearer " + str(RefreshToken.for_user(user).access_token))
    else:
        c.force_authenticate(user)
    return c


@override_settings(CONSENT_ENFORCED=True)
class ConsentAndPasswordGateTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_api_is_closed_until_consent_is_given(self):
        kid = mk("bola", "student")
        c = client_for(kid, True)
        r = c.get("/api/v1/me/classes/")
        self.assertEqual((r.status_code, r.data["code"]), (403, "consent_required"))
        me = c.get("/api/v1/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.data["needs_consent"])
        self.assertEqual(c.post("/api/v1/me/consent/", {"accept": False}, format="json").status_code, 400)
        self.assertEqual(c.post("/api/v1/me/consent/", {"accept": True, "version": "old"}, format="json").status_code, 409)
        r = c.post("/api/v1/me/consent/", {"accept": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["needs_consent"])
        self.assertEqual(c.get("/api/v1/me/classes/").status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="consent_given", user=kid).exists())

    def test_new_policy_version_asks_again(self):
        kid = mk("bola", "student", consent_version="2020-01", consent_at=timezone.now())
        self.assertEqual(client_for(kid, True).get("/api/v1/me/classes/").status_code, 403)

    def test_admin_given_password_must_be_replaced_first(self):
        u = mk("ota", "parent", must_change_password=True, consent_version="2026-11")
        with override_settings(CONSENT_VERSION="2026-11"):
            c = client_for(u, True)
            r = c.get("/api/v1/parent/children/")
            self.assertEqual((r.status_code, r.data["code"]), (403, "password_change_required"))
            self.assertEqual(c.post("/api/v1/me/change-password/", {"current_password": PW, "new_password": PW}, format="json").status_code, 400)
            self.assertEqual(c.post("/api/v1/me/change-password/", {"current_password": PW, "new_password": "Yangi!parol-77x"}, format="json").status_code, 200)
            u.refresh_from_db()
            self.assertFalse(u.must_change_password)
            self.assertEqual(client_for(u, True).get("/api/v1/parent/children/").status_code, 200)


class PrivacyRightsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.teacher, self.parent, self.kid = mk("ustoz", "teacher"), mk("ota", "parent"), mk("bola", "student")
        self.cls = Classroom.objects.create(teacher=self.teacher, name="1-A")
        Enrollment.objects.create(classroom=self.cls, student=self.kid)
        ParentLink.objects.create(parent=self.parent, student=self.kid)
        MoodEntry.objects.create(student=self.kid, day=timezone.localdate(), mood="xursand")
        conv = Conversation.objects.create(teacher=self.teacher, parent=self.parent)
        Message.objects.create(conversation=conv, sender=self.parent, text="Salom")

    def test_export_contains_my_data_only(self):
        r = client_for(self.kid).get("/api/v1/me/export/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("attachment", r["Content-Disposition"])
        d = r.json()
        self.assertEqual(d["account"]["username"], "bola")
        self.assertEqual(d["moods"][0]["mood"], "xursand")
        self.assertEqual(d["chat_messages"], [])
        chat = client_for(self.parent).get("/api/v1/me/export/").json()["chat_messages"]
        self.assertEqual([m["text"] for m in chat], ["Salom"])

    def test_parent_can_export_and_erase_own_child_only(self):
        other = mk("boshqa", "student")
        c = client_for(self.parent)
        self.assertEqual(c.get(f"/api/v1/parent/children/{self.kid.id}/export/").status_code, 200)
        self.assertEqual(c.get(f"/api/v1/parent/children/{other.id}/export/").status_code, 404)
        self.assertEqual(c.post(f"/api/v1/parent/children/{self.kid.id}/erase/", {"password": "wrong"}, format="json").status_code, 400)
        self.assertEqual(c.post(f"/api/v1/parent/children/{other.id}/erase/", {"password": PW}, format="json").status_code, 404)
        r = c.post(f"/api/v1/parent/children/{self.kid.id}/erase/", {"password": PW}, format="json")
        self.assertEqual((r.status_code, r.data["result"]), (200, "deleted"))
        self.assertFalse(User.objects.filter(pk=self.kid.pk).exists())
        self.assertFalse(MoodEntry.objects.exists())
        self.assertTrue(User.objects.filter(pk=other.pk).exists())

    def test_child_cannot_erase_itself_but_parent_can(self):
        self.assertEqual(client_for(self.kid).post("/api/v1/me/delete/", {"password": PW}, format="json").status_code, 403)
        c = client_for(self.parent)
        self.assertEqual(c.post("/api/v1/me/delete/", {"password": "wrong"}, format="json").status_code, 400)
        self.assertEqual(c.post("/api/v1/me/delete/", {"password": PW}, format="json").data["result"], "deleted")
        self.assertFalse(Conversation.objects.exists())

    def test_teacher_whose_games_were_played_is_anonymised_not_deleted(self):
        g = Game.objects.create(owner=self.teacher, title="G", game_type="quiz", status="published")
        Attempt.objects.create(user=self.kid, game=g)
        r = client_for(self.teacher).post("/api/v1/me/delete/", {"password": PW}, format="json")
        self.assertEqual(r.data["result"], "anonymised")
        self.teacher.refresh_from_db()
        self.assertEqual((self.teacher.first_name, self.teacher.is_active, self.teacher.username), ("", False, f"deleted-{self.teacher.id}"))
        self.assertFalse(self.teacher.has_usable_password())
        g.refresh_from_db()
        self.assertEqual(g.status, "archived")
        self.assertTrue(Attempt.objects.filter(user=self.kid).exists())


class SecurityHeadersAndJournalTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_headers(self):
        r = self.client.get("/api/v1/config/")
        self.assertIn("default-src 'self'", r["Content-Security-Policy"])
        self.assertIn("frame-ancestors 'none'", r["Content-Security-Policy"])
        self.assertIn("camera=(self)", r["Permissions-Policy"])
        self.assertEqual(r["X-Content-Type-Options"], "nosniff")
        self.assertEqual(r["Cross-Origin-Opener-Policy"], "same-origin")
        u = mk("bola", "student")
        self.assertEqual(client_for(u).get("/api/v1/me/")["Cache-Control"], "no-store")

    def test_login_journal(self):
        mk("bola", "student")
        c = APIClient()
        c.post("/api/v1/login/", {"username": "bola", "password": "xato"}, format="json")
        c.post("/api/v1/login/", {"username": "bola", "password": PW}, format="json")
        self.assertEqual(list(AuditLog.objects.order_by("id").values_list("action", flat=True)), ["login_failed", "login"])

    def test_fake_forwarded_header_does_not_dodge_the_rate_limit(self):
        mk("bola", "student")
        codes = []
        for i in range(14):
            codes.append(APIClient().post("/api/v1/login/", {"username": "bola", "password": "x"}, format="json", HTTP_X_FORWARDED_FOR=f"10.0.0.{i}").status_code)
        self.assertIn(429, codes)

    def test_admin_login_is_throttled(self):
        for _ in range(10):
            self.client.post("/admin/login/", {"username": "x", "password": "y"})
        self.assertEqual(self.client.post("/admin/login/", {"username": "x", "password": "y"}).status_code, 429)

    def test_public_config_has_legal_info(self):
        d = self.client.get("/api/v1/config/").json()
        self.assertIn("consent_version", d)
        self.assertIn("operator", d["legal"])
        self.assertTrue(d["age_label"])


class RetentionAndTTSTests(APITestCase):
    def test_purge_old_data(self):
        t, p = mk("ustoz", "teacher"), mk("ota", "parent")
        conv = Conversation.objects.create(teacher=t, parent=p)
        old = Message.objects.create(conversation=conv, sender=p, text="eski")
        Message.objects.filter(pk=old.pk).update(created_at=timezone.now() - timezone.timedelta(days=400))
        Message.objects.create(conversation=conv, sender=p, text="yangi")
        a = AuditLog.objects.create(action="login")
        AuditLog.objects.filter(pk=a.pk).update(created_at=timezone.now() - timezone.timedelta(days=400))
        call_command("purge_old_data", stdout=StringIO())
        self.assertEqual(list(Message.objects.values_list("text", flat=True)), ["yangi"])
        self.assertFalse(AuditLog.objects.filter(pk=a.pk).exists())

    def test_tts_speaks_only_the_apps_own_sentences(self):
        d = tempfile.mkdtemp()
        f = Path(d) / "phrases.txt"
        f.write_text("# x\nBarakalla!\n", encoding="utf-8")
        c = client_for(mk("bola", "student"))
        with override_settings(TTS_PHRASES_FILE=f, TTS_ALLOWLIST_ONLY=True):
            r = c.post("/api/v1/tts/", {"text": "Salom, Aziz Karimov!"}, format="json")
            self.assertEqual((r.status_code, r.data["code"]), (403, "tts_not_allowed"))
            from voice import services
            self.assertTrue(services.is_allowed("Barakalla!"))
            self.assertFalse(services.is_allowed("Aziz Karimov"))
        with override_settings(TTS_PHRASES_FILE=Path(d) / "missing.txt", TTS_ALLOWLIST_ONLY=True):
            from voice import services
            self.assertFalse(services.is_allowed("Barakalla!"))   # no list = nothing leaves the country
