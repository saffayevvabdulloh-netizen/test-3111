#!/usr/bin/env bash
# One-shot build for single-server mode: frontend -> frontend/dist, then Django prepares itself.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Frontend"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Backend"
cd "$ROOT/backend"
pip install -r requirements.txt
# pre-compress the frontend so WhiteNoise serves .gz (JS ~350 KB -> ~110 KB)
python -m whitenoise.compress "$ROOT/frontend/dist"
python manage.py migrate --noinput
python manage.py ensure_admin
python manage.py collectstatic --noinput

echo
echo "Done. Start everything on one port with:  ./start.sh"
