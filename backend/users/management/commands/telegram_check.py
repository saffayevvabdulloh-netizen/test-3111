import sys

from django.conf import settings
from django.core.management.base import BaseCommand

from users import services
from users.telegram_bot.health import check_telegram

# state -> (what happened, what to do). Plain ASCII on purpose: Windows consoles.
EXPLAIN = {
    "ok": ("OK: the token works and Telegram is reachable.", ""),
    "no_token": ("TELEGRAM_BOT_TOKEN is empty.", "Get a token from @BotFather and put it into backend/.env as TELEGRAM_BOT_TOKEN=..."),
    "bad_token": ("Telegram rejected the token (401/404).", "Create a NEW token in @BotFather (/revoke or /token) and update TELEGRAM_BOT_TOKEN."),
    "unreachable": ("This computer cannot reach api.telegram.org.",
                    "Check the internet. If only Telegram fails, your provider/firewall may block it: turn a VPN on, or set "
                    "TELEGRAM_PROXY=http://host:port in backend/.env (or run: telegram_check --proxy http://host:port)."),
    "error": ("Telegram answered with something unexpected.", "Try again in a minute."),
}


class Command(BaseCommand):
    help = "Check the connection to the Telegram bot and say what to fix."

    def add_arguments(self, parser):
        parser.add_argument("--proxy", default="", help="try through this proxy, e.g. http://127.0.0.1:8080")

    def handle(self, *args, **opts):
        out = self.stdout.write
        proxy = opts["proxy"] or settings.TELEGRAM_PROXY
        out("Telegram bot check" + (f" (proxy: {proxy})" if proxy else ""))
        res = check_telegram(settings.TELEGRAM_BOT_TOKEN, proxy=proxy)
        what, todo = EXPLAIN.get(res["state"], EXPLAIN["error"])
        out(f"  result : {res['state']} - {what}")
        if res.get("detail"):
            out(f"  detail : {res['detail']}")
        if res.get("dns"):
            out("  note   : the name api.telegram.org could not be resolved (DNS): check the internet / DNS / VPN.")
        if todo:
            out(f"  fix    : {todo}")
        if res["state"] == "ok":
            real, configured = res.get("username", ""), settings.TELEGRAM_BOT_USERNAME
            out(f"  bot    : @{real}")
            if real and real.lower() != configured.lower():
                out(f"  WARNING: TELEGRAM_BOT_USERNAME={configured} but the token belongs to @{real}. "
                    f"Links now use @{real} automatically once the bot runs; fix the .env value too.")
        hb = services._heartbeat()
        if hb:
            out(f"  bot process: last heartbeat {int(services._age_seconds(hb))}s ago, state={hb.state}"
                + ("" if services._age_seconds(hb) <= settings.BOT_HEARTBEAT_STALE_SECONDS else "  (STALE: the bot process is not running)"))
        else:
            out("  bot process: no heartbeat yet (the bot has not been started, or `migrate` was not run).")
        if settings.REQUIRE_TELEGRAM_VERIFICATION and res["state"] != "ok":
            out("  NOTE: Telegram verification is REQUIRED, so new accounts cannot be activated until this is fixed.")
        if res["state"] != "ok":
            sys.exit(1)
