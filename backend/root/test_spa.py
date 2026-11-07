import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient


class SpaServingTests(SimpleTestCase):
    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        (self.dist / "index.html").write_text("<!doctype html><title>Bolajon AI</title><div id=root></div>")
        (self.dist / "assets").mkdir()
        (self.dist / "assets" / "app-abc12345.js").write_text("console.log(1)")

    def test_deep_links_get_index_html_and_are_not_cached(self):
        with override_settings(FRONTEND_DIST=self.dist):
            for url in ["/", "/login", "/app/games/3", "/teach/classes/9"]:
                r = self.client.get(url)
                self.assertEqual(r.status_code, 200, url)
                self.assertIn(b"<div id=root>", r.content)
                self.assertEqual(r["Cache-Control"], "no-cache")

    def test_api_admin_and_missing_files_are_not_swallowed_by_the_spa(self):
        with override_settings(FRONTEND_DIST=self.dist):
            r = APIClient().get("/api/v1/me/")
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r["Content-Type"], "application/json")
            r404 = self.client.get("/api/v1/does-not-exist/")
            self.assertEqual(r404.status_code, 404)
            self.assertEqual(r404["Content-Type"], "application/json")
            self.assertEqual(r404.json(), {"detail": "Not found."})
            self.assertEqual(self.client.get("/assets/missing-xyz.js").status_code, 404)
            self.assertEqual(self.client.get("/favicon.ico").status_code, 404)
            self.assertEqual(self.client.get("/admin/", follow=False).status_code, 302)
            self.assertEqual(self.client.get("/api/docs/").status_code, 200)

    def test_post_to_spa_route_is_rejected(self):
        with override_settings(FRONTEND_DIST=self.dist):
            self.assertEqual(self.client.post("/app/games/3").status_code, 405)

    def test_clear_message_when_frontend_not_built(self):
        with override_settings(FRONTEND_DIST=self.dist / "nope"):
            r = self.client.get("/")
            self.assertEqual(r.status_code, 503)
            self.assertIn(b"build", r.content)

    def test_uploaded_media_is_served(self):
        media = Path(tempfile.mkdtemp())
        (media / "games").mkdir()
        (media / "games" / "a.png").write_bytes(b"\x89PNG")
        with override_settings(MEDIA_ROOT=media):
            r = self.client.get("/media/games/a.png")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(b"".join(r.streaming_content), b"\x89PNG")
