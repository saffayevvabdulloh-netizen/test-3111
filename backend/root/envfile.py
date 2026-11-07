"""Tiny, forgiving .env loader (no Django needed, so it is unit-testable).

Why not only django-environ's read_env?
  * `KEY=value   # comment` must NOT put the comment into the value
    (a comment inside ALLOWED_HOSTS or DEBUG silently breaks the app);
  * if a key is duplicated the LAST one wins (like every dotenv tool);
  * real environment variables (docker, CI) always beat the file;
  * `BOT_TOKEN` is accepted as an alias of `TELEGRAM_BOT_TOKEN`.
"""
import os
import re
from pathlib import Path

ALIASES = {"TELEGRAM_BOT_TOKEN": ("BOT_TOKEN", "TELEGRAM_TOKEN")}


def parse_env_text(text: str) -> dict:
    out = {}
    for raw in text.lstrip("\ufeff").splitlines():  # \ufeff: BOM written by Windows Notepad
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        key, val = key.strip(), val.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if val[:1] in ("'", '"'):
            end = val.find(val[0], 1)
            val = val[1:end] if end != -1 else val[1:]
        else:
            val = re.split(r"(?:^|\s)#", val, maxsplit=1)[0].strip()
        out[key] = val
    return out


def load_env_file(path) -> dict:
    p = Path(path)
    values = parse_env_text(p.read_text(encoding="utf-8")) if p.is_file() else {}
    for k, v in values.items():
        os.environ.setdefault(k, v)  # real environment wins
    apply_aliases()
    return values


def apply_aliases() -> None:
    for canonical, alts in ALIASES.items():
        if os.environ.get(canonical):
            continue
        for alt in alts:
            if os.environ.get(alt):
                os.environ[canonical] = os.environ[alt]
                break
