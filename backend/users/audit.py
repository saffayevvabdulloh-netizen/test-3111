"""Writes the security journal. Never raises: logging must not break a request."""
import logging

from .models import AuditLog

log = logging.getLogger("security")


def client_ip(request):
    # behind a proxy the first X-Forwarded-For hop is the visitor (set only by trusted proxy / platform)
    from django.conf import settings

    n = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if n and xff:
        hops = [h.strip() for h in xff.split(",")]
        return hops[-n] if len(hops) >= n else hops[0]
    return request.META.get("REMOTE_ADDR") or None


def record(request, action, user=None, username="", detail=""):
    try:
        ip = client_ip(request) if request is not None else None
        AuditLog.objects.create(user=user if getattr(user, "pk", None) else None, username=(username or getattr(user, "username", ""))[:150],
                                action=action, ip=ip, detail=str(detail)[:200])
        log.info("%s user=%s ip=%s %s", action, username or getattr(user, "username", ""), ip, detail)
    except Exception:  # noqa: BLE001
        log.exception("audit log failed")
