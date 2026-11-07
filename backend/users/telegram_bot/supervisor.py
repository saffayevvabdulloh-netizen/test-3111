"""Keeps the bot connected forever (pure asyncio, no aiogram / Django imports -> unit-testable).

Before: the first network hiccup ended the bot thread for good, and nobody noticed.
Now:   every failure is classified, recorded (so the website can show it) and retried with a growing pause,
       except a wrong token, where retrying can never help.
"""
import asyncio
import inspect
import random
import time

from .health import classify_exception


async def _maybe_await(x):
    if inspect.isawaitable(x):
        await x


async def supervise(run_once, record, *, sleep=asyncio.sleep, base=3.0, cap=60.0, healthy_after=60.0, max_rounds=None):
    """Run `run_once()` again and again. Returns the fatal state (e.g. "bad_token") or None after `max_rounds`."""
    delay, rounds = base, 0
    while True:
        rounds += 1
        started = time.monotonic()
        try:
            await run_once()
            state, msg = "error", "polling stopped"
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - everything must be classified, never kill the thread
            state, fatal, msg = classify_exception(exc)
            await _maybe_await(record(False, state, msg))
            if fatal:
                return state
        else:
            await _maybe_await(record(False, state, msg))
        if time.monotonic() - started > healthy_after:
            delay = base  # it had been working for a while: start the pauses over
        if max_rounds is not None and rounds >= max_rounds:
            return None
        await sleep(delay + random.uniform(0, delay * 0.2))
        delay = min(cap, delay * 2)
