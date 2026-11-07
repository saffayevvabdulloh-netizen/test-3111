import csv
import os
import tempfile

from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from school.models import Classroom, Enrollment, ParentLink

from .models import User

PW = "Str0ng!pass9"


class ClosedRegistrationTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_signup_is_closed_by_default(self):
        r = APIClient().post("/api/v1/register/", {"username": "yangi", "password": PW, "role": "student"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["code"], "registration_closed")
        self.assertFalse(User.objects.filter(username="yangi").exists())

    def test_public_config(self):
        self.assertFalse(APIClient().get("/api/v1/config/").data["registration_open"])
        with override_settings(ALLOW_REGISTRATION=True):
            self.assertTrue(APIClient().get("/api/v1/config/").data["registration_open"])

    def test_admin_made_account_can_log_in_and_disabled_cannot(self):
        u = User.objects.create_user("bola1", password=PW, role="student", is_active=True)
        c = APIClient()
        self.assertEqual(c.post("/api/v1/login/", {"username": "bola1", "password": PW}, format="json").status_code, 200)
        u.is_active = False
        u.save()
        r = c.post("/api/v1/login/", {"username": "bola1", "password": PW}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["code"], "account_disabled")
        self.assertNotIn("telegram_link", r.data)

    def test_a_class_can_log_in_from_one_ip_but_guessing_one_account_is_blocked(self):
        for i in range(15):
            User.objects.create_user(f"kid{i}", password=PW, role="student", is_active=True)
        c = APIClient()
        for i in range(15):   # more than the old 20/min-per-IP wall would allow together with retries
            self.assertEqual(c.post("/api/v1/login/", {"username": f"kid{i}", "password": PW}, format="json").status_code, 200, i)
        codes = [c.post("/api/v1/login/", {"username": "kid0", "password": "wrong-pass"}, format="json").status_code for _ in range(14)]
        self.assertIn(429, codes)
        # other children are unaffected
        self.assertEqual(c.post("/api/v1/login/", {"username": "kid1", "password": PW}, format="json").status_code, 200)


class ImportUsersTests(APITestCase):
    def run_import(self, text, **kw):
        d = tempfile.mkdtemp()
        src, out = os.path.join(d, "in.csv"), os.path.join(d, "out.csv")
        with open(src, "w", encoding="utf-8") as fh:
            fh.write(text)
        call_command("import_users", src, out=out, **kw)
        with open(out, encoding="utf-8-sig") as fh:
            return list(csv.DictReader(fh))

    def test_creates_children_parents_links_and_enrols(self):
        teacher = User.objects.create_user("ustoz", password=PW, role="teacher", is_active=True)
        cls = Classroom.objects.create(teacher=teacher, name="1-A")
        rows = self.run_import(
            "role,first_name,last_name,username,password,child,class_code\n"
            f"student,Ali,O'ktamov,,,,{cls.join_code}\n"
            "parent,Karim,O'ktamov,,,ali.oktamov,\n"
            "student,Ali,O'ktamov,,,,\n"
        )
        self.assertEqual([r["username"] for r in rows], ["ali.oktamov", "karim.oktamov", "ali.oktamov2"])
        kid, parent = User.objects.get(username="ali.oktamov"), User.objects.get(username="karim.oktamov")
        self.assertTrue(kid.is_active and parent.is_active)
        self.assertTrue(ParentLink.objects.filter(parent=parent, student=kid).exists())
        self.assertTrue(Enrollment.objects.filter(classroom=cls, student=kid).exists())
        self.assertTrue(APIClient().post("/api/v1/login/", {"username": rows[0]["username"], "password": rows[0]["password"]}, format="json").status_code == 200)

    def test_bad_row_rolls_everything_back(self):
        with self.assertRaises(CommandError):
            self.run_import("role,first_name\nstudent,Ali\nrobot,Vali\n")
        self.assertEqual(User.objects.count(), 0)

    def test_dry_run_creates_nothing(self):
        d = tempfile.mkdtemp()
        src = os.path.join(d, "in.csv")
        open(src, "w").write("role,first_name\nstudent,Ali\n")
        call_command("import_users", src, "--dry-run", out=os.path.join(d, "o.csv"))
        self.assertEqual(User.objects.count(), 0)


class AdminSiteTests(APITestCase):
    def test_admin_can_create_a_child_account(self):
        admin = User.objects.create_superuser("boss", password=PW)
        self.client.force_login(admin)
        r = self.client.post("/admin/users/user/add/", {
            "role": "student", "first_name": "Ali", "last_name": "V", "username": "ali.v",
            "usable_password": "true", "password1": PW, "password2": PW,
        })
        self.assertEqual(r.status_code, 302, getattr(r, "context", None) and r.context["adminform"].form.errors)
        u = User.objects.get(username="ali.v")
        self.assertEqual((u.role, u.is_active), ("student", True))
        self.assertEqual(self.client.get(f"/admin/users/user/{u.id}/change/").status_code, 200)
        self.assertEqual(self.client.get("/admin/users/user/?q=ali").status_code, 200)

    def test_new_password_action(self):
        admin = User.objects.create_superuser("boss", password=PW)
        u = User.objects.create_user("bola", password=PW, role="student", is_active=True)
        self.client.force_login(admin)
        r = self.client.post("/admin/users/user/", {"action": "new_passwords", "_selected_action": [u.id]}, follow=True)
        self.assertEqual(r.status_code, 200)
        u.refresh_from_db()
        self.assertFalse(u.check_password(PW))
