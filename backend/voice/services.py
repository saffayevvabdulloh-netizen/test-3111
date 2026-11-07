"""Text-to-speech on the server (the browser never sees any key).

Providers: "edge" = Microsoft Madina, real Uzbek, free, no key (default);
           "elevenlabs" = Adam, needs ELEVENLABS_API_KEY. If the main one fails the other is tried.

    synthesize("Salom!")  ->  mp3 bytes

Endpoint : https://api.elevenlabs.io/v1/text-to-speech/<voice_id>
Voice    : Adam (pNInz6obpgDQGcFmaJgB), model eleven_multilingual_v2  (defaults live in settings.py)

Repeated texts are served from a small disk cache, so the same sentence is paid for only once.
"""
import asyncio
import hashlib
import json
import logging
import os
import socket
import urllib.error
import urllib.request

from django.conf import settings

log = logging.getLogger(__name__)

# Voice settings sent with every request (stability / similarity / style / speaker boost).
VOICE_SETTINGS = {
    "stability": 0.65,
    "similarity_boost": 0.80,
    "style": 0.20,
    "use_speaker_boost": True,
}


class TTSError(Exception):
    """A failure we can explain to the user. `code` is machine-readable, `message` is Uzbek."""

    def __init__(self, code: str, message: str, status: int = 502):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


_allowed = {"mtime": None, "set": frozenset()}


def allowed_phrases():
    """Sentences the app itself may speak (frontend/public/audio/phrases.txt). Only these are ever sent to the
    foreign voice provider, so no name, message or other personal data can leave the country through speech."""
    path = settings.TTS_PHRASES_FILE
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return frozenset()
    if _allowed["mtime"] != mtime:
        lines = path.read_text(encoding="utf-8").splitlines()
        _allowed.update(mtime=mtime, set=frozenset(" ".join(l.split()) for l in lines if l.strip() and not l.startswith("#")))
    return _allowed["set"]


def is_allowed(text: str) -> bool:
    return (not settings.TTS_ALLOWLIST_ONLY) or normalize(text) in allowed_phrases()


def normalize(text: str) -> str:
    return " ".join(str(text).split())


def _cache_path(provider: str, text: str):
    key = json.dumps(
        [provider, settings.EDGE_TTS_VOICE, settings.ELEVENLABS_VOICE_ID, settings.ELEVENLABS_MODEL_ID, settings.ELEVENLABS_OUTPUT_FORMAT, VOICE_SETTINGS, text],
        sort_keys=True, ensure_ascii=False,
    )
    return settings.TTS_CACHE_DIR / (hashlib.sha256(key.encode("utf-8")).hexdigest()[:40] + ".mp3")


def _cache_get(path):
    try:
        data = path.read_bytes()
        return data or None
    except OSError:
        return None


def _cache_put(path, data: bytes):
    try:  # a cache problem must never break speech
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{os.getpid()}.tmp")
        tmp.write_bytes(data)
        os.replace(tmp, path)   # atomic: other workers never see a half-written file
    except OSError:
        log.warning("TTS cache write failed", exc_info=True)


def _map_http_error(status: int, body: str) -> TTSError:
    # The body may describe our account; it goes to the log, never to the user.
    key = settings.ELEVENLABS_API_KEY
    log.error("ElevenLabs HTTP %s: %s", status, (body.replace(key, "***") if key else body)[:300])
    if status in (401, 403):
        return TTSError("tts_unavailable", "Ovoz xizmati hozir ishlamayapti.", 502)   # bad/disabled API key
    if status == 402 or "quota" in body.lower():
        return TTSError("tts_quota", "Ovoz xizmati limiti tugadi. Keyinroq urinib ko'ring.", 503)
    if status == 422 or status == 400:
        return TTSError("tts_bad_text", "Bu matnni ovozga aylantirib bo'lmadi.", 400)
    if status == 429:
        return TTSError("tts_busy", "Ovoz xizmati band. Birozdan keyin qayta urining.", 429)
    return TTSError("tts_unavailable", "Ovoz xizmati hozir ishlamayapti.", 502)


def _edge(text: str) -> bytes:
    """Microsoft Edge neural voice (default: uz-UZ-MadinaNeural). Real Uzbek, no API key needed."""
    try:
        import edge_tts
    except ImportError:
        log.error("edge-tts is not installed (pip install edge-tts)")
        raise TTSError("tts_unavailable", "Ovoz xizmati hozir ishlamayapti.", 502) from None

    async def run() -> bytes:
        comm = edge_tts.Communicate(text, settings.EDGE_TTS_VOICE, rate=settings.EDGE_TTS_RATE, pitch=settings.EDGE_TTS_PITCH)
        out = bytearray()
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                out += chunk["data"]
        return bytes(out)

    try:
        audio = asyncio.run(asyncio.wait_for(run(), timeout=settings.ELEVENLABS_TIMEOUT))
    except asyncio.TimeoutError:
        raise TTSError("tts_timeout", "Ovoz xizmati javob bermadi. Qayta urinib ko'ring.", 504) from None
    except Exception:  # network down, blocked, service changed...
        log.warning("edge-tts failed", exc_info=True)
        raise TTSError("tts_unavailable", "Ovoz xizmatiga ulanib bo'lmadi.", 502) from None
    if not audio:
        raise TTSError("tts_unavailable", "Ovoz xizmati noto'g'ri javob berdi.", 502)
    return audio


def _elevenlabs(text: str) -> bytes:
    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        raise TTSError("tts_not_configured", "Ovoz xizmati sozlanmagan.", 503)

    url = (
        f"{settings.ELEVENLABS_BASE_URL.rstrip('/')}/{settings.ELEVENLABS_VOICE_ID}"
        f"?output_format={settings.ELEVENLABS_OUTPUT_FORMAT}"
    )
    payload = json.dumps(
        {"text": text, "model_id": settings.ELEVENLABS_MODEL_ID, "voice_settings": VOICE_SETTINGS},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(req, timeout=settings.ELEVENLABS_TIMEOUT) as res:
            audio = res.read()
            ctype = (res.headers.get("Content-Type") or "").lower()
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
        except Exception:
            body = ""
        raise _map_http_error(e.code, body) from None
    except (socket.timeout, TimeoutError):
        raise TTSError("tts_timeout", "Ovoz xizmati javob bermadi. Qayta urinib ko'ring.", 504) from None
    except (urllib.error.URLError, OSError):
        log.warning("ElevenLabs unreachable", exc_info=True)
        raise TTSError("tts_unavailable", "Ovoz xizmatiga ulanib bo'lmadi.", 502) from None

    if not audio or "audio" not in ctype:
        log.error("ElevenLabs returned unexpected content-type %r (%d bytes)", ctype, len(audio or b""))
        raise TTSError("tts_unavailable", "Ovoz xizmati noto'g'ri javob berdi.", 502)

    return audio


def _providers():
    """Main provider first; the other one is the safety net (ElevenLabs only if a key exists)."""
    main = (settings.TTS_PROVIDER or "edge").lower()
    order = ["elevenlabs", "edge"] if main == "elevenlabs" else ["edge", "elevenlabs"]
    return [p for p in order if p == "edge" or settings.ELEVENLABS_API_KEY]


def synthesize(text: str) -> bytes:
    text = normalize(text)
    if not text:
        raise TTSError("tts_bad_text", "Matn bo'sh.", 400)
    last = None
    for provider in _providers():
        path = _cache_path(provider, text)
        cached = _cache_get(path)
        if cached:
            return cached
        try:
            audio = (_edge if provider == "edge" else _elevenlabs)(text)
        except TTSError as e:
            last = last or e          # report the main provider's reason
            continue
        _cache_put(path, audio)
        return audio
    raise last or TTSError("tts_not_configured", "Ovoz xizmati sozlanmagan.", 503)
