import sys
from datetime import timedelta
from pathlib import Path

import os

import environ

from .envfile import load_env_file

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173", "http://localhost:3000"]),
    CSRF_TRUSTED_ORIGINS=(list, []),
    REQUIRE_TELEGRAM_VERIFICATION=(bool, True),
    RUN_TELEGRAM_BOT=(bool, True),
)
load_env_file(BASE_DIR / ".env")

# --- Core -------------------------------------------------------------------
DEBUG = env("DEBUG")
# No hard-coded fallback: a missing key must fail loudly in production.
SECRET_KEY = env("SECRET_KEY", default="dev-only-insecure-key" if DEBUG else None)
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set. Put it in backend/.env")

ALLOWED_HOSTS = env("ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "corsheaders",
    "drf_spectacular",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    # project apps
    "users",
    "school",
    "games",
    "voice",
    "chat",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # serves the built frontend + collected static files
    "django.middleware.gzip.GZipMiddleware",        # after WhiteNoise: compresses API JSON only (static is pre-compressed)
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "root.security.SecurityHeadersMiddleware",
    "root.security.AdminLoginThrottleMiddleware",
]

ROOT_URLCONF = "root.urls"
APPEND_SLASH = False   # API URLs are explicit; a missing /file.ext must be a real 404, not a redirect to HTML

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "root.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Database ---------------------------------------------------------------
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}
# Reuse DB connections instead of reconnecting on every request (PostgreSQL); health-checked so a dropped one is replaced.
DATABASES["default"].setdefault("CONN_MAX_AGE", env.int("DB_CONN_MAX_AGE", default=60))
DATABASES["default"].setdefault("CONN_HEALTH_CHECKS", True)
if DATABASES["default"]["ENGINE"].endswith("sqlite3"):
    # SQLite: wait for a lock instead of failing with "database is locked" when several workers write (chat, progress)
    DATABASES["default"].setdefault("OPTIONS", {}).update({"timeout": 20, "transaction_mode": "IMMEDIATE", "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"})

AUTH_USER_MODEL = "users.User"
# scrypt (memory-hard, OWASP-approved settings) verifies in ~0.2 s instead of ~0.7 s for PBKDF2: logins feel instant when a whole
# class signs in at once. Old PBKDF2 hashes keep working and are upgraded to scrypt automatically at the person's next login.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.ScryptPasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n -------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

# --- Static / media ---------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
try:
    STATIC_ROOT.mkdir(exist_ok=True)   # WhiteNoise warns if it is missing before the first collectstatic
except OSError:
    pass
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# --- Single-server mode: Django also serves the built React app --------------
# `cd frontend && npm run build` -> frontend/dist  (override with FRONTEND_DIST)
FRONTEND_DIST = Path(env("FRONTEND_DIST", default=str(BASE_DIR.parent / "frontend" / "dist")))
WHITENOISE_ROOT = FRONTEND_DIST if (FRONTEND_DIST / "index.html").exists() else None
WHITENOISE_MIMETYPES = {".webmanifest": "application/manifest+json"}  # installable app (PWA)
WHITENOISE_INDEX_FILE = False  # "/" and deep links are answered by root.spa (no-cache index.html)
# Vite fingerprints everything in /assets/ -> cache it "forever"
WHITENOISE_IMMUTABLE_FILE_TEST = lambda path, url: url.startswith("/assets/")  # noqa: E731
# Uploaded images. Fine for a single small server; for real scale serve /media from nginx/S3 instead.
SERVE_MEDIA = env.bool("SERVE_MEDIA", default=True)

# Upload limits used by games/lessons image endpoints
MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

# --- CORS -------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

# --- Telegram ---------------------------------------------------------------
TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_BOT_USERNAME = env("TELEGRAM_BOT_USERNAME", default="TG_CODE_Verification_bot")
RUN_TELEGRAM_BOT = env("RUN_TELEGRAM_BOT")
# If Telegram is blocked/unreachable from this computer: http://host:port (or socks5://... with aiohttp_socks installed)
TELEGRAM_PROXY = env("TELEGRAM_PROXY", default="")
# the website calls the bot "connected" only while its heartbeat is younger than this
BOT_HEARTBEAT_STALE_SECONDS = env.int("BOT_HEARTBEAT_STALE_SECONDS", default=90)
REQUIRE_TELEGRAM_VERIFICATION = env("REQUIRE_TELEGRAM_VERIFICATION")
# Sign-up is CLOSED by default: children, parents and teachers get accounts from the administrator
# (Django admin /admin/ or `manage.py import_users`) and only log in. Set ALLOW_REGISTRATION=True to reopen it.
ALLOW_REGISTRATION = env.bool("ALLOW_REGISTRATION", default=False)

# --- Legal (Uzbekistan: Law "On Personal Data" ZRU-547, Law "On protection of children from harmful information") ----
# Shown on /privacy and /terms and in the consent window. Fill these in .env with the real operator's details.
CONSENT_VERSION = env("CONSENT_VERSION", default="2026-11")       # change it when the policy text changes: everybody accepts again
CONSENT_ENFORCED = env.bool("CONSENT_ENFORCED", default=True)     # without accepted consent the API (except /me/ etc.) is closed
LEGAL = {
    "operator": env("LEGAL_OPERATOR", default=""),         # full legal name (and STIR / PINFL)
    "tin": env("LEGAL_TIN", default=""),
    "address": env("LEGAL_ADDRESS", default=""),
    "email": env("LEGAL_EMAIL", default=""),
    "phone": env("LEGAL_PHONE", default=""),
    "data_location": env("LEGAL_DATA_LOCATION", default=""),   # e.g. "Toshkent shahri, <data-markaz nomi>"
    "register_number": env("LEGAL_REGISTER_NUMBER", default=""),  # certificate no. of the State Register of personal data databases
}
AGE_LABEL = env("AGE_LABEL", default="0+")                   # age sign for the content (0+, 7+, 12+, 16+, 18+)
RETENTION = {
    "chat_days": env.int("CHAT_RETENTION_DAYS", default=365),
    "audit_days": env.int("AUDIT_RETENTION_DAYS", default=365),
    "mood_days": env.int("MOOD_RETENTION_DAYS", default=730),
}
ADMIN_URL = env("ADMIN_URL", default="admin/")             # move the admin login to a secret address in production: ADMIN_URL=boshqaruv-x7k2/
if not ADMIN_URL.endswith("/"):
    ADMIN_URL += "/"
# Local dev convenience: without a bot token nobody could ever receive a code, so accounts would
# stay inactive forever. When DEBUG is on, no token is set and the flag was not set explicitly,
# skip the Telegram step (production / explicit settings are untouched; tests are unaffected).
if (
    REQUIRE_TELEGRAM_VERIFICATION
    and DEBUG
    and not TELEGRAM_BOT_TOKEN
    and "REQUIRE_TELEGRAM_VERIFICATION" not in os.environ
    and "test" not in sys.argv
):
    REQUIRE_TELEGRAM_VERIFICATION = False
    print("[settings] DEBUG without TELEGRAM_BOT_TOKEN: Telegram verification is OFF for local development.")
VERIFICATION_CODE_TTL_MINUTES = 5
VERIFICATION_MAX_ATTEMPTS = 5

# --- Text-to-speech (ElevenLabs) --------------------------------------------
# The key is read from the environment / backend/.env ONLY. It is never sent to the browser:
# the React app calls our own POST /api/v1/tts/ and the server talks to ElevenLabs.
# Which voice speaks first: "edge" (Microsoft Madina, real Uzbek, free, no key) or "elevenlabs" (Adam, needs a key).
TTS_PROVIDER = env("TTS_PROVIDER", default="edge")
EDGE_TTS_VOICE = env("EDGE_TTS_VOICE", default="uz-UZ-MadinaNeural")
EDGE_TTS_RATE = env("EDGE_TTS_RATE", default="-10%")      # a little slower = clearer for children
EDGE_TTS_PITCH = env("EDGE_TTS_PITCH", default="+2Hz")
ELEVENLABS_API_KEY = env("ELEVENLABS_API_KEY", default="")
ELEVENLABS_BASE_URL = env("ELEVENLABS_BASE_URL", default="https://api.elevenlabs.io/v1/text-to-speech")
ELEVENLABS_VOICE_ID = env("ELEVENLABS_VOICE_ID", default="pNInz6obpgDQGcFmaJgB")   # Adam
ELEVENLABS_MODEL_ID = env("ELEVENLABS_MODEL_ID", default="eleven_multilingual_v2")
ELEVENLABS_OUTPUT_FORMAT = env("ELEVENLABS_OUTPUT_FORMAT", default="mp3_44100_128")
ELEVENLABS_TIMEOUT = env.int("ELEVENLABS_TIMEOUT", default=30)
TTS_ALLOWLIST_ONLY = env.bool("TTS_ALLOWLIST_ONLY", default=True)   # privacy: speak only the app's own fixed sentences
TTS_PHRASES_FILE = Path(env("TTS_PHRASES_FILE", default=str(FRONTEND_DIST / "audio" / "phrases.txt")))
TTS_MAX_CHARS = env.int("TTS_MAX_CHARS", default=500)          # per request: protects the bill
TTS_CACHE_DIR = Path(env("TTS_CACHE_DIR", default=str(BASE_DIR / "tts_cache")))

# --- API --------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.ConsentJWTAuthentication",
    ),
    # Secure by default; public endpoints opt out explicitly.
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated", "users.permissions.HasConsent"),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # How many reverse proxies stand in front of the app (0 = none). With 0 the X-Forwarded-For header is IGNORED, so nobody
    # can dodge the rate limits by sending a fake header. Behind nginx / a platform proxy set NUM_PROXIES=1 in .env.
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("THROTTLE_AUTH", default="20/min"),
        # login: a whole class often shares ONE school IP, so the per-IP limit is roomy and the strict one is per account
        "login_ip": env("THROTTLE_LOGIN_IP", default="300/min"),
        "login_user": env("THROTTLE_LOGIN_USER", default="10/min"),
        "register": env("THROTTLE_REGISTER", default="120/hour"),
        "status": env("THROTTLE_STATUS", default="120/min"),
        "join": env("THROTTLE_JOIN", default="30/hour"),
        "tts": env("THROTTLE_TTS", default="40/min"),
        "chat": env("THROTTLE_CHAT", default="60/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=20),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ROTATE_REFRESH_TOKENS": False,  # avoids multi-tab refresh races in SPAs
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Bolajon AI API",
    "DESCRIPTION": "Autizmli bolalar uchun ijtimoiy va muloqot ko'nikmalarini rivojlantiruvchi platforma",
    "VERSION": "1.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {"PublishStatusEnum": "games.models.Status"},
}

# --- Cache (rate limits live here) -------------------------------------------
# One process: in-memory is fine. Several gunicorn workers / servers: set REDIS_URL so limits and caches are shared.
if env("REDIS_URL", default=""):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": env("REDIS_URL")}}
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "bolajon"}}

# --- Production hardening (only when DEBUG is off) --------------------------
# Set SECURE_COOKIES=False only when you run DEBUG=False over plain http (e.g. local test).
SECURE_COOKIES = env.bool("SECURE_COOKIES", default=not DEBUG)
if SECURE_COOKIES:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
# Behind HTTPS (nginx / a platform proxy) turn these on in .env: HTTPS_ONLY=True, HSTS_SECONDS=31536000
if env.bool("HTTPS_ONLY", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = env.int("HSTS_SECONDS", default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Fast password hashing ONLY while running the test-suite.
if "test" in sys.argv:
    CONSENT_ENFORCED = False   # tests that cover consent switch it on with override_settings
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
