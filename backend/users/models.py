import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        TEACHER = "teacher", "Учитель"
        STUDENT = "student", "Ученик"
        PARENT = "parent", "Ota-ona"

    role = models.CharField(max_length=20, choices=Role.choices)

    telegram_id = models.BigIntegerField(null=True, blank=True, unique=True)
    telegram_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # Key of a preset avatar chosen on the frontend (no image uploads for kids).
    avatar = models.CharField(max_length=32, blank=True)

    # Optional, entered by the person on the profile page (3..100). Empty = not told.
    age = models.PositiveSmallIntegerField(null=True, blank=True)

    # The administrator knows the first password of an account he opened: the person must replace it at the first login.
    must_change_password = models.BooleanField(default=False)
    # Consent to the privacy policy (Law "On Personal Data"): which version was accepted and when.
    # For a child the consent is given by the parent / legal guardian.
    consent_version = models.CharField(max_length=20, blank=True)
    consent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_parent(self):
        return self.role == self.Role.PARENT

    @property
    def display_name(self):
        return self.get_full_name().strip() or self.username


class VerificationCode(models.Model):
    class CodeType(models.TextChoices):
        REGISTER = "register", "Регистрация"
        RESET_PASSWORD = "reset_password", "Сброс пароля"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_codes")
    code = models.CharField(max_length=6)
    code_type = models.CharField(max_length=20, choices=CodeType.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    # wrong guesses so far; the code is burned after VERIFICATION_MAX_ATTEMPTS
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=["user", "code_type", "is_used"])]


class BotHeartbeat(models.Model):
    """Written by the Telegram bot process every ~20 s; read by the website (different process / container)."""

    key = models.CharField(max_length=20, unique=True, default="telegram")
    ok = models.BooleanField(default=False)
    state = models.CharField(max_length=20, default="not_running")  # see users/telegram_bot/health.py
    detail = models.CharField(max_length=200, blank=True)           # technical message: logs/admin only, never sent to browsers
    username = models.CharField(max_length=64, blank=True)          # real @username of the bot (from Telegram getMe)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.state}"


class AuditLog(models.Model):
    """Security journal: who did what and when (sign-ins, password changes, consent, data export / erasure).
    Kept for AUDIT_RETENTION_DAYS, then removed by `manage.py purge_old_data`."""

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_entries")
    username = models.CharField(max_length=150, blank=True)    # what was typed, also for failed attempts
    action = models.CharField(max_length=40, db_index=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    detail = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.action} {self.username}"
