import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession
from asgiref.sync import sync_to_async
from django.conf import settings

from users import services

from .handlers import router
from .health import classify_exception
from .supervisor import supervise

logger = logging.getLogger(__name__)

HEARTBEAT_EVERY = 20  # seconds; the website treats the bot as alive while a beat is < BOT_HEARTBEAT_STALE_SECONDS old
_record = sync_to_async(services.record_bot_heartbeat)

# what to tell the person who runs the server (ASCII: safe on every Windows console)
HINTS = {
    "unreachable": "This computer cannot reach Telegram (internet/DNS/firewall/VPN?). Run: python manage.py telegram_check. "
                   "If Telegram is blocked, set TELEGRAM_PROXY in backend/.env. Retrying automatically.",
    "bad_token": "Telegram rejected the token. Create a fresh one in @BotFather and put it in TELEGRAM_BOT_TOKEN. NOT retrying.",
    "conflict": "The same bot is running somewhere else (second terminal / server / container). Stop the other copy. Retrying.",
    "rate_limited": "Telegram asked to slow down. Retrying.",
    "error": "Unexpected error. Retrying.",
}

_dp = None


def _dispatcher():
    global _dp
    if _dp is None:  # a Router can be attached to ONE Dispatcher only: build it once and reuse it for every reconnect
        _dp = Dispatcher()
        _dp.include_router(router)
    return _dp


async def _on_failure(ok, state, message):
    await _record(ok, state, message)
    line = f"[bot] connection lost: {state}. {HINTS.get(state, '')}  ({message})"
    print(line.encode("ascii", "replace").decode(), flush=True)  # ASCII only: Windows consoles (cp1251/cp1252) cannot print everything


async def _heartbeat(bot):
    while True:
        await asyncio.sleep(HEARTBEAT_EVERY)
        try:
            me = await bot.get_me(request_timeout=10)
            await _record(True, "ok", "", me.username or "")
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            state, _fatal, msg = classify_exception(exc)
            await _record(False, state, msg)
            logger.warning("Telegram heartbeat failed (%s): %s", state, msg)


async def _run_once():
    session = AiohttpSession(proxy=settings.TELEGRAM_PROXY or None)
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN, session=session)  # malformed token -> TokenValidationError -> "bad_token"
    beat = None
    try:
        me = await bot.get_me(request_timeout=15)  # fail fast and LOUD (network / wrong token) instead of hanging silently
        await _record(True, "ok", "", me.username or "")
        print(f"[bot] connected to Telegram as @{me.username}", flush=True)
        beat = asyncio.create_task(_heartbeat(bot))
        await _dispatcher().start_polling(bot, handle_signals=False, close_bot_session=False)
    finally:
        if beat:
            beat.cancel()
        await bot.session.close()


async def start_bot():
    if not settings.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set (backend/.env)")
    final = await supervise(_run_once, _on_failure)
    if final == "bad_token":
        print("[bot] stopped for good: wrong token. Fix TELEGRAM_BOT_TOKEN and restart.", flush=True)


if __name__ == "__main__":
    asyncio.run(start_bot())
