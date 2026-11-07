#!/usr/bin/env python3
"""Make a sweet FEMALE Uzbek voice for the whole app (recorded clips instead of the browser's voice).

    pip install edge-tts
    python tools/collect_phrases.py     # (only after you changed texts) refresh the sentence list
    python tools/make_audio.py          # makes frontend/public/audio/*.mp3 + manifest.json
    cd frontend && npm run build        # the clips are shipped with the site

Voice: Microsoft "Madina" (uz-UZ-MadinaNeural, female). Needs internet once, only on the computer that
runs this script; the finished site needs no internet service. Already generated clips are kept
(use --force to redo them). Texts with no clip are still read by the browser's own voice.
"""
import argparse
import asyncio
import hashlib
import json
import sys
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent / "frontend" / "public" / "audio"

for _s in (sys.stdout, sys.stderr):  # never crash on Windows code pages (cp1251/cp1252)
    try:
        _s.reconfigure(errors="replace")
    except Exception:
        pass


def norm(t: str) -> str:  # must match normText() in frontend/src/utils/sound.js
    return " ".join(t.split())


def filename(t: str) -> str:
    return hashlib.sha1(t.encode("utf-8")).hexdigest()[:12] + ".mp3"


def read_phrases(path: Path):
    seen, out = set(), []
    for line in path.read_text(encoding="utf-8").splitlines():
        t = norm(line)
        if t and not t.startswith("#") and t not in seen:
            seen.add(t)
            out.append(t)
    return out


async def build(args, edge_tts):
    AUDIO.mkdir(parents=True, exist_ok=True)
    mf_path = AUDIO / "manifest.json"
    manifest = json.loads(mf_path.read_text(encoding="utf-8")) if mf_path.exists() and not args.force else {}
    todo = [t for t in read_phrases(AUDIO / "phrases.txt") if args.force or t not in manifest or not (AUDIO / manifest[t]).exists()]
    print(f"{len(todo)} clip(s) to make, voice {args.voice}, rate {args.rate}, pitch {args.pitch}")
    failed = []
    for i, t in enumerate(todo, 1):
        f = filename(t)
        try:
            await edge_tts.Communicate(t, args.voice, rate=args.rate, pitch=args.pitch).save(str(AUDIO / f))
            manifest[t] = f
            print(f"[{i}/{len(todo)}] {t}")
        except Exception as exc:  # network hiccup: keep what we have, report at the end
            failed.append((t, exc))
            print(f"[{i}/{len(todo)}] FAILED {t}: {exc}", file=sys.stderr)
        if i % 20 == 0:  # save progress as we go
            mf_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    mf_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done: {len(manifest)} clips in manifest" + (f", {len(failed)} failed (run again to retry)" if failed else ""))
    return 1 if failed else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", default="uz-UZ-MadinaNeural", help="edge-tts voice (female Uzbek by default)")
    ap.add_argument("--rate", default="-10%", help="speed, e.g. -10%% = a little slower, clearer for children")
    ap.add_argument("--pitch", default="+2Hz")
    ap.add_argument("--force", action="store_true", help="remake every clip")
    args = ap.parse_args(argv)
    try:
        import edge_tts
    except ImportError:
        sys.exit("edge-tts is not installed. Run:  pip install edge-tts")
    return asyncio.run(build(args, edge_tts))


if __name__ == "__main__":
    sys.exit(main())
