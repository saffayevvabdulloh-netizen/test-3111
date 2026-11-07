"""Verification-code logic shared by the API and the Telegram bot."""
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import BotHeartbeat, User, VerificationCode


def _heartbeat():
    return BotHeartbeat.objects.filter(key="telegram").first()


def _age_seconds(hb):
    return (timezone.now() - hb.updated_at).total_seconds() if hb else None


def record_bot_heartbeat(ok, state, detail="", username=""):
    """Called by the bot process (sync; wrap with sync_to_async)."""
    defaults = {"ok": bool(ok), "state": state, "detail": (detail or "")[:200]}
    if username:
        defaults["username"] = username[:64]
    BotHeartbeat.objects.update_or_create(key="telegram", defaults=defaults)


def bot_username() -> str:
    """The bot's REAL @username (asked from Telegram by the bot itself) beats the .env guess:
    a wrong TELEGRAM_BOT_USERNAME made the 'open the bot' link lead to some other bot."""
    hb = _heartbeat()
    if hb and hb.ok and hb.username and _age_seconds(hb) <= settings.BOT_HEARTBEAT_STALE_SECONDS:
        return hb.username
    return settings.TELEGRAM_BOT_USERNAME


def bot_status() -> dict:
    """Public, non-sensitive status of the Telegram bot for the website."""
    hb, age = _heartbeat(), None
    age = _age_seconds(hb)
    fresh = hb is not None and age <= settings.BOT_HEARTBEAT_STALE_SECONDS
    if not settings.REQUIRE_TELEGRAM_VERIFICATION:
        state = "disabled"
    elif fresh and hb.ok:
        state = "ok"
    elif not settings.TELEGRAM_BOT_TOKEN:
        state = "no_token"
    elif not fresh:
        state = "not_running"
    else:
        state = hb.state if hb.state != "ok" else "error"
    return {
        "required": settings.REQUIRE_TELEGRAM_VERIFICATION,
        "state": state,
        "connected": state == "ok",
        "bot_username": bot_username(),
        "age_seconds": int(age) if age is not None else None,
    }


def telegram_link_for(user) -> str:
    return f"https://t.me/{bot_username()}?start={user.telegram_token}"


def issue_code(user, code_type) -> str:
    """Create a fresh 6-digit code; older unused codes of that type die."""
    VerificationCode.objects.filter(user=user, code_type=code_type, is_used=False).update(is_used=True)
    code = f"{secrets.randbelow(900000) + 100000}"
    VerificationCode.objects.create(
        user=user,
        code=code,
        code_type=code_type,
        expires_at=timezone.now() + timedelta(minutes=settings.VERIFICATION_CODE_TTL_MINUTES),
    )
    return code


def check_code(user, code_type, raw_code) -> bool:
    """Validate and consume a code. Wrong guesses are counted and persisted."""
    with transaction.atomic():
        vc = (
            VerificationCode.objects.select_for_update()
            .filter(user=user, code_type=code_type, is_used=False, expires_at__gt=timezone.now())
            .order_by("-created_at")
            .first()
        )
        if vc is None:
            return False
        if secrets.compare_digest(vc.code, str(raw_code)):
            vc.is_used = True
            vc.save(update_fields=["is_used"])
            return True
        vc.attempts += 1
        if vc.attempts >= settings.VERIFICATION_MAX_ATTEMPTS:
            vc.is_used = True  # burned: a new code must be requested
        vc.save(update_fields=["attempts", "is_used"])
        return False


# ---- used by the bot -------------------------------------------------------
TELEGRAM_OK = "ok"
TELEGRAM_INVALID = "invalid"
TELEGRAM_ALREADY_VERIFIED = "already_verified"
TELEGRAM_TAKEN = "telegram_taken"


def link_telegram_and_issue_code(raw_token: str, telegram_id: int):
    """Returns (status, code|None)."""
    try:
        token = uuid.UUID(str(raw_token).strip())
    except ValueError:
        return TELEGRAM_INVALID, None

    with transaction.atomic():
        user = User.objects.select_for_update().filter(telegram_token=token).first()
        if user is None:
            return TELEGRAM_INVALID, None
        if user.is_active and user.telegram_id:
            return TELEGRAM_ALREADY_VERIFIED, None
        if User.objects.filter(telegram_id=telegram_id).exclude(pk=user.pk).exists():
            return TELEGRAM_TAKEN, None
        user.telegram_id = telegram_id
        user.save(update_fields=["telegram_id"])
        return TELEGRAM_OK, issue_code(user, VerificationCode.CodeType.REGISTER)


def issue_reset_code_for_telegram(telegram_id: int):
    user = User.objects.filter(telegram_id=telegram_id, is_active=True).first()
    if user is None:
        return None
    return issue_code(user, VerificationCode.CodeType.RESET_PASSWORD)


def find_user(username, **filters):
    """Login names are case-insensitive: exact match first, then `iexact` ("Ali" == "ali")."""
    qs = User.objects.filter(**filters)
    username = (username or "").strip()
    return qs.filter(username=username).first() or qs.filter(username__iexact=username).order_by("pk").first()
