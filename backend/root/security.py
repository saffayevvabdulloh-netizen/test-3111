"""Security headers and brute-force protection for the Django admin."""
import time

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse

# Content-Security-Policy: only our own files may run / load. Even if somebody managed to inject HTML (XSS) the browser
# would refuse to run foreign scripts or to send data to other sites.
CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",       # React sets style="" attributes
    "img-src 'self' data: blob:",
    "media-src 'self' blob: data:",           # recorded voice clips + generated speech
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])
# camera: pulse widget (only when the child presses the button); microphone: speech games. Everything else is off.
PERMISSIONS = "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()"


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        resp = self.get_response(request)
        resp.setdefault("Content-Security-Policy", CSP)
        resp.setdefault("Permissions-Policy", PERMISSIONS)
        resp.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        resp.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        resp.setdefault("X-Content-Type-Options", "nosniff")
        if request.path.startswith("/api/") and "Cache-Control" not in resp:
            resp["Cache-Control"] = "no-store"          # personal data must never sit in a shared / browser cache
        return resp


class AdminLoginThrottleMiddleware:
    """Django's admin login has no brute-force protection: allow 10 failed tries per IP per 15 minutes."""

    LIMIT, WINDOW = 10, 15 * 60

    def __init__(self, get_response):
        self.get_response = get_response

    def _ip(self, request):
        from users.audit import client_ip
        return client_ip(request) or "?"

    def __call__(self, request):
        login_path = "/" + settings.ADMIN_URL + "login/"
        if request.method == "POST" and request.path == login_path:
            key = f"adminfail:{self._ip(request)}"
            if cache.get(key, 0) >= self.LIMIT:
                return HttpResponse("Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.", status=429, content_type="text/plain; charset=utf-8")
            resp = self.get_response(request)
            if resp.status_code == 200:            # the form is shown again = wrong password (success redirects with 302)
                try:
                    cache.add(key, 0, self.WINDOW)
                    cache.incr(key)
                except ValueError:
                    cache.set(key, 1, self.WINDOW)
                from users.audit import record
                record(request, "admin_login_failed", username=request.POST.get("username", ""))
            else:
                cache.delete(key)
            return resp
        return self.get_response(request)
