"""Open many accounts at once from a CSV file (the administrator's tool; nobody can sign up on the site).

CSV header (UTF-8, comma separated), only `role` and `first_name` are required:

    role,first_name,last_name,username,password,child,class_code
    student,Ali,Valiyev,,,,ABC123
    parent,Karim,Valiyev,,,ali.valiyev,

* role        student | parent | teacher
* username    empty -> made from the name (ali.valiyev, ali.valiyev2 ...)
* password    empty -> a random 8-character one is generated
* child       (parents) username of the child to link. It may be a child created earlier in the same file
* class_code  (students) join code of an existing class to enrol the child in

Usage:  python manage.py import_users people.csv [--out accounts.csv]
The output CSV lists every login + password: hand it to the families, then delete it.
"""
import csv
import re
import unicodedata

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from school.models import Classroom, Enrollment, ParentLink
from users.admin import make_password
from users.models import User

ROLES = {"student", "parent", "teacher"}
TRANSLIT = str.maketrans({"ʻ": "", "ʼ": "", "'": "", "’": "", "‘": "", "`": "", "ʻ": ""})


def slug(text):
    t = unicodedata.normalize("NFKD", text.translate(TRANSLIT)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", ".", t).strip(".")


def free_username(base):
    base = (base or "user")[:140]
    name, i = base, 1
    while len(name) < 3 or User.objects.filter(username__iexact=name).exists():
        i += 1
        name = f"{base}{i}"
    return name


class Command(BaseCommand):
    help = "Create student / parent / teacher accounts from a CSV file (see module docstring)."

    def add_arguments(self, parser):
        parser.add_argument("csv_file")
        parser.add_argument("--out", default="accounts_created.csv", help="where to write logins + passwords")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, csv_file, out, dry_run, **opts):
        try:
            with open(csv_file, newline="", encoding="utf-8-sig") as fh:
                rows = list(csv.DictReader(fh))
        except OSError as e:
            raise CommandError(str(e))
        if not rows:
            raise CommandError("The file has no rows.")
        results, errors = [], []
        try:
            with transaction.atomic():
                for n, row in enumerate(rows, start=2):
                    row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
                    try:
                        results.append(self.make(row))
                    except (ValueError, ValidationError) as e:
                        errors.append(f"line {n}: {getattr(e, 'messages', [str(e)])[0]}")
                if errors:
                    raise ValueError("rollback")
                if dry_run:
                    raise ValueError("dry-run")
        except ValueError as e:
            if str(e) not in ("rollback", "dry-run"):
                raise
            if errors:
                raise CommandError("Nothing was created:\n  " + "\n  ".join(errors))
            self.stdout.write(self.style.WARNING(f"Dry run OK: {len(results)} accounts would be created."))
            return
        with open(out, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(["role", "first_name", "last_name", "username", "password"])
            w.writerows(results)
        self.stdout.write(self.style.SUCCESS(f"Created {len(results)} accounts. Logins and passwords: {out}"))

    def make(self, row):
        role = row.get("role", "").lower()
        if role not in ROLES:
            raise ValueError(f"role must be one of {sorted(ROLES)}, got '{role}'")
        first, last = row.get("first_name", ""), row.get("last_name", "")
        if not first:
            raise ValueError("first_name is required")
        username = (row.get("username") or "").lower()
        if username:
            if len(username) < 3 or User.objects.filter(username__iexact=username).exists():
                raise ValueError(f"username '{username}' is too short or already taken")
        else:
            username = free_username(slug(f"{first} {last}"))
        password = row.get("password") or make_password()
        probe = User(username=username, first_name=first, last_name=last)
        validate_password(password, user=probe)
        user = User.objects.create_user(username, password=password, role=role, first_name=first, last_name=last, is_active=True, must_change_password=True)
        if role == "parent" and row.get("child"):
            child = User.objects.filter(username__iexact=row["child"], role="student").first()
            if child is None:
                raise ValueError(f"child '{row['child']}' not found (list the child before the parent)")
            ParentLink.objects.get_or_create(parent=user, student=child)
        if role == "student" and row.get("class_code"):
            cls = Classroom.objects.filter(join_code=row["class_code"].upper()).first()
            if cls is None:
                raise ValueError(f"class code '{row['class_code']}' not found")
            Enrollment.objects.get_or_create(classroom=cls, student=user)
        return [role, first, last, username, password]
