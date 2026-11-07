import os
import tempfile
import unittest
from pathlib import Path

from .envfile import load_env_file, parse_env_text


class EnvFileTests(unittest.TestCase):
    def test_inline_comment_is_not_part_of_value(self):
        d = parse_env_text("ALLOWED_HOSTS=localhost,127.0.0.1      # e.g. example.com\nDEBUG=True # dev\n")
        self.assertEqual(d["ALLOWED_HOSTS"], "localhost,127.0.0.1")
        self.assertEqual(d["DEBUG"], "True")

    def test_quotes_hash_inside_quotes_and_export(self):
        d = parse_env_text("export A='x # y'\nB=\"p#q\"\nC=pa#ss\n# comment\n\nNOEQ\n")
        self.assertEqual((d["A"], d["B"], d["C"]), ("x # y", "p#q", "pa#ss"))
        self.assertNotIn("NOEQ", d)

    def test_last_duplicate_wins_and_bom_ok(self):
        d = parse_env_text("\ufeffSECRET_KEY=a\nSECRET_KEY=b\n")
        self.assertEqual(d["SECRET_KEY"], "b")

    def test_real_env_wins_and_bot_token_alias(self):
        for k in ("TELEGRAM_BOT_TOKEN", "BOT_TOKEN", "ZZ_KEEP"):
            os.environ.pop(k, None)
        os.environ["ZZ_KEEP"] = "real"
        with tempfile.TemporaryDirectory() as t:
            f = Path(t) / ".env"
            f.write_text("BOT_TOKEN=123:abc\nZZ_KEEP=file\n", encoding="utf-8")
            load_env_file(f)
        self.assertEqual(os.environ["ZZ_KEEP"], "real")
        self.assertEqual(os.environ["TELEGRAM_BOT_TOKEN"], "123:abc")
        for k in ("TELEGRAM_BOT_TOKEN", "BOT_TOKEN", "ZZ_KEEP"):
            os.environ.pop(k, None)

    def test_missing_file_is_fine(self):
        self.assertEqual(load_env_file("/nonexistent/.env"), {})


if __name__ == "__main__":
    unittest.main()
