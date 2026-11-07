from rest_framework_simplejwt.authentication import JWTAuthentication


def check_consent(user, view):
    """Raise 403 unless the person accepted the current privacy policy and replaced an administrator-chosen password.
    Views that must work before that set `consent_exempt = True`."""
    from django.conf import settings
    from rest_framework.exceptions import PermissionDenied

    if not settings.CONSENT_ENFORCED or getattr(view, "consent_exempt", False):
        return
    if user.must_change_password:
        raise PermissionDenied({"error": "Avval parolni almashtiring.", "code": "password_change_required"})
    if user.consent_version != settings.CONSENT_VERSION:
        raise PermissionDenied({"error": "Davom etish uchun maxfiylik siyosatiga rozilik bering.", "code": "consent_required"})


class ConsentJWTAuthentication(JWTAuthentication):
    """Same as the normal token login, plus the consent / password gate for EVERY endpoint
    (also those that define their own permission classes)."""

    def authenticate(self, request):
        res = super().authenticate(request)
        if res is not None:
            check_consent(res[0], (getattr(request, "parser_context", None) or {}).get("view"))
        return res
