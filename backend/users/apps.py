import logging
import os
import sys
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class UsersConfig(AppConfig):
    name = "users"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        self._maybe_start_dev_bot()

    @staticmethod
    def _maybe_start_dev_bot():
        """Dev convenience: run the Telegram bot next to `runserver`.

        Started from ready() (i.e. AFTER django.setup()), so model imports are
        safe. For production run `python manage.py run_telegram_bot` instead.
        """
        from django.conf import settings

        argv = sys.argv
        if len(argv) < 2 or argv[1] != "runserver":
            return
        # autoreloader: only the child process; --noreload: this process
        if os.environ.get("RUN_MAIN") != "true" and "--noreload" not in argv:
            return
        if not settings.RUN_TELEGRAM_BOT:
            return
        if not settings.TELEGRAM_BOT_TOKEN:
            logger.warning(
                "TELEGRAM_BOT_TOKEN is empty - Telegram bot not started. "
                "If REQUIRE_TELEGRAM_VERIFICATION=True nobody can activate an account: "
                "set the token in backend/.env (or REQUIRE_TELEGRAM_VERIFICATION=False for local tests)."
            )
            return

        import asyncio

        from users.telegram_bot.bot import start_bot

        threading.Thread(
            target=lambda: asyncio.run(start_bot()),
            name="telegram-bot",
            daemon=True,
        ).start()
