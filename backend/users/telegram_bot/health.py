"""Pure helpers (no Django / aiogram imports, so they are easy to unit-test).

States used everywhere (API, UI, logs):
  ok            bot reached Telegram a moment ago
  no_token      TELEGRAM_BOT_TOKEN is empty
  bad_token     Telegram rejected the token (revoked / typo)
  unreachable   this computer cannot reach api.telegram.org (internet, DNS, firewall, ISP block)
  conflict      the SAME bot is already polling somewhere else (two programs, one token)
  rate_limited  Telegram asked us to slow down
  not_running   nothing is running the bot (no recent heartbeat)
  error         anything else
"""
import asyncio
import json
import socket
import urllib.error
import urllib.request

_NETWORK_NAMES = {
    "TelegramNetworkError", "ClientConnectorError", "ClientOSError", "ServerDisconnectedError", "ClientConnectionError",
    "ClientProxyConnectionError", "ServerTimeoutError", "ConnectionResetError", "ConnectTimeout", "ReadTimeout",
}
_NETWORK_WORDS = ("cannot connect", "name or service not known", "getaddrinfo", "temporary failure in name resolution",
                  "timeout", "timed out", "network is unreachable", "connection reset", "connection refused")


def classify_exception(exc):
    """-> (state, fatal, short_message). `fatal` = retrying is pointless (wrong token)."""
    name, msg = type(exc).__name__, str(exc)[:200]
    low = msg.lower()
    if name in ("TelegramUnauthorizedError", "TokenValidationError") or "unauthorized" in low:
        return "bad_token", True, msg
    if name == "TelegramConflictError" or ("conflict" in low and "getupdates" in low):
        return "conflict", False, msg
    if name == "TelegramRetryAfter":
        return "rate_limited", False, msg
    if (name in _NETWORK_NAMES or isinstance(exc, (asyncio.TimeoutError, TimeoutError, ConnectionError, socket.gaierror))
            or any(w in low for w in _NETWORK_WORDS)):
        return "unreachable", False, msg
    return "error", False, msg


def check_telegram(token, proxy="", timeout=8, urlopen=None):
    """One real `getMe` call. -> {"state": ..., "username"?, "detail"?}"""
    if not token:
        return {"state": "no_token"}
    open_ = urlopen
    if open_ is None:
        handlers = [urllib.request.ProxyHandler({"https": proxy, "http": proxy})] if proxy else []
        open_ = urllib.request.build_opener(*handlers).open
    try:
        with open_(f"https://api.telegram.org/bot{token}/getMe", timeout=timeout) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 404):
            return {"state": "bad_token", "detail": f"HTTP {e.code}"}
        return {"state": "error", "detail": f"HTTP {e.code}"}
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        reason = getattr(e, "reason", e)
        return {"state": "unreachable", "detail": str(reason)[:160], "dns": isinstance(reason, socket.gaierror)}
    except ValueError:
        return {"state": "error", "detail": "bad response"}
    if not isinstance(data, dict):
        return {"state": "error", "detail": "unexpected response"}
    if data.get("ok"):
        return {"state": "ok", "username": (data.get("result") or {}).get("username", "")}
    return {"state": "error", "detail": str(data)[:160]}
