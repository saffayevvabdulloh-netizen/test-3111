from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Per-IP limit for credential / code endpoints (applies to everyone)."""

    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginIPThrottle(SimpleRateThrottle):
    """Generous per-IP cap on logins (a classroom shares one IP)."""

    scope = "login_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginUserThrottle(SimpleRateThrottle):
    """Strict cap per account name (+IP): stops password guessing without locking out the rest of the class."""

    scope = "login_user"

    def get_cache_key(self, request, view):
        data = request.data if hasattr(request, "data") else {}
        name = str(data.get("username", "") if hasattr(data, "get") else "").strip().lower()[:150]
        return self.cache_format % {"scope": self.scope, "ident": f"{name}|{self.get_ident(request)}"}


class RegisterRateThrottle(SimpleRateThrottle):
    """Per-IP limit for sign-ups. Higher than `auth`: many children may sign up from one school/clinic IP."""

    scope = "register"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class StatusRateThrottle(SimpleRateThrottle):
    """The sign-up page polls the bot status every few seconds: generous, per IP."""

    scope = "status"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class JoinRateThrottle(SimpleRateThrottle):
    """Slows down brute-forcing of classroom join codes (per user)."""

    scope = "join"

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class TTSRateThrottle(SimpleRateThrottle):
    """Every spoken sentence costs money: limit text-to-speech per user (per IP if anonymous)."""

    scope = "tts"

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class ChatRateThrottle(SimpleRateThrottle):
    """Sending chat messages: per user."""

    scope = "chat"

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
