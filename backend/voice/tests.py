import io
import json
import tempfile
import urllib.error
from pathlib import Path
from unittest import mock

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from users.models import User
from voice.services import TTSError

FAKE_KEY = "sk_test_SECRET_123"


class FakeResponse(io.BytesIO):
    def __init__(self, body=b"ID3fake-mp3", ctype="audio/mpeg"):
        super().__init__(body)
        self.headers = {"Content-Type": ctype}

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def http_error(code, body=b'{"detail":"x"}'):
    return urllib.error.HTTPError("https://api.elevenlabs.io", code, "err", {}, io.BytesIO(body))


class TTSTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.override = override_settings(TTS_ALLOWLIST_ONLY=False, TTS_PROVIDER="elevenlabs", ELEVENLABS_API_KEY=FAKE_KEY, TTS_CACHE_DIR=Path(self.tmp.name))
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.user = User.objects.create_user(username="ali", password="Str0ng!pass9", role="student")
        self.user.is_active = True
        self.user.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        # the safety-net voice must never touch the real network in tests
        p = mock.patch("voice.services._edge", side_effect=TTSError("tts_unavailable", "x", 502))
        p.start()
        self.addCleanup(p.stop)

    def post(self, text="Salom!"):
        return self.client.post("/api/v1/tts/", {"text": text}, format="json")

    def test_requires_login(self):
        self.assertEqual(APIClient().post("/api/v1/tts/", {"text": "x"}, format="json").status_code, 401)

    @mock.patch("urllib.request.urlopen")
    def test_success_sends_exact_payload_and_key_header(self, m):
        m.return_value = FakeResponse()
        r = self.post("Salom,   dunyo!")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "audio/mpeg")
        self.assertEqual(r.content, b"ID3fake-mp3")
        req = m.call_args[0][0]
        self.assertTrue(req.full_url.startswith("https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB"))
        self.assertEqual(req.get_header("Xi-api-key"), FAKE_KEY)
        body = json.loads(req.data)
        self.assertEqual(body["text"], "Salom, dunyo!")
        self.assertEqual(body["model_id"], "eleven_multilingual_v2")
        self.assertEqual(body["voice_settings"], {"stability": 0.65, "similarity_boost": 0.80, "style": 0.20, "use_speaker_boost": True})

    @mock.patch("urllib.request.urlopen")
    def test_same_text_is_cached(self, m):
        m.return_value = FakeResponse()
        self.assertEqual(self.post().status_code, 200)
        self.assertEqual(self.post().status_code, 200)
        self.assertEqual(m.call_count, 1)

    @override_settings(ELEVENLABS_API_KEY="")
    def test_missing_key_is_503_not_500(self):
        r = self.post()
        self.assertEqual(r.status_code, 502)   # only the (mocked, failing) Uzbek voice was left

    def test_validation(self):
        self.assertEqual(self.post("   ").status_code, 400)
        self.assertEqual(self.post("a" * 501).status_code, 400)
        self.assertEqual(self.client.post("/api/v1/tts/", {}, format="json").status_code, 400)

    @mock.patch("urllib.request.urlopen")
    def test_bad_key_never_leaks(self, m):
        m.side_effect = http_error(401, b'{"detail":{"message":"Invalid API key sk_test_SECRET_123"}}')
        r = self.post()
        self.assertEqual(r.status_code, 502)
        self.assertNotIn(FAKE_KEY, r.content.decode())

    @mock.patch("urllib.request.urlopen")
    def test_upstream_errors_are_mapped(self, m):
        for upstream, status, code in [(429, 429, "tts_busy"), (402, 503, "tts_quota"), (422, 400, "tts_bad_text"), (500, 502, "tts_unavailable")]:
            m.side_effect = http_error(upstream)
            r = self.post(f"t{upstream}")
            self.assertEqual((r.status_code, r.json()["code"]), (status, code))

    @mock.patch("urllib.request.urlopen")
    def test_network_failures(self, m):
        m.side_effect = TimeoutError()
        self.assertEqual(self.post("a").status_code, 504)
        m.side_effect = urllib.error.URLError("dns")
        self.assertEqual(self.post("b").status_code, 502)

    @mock.patch("urllib.request.urlopen")
    def test_non_audio_response_is_rejected(self, m):
        m.return_value = FakeResponse(b"<html>", "text/html")
        self.assertEqual(self.post().status_code, 502)


class FakeCommunicate:
    last = None

    def __init__(self, text, voice, **kw):
        FakeCommunicate.last = (text, voice, kw)

    async def stream(self):
        yield {"type": "WordBoundary"}
        yield {"type": "audio", "data": b"UZ-"}
        yield {"type": "audio", "data": b"MP3"}


class UzbekVoiceTests(APITestCase):
    """Default voice: Microsoft Madina (real Uzbek), no API key at all."""

    def setUp(self):
        cache.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        o = override_settings(TTS_ALLOWLIST_ONLY=False, TTS_PROVIDER="edge", ELEVENLABS_API_KEY="", TTS_CACHE_DIR=Path(self.tmp.name))
        o.enable()
        self.addCleanup(o.disable)
        u = User.objects.create_user(username="vali", password="Str0ng!pass9", role="student")
        u.is_active = True
        u.save()
        self.client = APIClient()
        self.client.force_authenticate(u)

    @mock.patch("edge_tts.Communicate", FakeCommunicate)
    def test_works_without_any_key_and_is_cached(self):
        r = self.client.post("/api/v1/tts/", {"text": "Salom, do'stim!"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "audio/mpeg")
        self.assertEqual(r.content, b"UZ-MP3")
        self.assertEqual(FakeCommunicate.last[1], "uz-UZ-MadinaNeural")
        FakeCommunicate.last = None
        self.assertEqual(self.client.post("/api/v1/tts/", {"text": "Salom, do'stim!"}, format="json").status_code, 200)
        self.assertIsNone(FakeCommunicate.last, "second call must come from the cache")

    @mock.patch("edge_tts.Communicate", side_effect=OSError("offline"))
    def test_offline_gives_clean_502(self, _):
        r = self.client.post("/api/v1/tts/", {"text": "Salom"}, format="json")
        self.assertEqual((r.status_code, r.json()["code"]), (502, "tts_unavailable"))

    @mock.patch("voice.services._elevenlabs", return_value=b"EL")
    @mock.patch("edge_tts.Communicate", side_effect=OSError("offline"))
    @override_settings(ELEVENLABS_API_KEY="k")
    def test_falls_back_to_elevenlabs_when_edge_fails(self, *_):
        r = self.client.post("/api/v1/tts/", {"text": "Salom"}, format="json")
        self.assertEqual((r.status_code, r.content), (200, b"EL"))
