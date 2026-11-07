"""Data retention (Law "On Personal Data": data is destroyed when its purpose is achieved).

Run it every day (cron / scheduler):   python manage.py purge_old_data
Periods are set in .env: CHAT_RETENTION_DAYS, AUDIT_RETENTION_DAYS, MOOD_RETENTION_DAYS.
"""
from datetime import timedelta

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import Message
from school.models import MoodEntry
from users.models import AuditLog, VerificationCode


class Command(BaseCommand):
    help = "Delete data older than the retention periods (chat, security journal, moods, expired codes and tokens)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, dry_run, **opts):
        now, r = timezone.now(), settings.RETENTION
        jobs = [
            ("chat messages", Message.objects.filter(created_at__lt=now - timedelta(days=r["chat_days"]))),
            ("security journal", AuditLog.objects.filter(created_at__lt=now - timedelta(days=r["audit_days"]))),
            ("mood entries", MoodEntry.objects.filter(day__lt=(now - timedelta(days=r["mood_days"])).date())),
            ("verification codes", VerificationCode.objects.filter(expires_at__lt=now - timedelta(days=1))),
        ]
        for name, qs in jobs:
            n = qs.count()
            if not dry_run:
                qs.delete()
            self.stdout.write(f"{name}: {n} {'would be ' if dry_run else ''}deleted")
        if not dry_run:
            call_command("flushexpiredtokens")   # expired login tokens
