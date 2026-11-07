from django.core.management import call_command
from django.test import TestCase

from .models import User


class FirstAdminTests(TestCase):
    def test_ensure_admin_creates_superuser_once(self):
        call_command("ensure_admin", stdout=__import__("io").StringIO())
        u = User.objects.get(username="bosh_admin")
        self.assertTrue(u.is_superuser and u.is_staff and u.is_active)
        self.assertTrue(u.has_usable_password())
        call_command("ensure_admin", stdout=__import__("io").StringIO())
        self.assertEqual(User.objects.filter(is_superuser=True).count(), 1)

    def test_superuser_can_add_another_admin(self):
        call_command("ensure_admin", stdout=__import__("io").StringIO())
        self.client.force_login(User.objects.get(username="bosh_admin"))
        r = self.client.post("/admin/users/user/add/", {"username": "admin2", "password1": "Zq-93kd-LmN44!", "password2": "Zq-93kd-LmN44!",
                                                          "is_staff": "on", "is_superuser": "on", "first_name": "A", "last_name": "B", "usable_password": "true"})
        self.assertEqual(r.status_code, 302, getattr(r, "context", None) and r.context["adminform"].form.errors)
        self.assertTrue(User.objects.get(username="admin2").is_superuser)

    def test_staff_cannot_make_admins(self):
        s = User.objects.create(username="staff1", role="teacher", is_staff=True)
        from django.contrib.auth.models import Permission
        s.user_permissions.set(Permission.objects.filter(content_type__app_label="users", content_type__model="user"))
        self.client.force_login(s)
        self.client.post("/admin/users/user/add/", {"username": "x1", "password1": "Zq-93kd-LmN44!", "password2": "Zq-93kd-LmN44!",
                                                      "is_superuser": "on", "is_staff": "on", "role": "teacher", "usable_password": "true"})
        x = User.objects.filter(username="x1").first()
        self.assertTrue(x is None or not (x.is_superuser or x.is_staff))
