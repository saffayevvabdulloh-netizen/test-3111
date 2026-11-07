from django.contrib.auth.hashers import identify_hasher, make_password
from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = (
        "One-off repair: the old RegisterSerializer stored passwords as plain text. "
        "Hash any password that is not already a valid Django hash."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        fixed = []
        for user in User.objects.all():
            enc = user.password or ""
            if not enc or enc.startswith("!"):  # empty / unusable
                continue
            try:
                identify_hasher(enc)
            except ValueError:
                fixed.append(user.username)
                if not opts["dry_run"]:
                    user.password = make_password(enc)
                    user.save(update_fields=["password"])
        verb = "would fix" if opts["dry_run"] else "fixed"
        self.stdout.write(f"{verb} {len(fixed)} account(s): {', '.join(fixed) or '-'}")
