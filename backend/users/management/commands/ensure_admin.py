"""Creates the first administrator if the site has none. Safe to run on every start.

Login/password come from ADMIN_USERNAME / ADMIN_PASSWORD (.env). Without ADMIN_PASSWORD the built-in starting password hash is used
(the owner has the password; change it after the first login)."""
import os

from django.core.management.base import BaseCommand

from users.models import User


# First-start administrator. Only a HASH of the starting password is stored here (the owner received the password
# separately). ADMIN_USERNAME / ADMIN_PASSWORD in .env override it. CHANGE THE PASSWORD after the first login.
DEFAULT_USERNAME = "bosh_admin"
DEFAULT_PASSWORD_HASH = "scrypt$16384$JTBfOEmpzYvlandIK7UnVu$8$5$WjI3DqWQsaxyjyIbXV6l1J65/WZN08dgwEhfcfYX/PmpRxVtl4Go5v3ffLAmkm3/PpBfDnl5eF3ak7xjcbPyPA=="


class Command(BaseCommand):
    help = "Create the first admin account when no superuser exists."

    def handle(self, *args, **opts):
        if User.objects.filter(is_superuser=True).exists():
            return
        name = os.environ.get("ADMIN_USERNAME", "admin").strip() or "admin"
        pw = os.environ.get("ADMIN_PASSWORD", "").strip()
        if not os.environ.get("ADMIN_USERNAME"):
            name = DEFAULT_USERNAME
        u = User.objects.filter(username=name).first() or User(username=name)
        u.is_staff = u.is_superuser = u.is_active = True
        u.role = u.role or User.Role.TEACHER
        if pw:
            u.set_password(pw)
        else:
            u.password = DEFAULT_PASSWORD_HASH
        u.save()
        line = "=" * 60
        self.stdout.write(f"\n{line}\n  ADMIN HISOBI YARATILDI\n  login : {name}\n  parol : (sizga alohida berilgan; .env da ADMIN_PASSWORD bo'lsa — o'sha)\n"
                          f"  kirish: /{os.environ.get('ADMIN_URL', 'admin/')}\n  Parolni kirgach darhol almashtiring.\n{line}\n")
