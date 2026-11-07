#!/usr/bin/env bash
# Runs API + admin + the built React app on ONE port (default 8000).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"

if [ ! -f "${FRONTEND_DIST:-$ROOT/frontend/dist}/index.html" ]; then
  echo "Frontend is not built yet. Run ./build.sh first." >&2
  exit 1
fi

python manage.py migrate --noinput
python manage.py ensure_admin
exec gunicorn root.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --worker-class gthread --workers "${WEB_CONCURRENCY:-2}" --threads "${WEB_THREADS:-8}" \
  --timeout 60 --keep-alive 5 --max-requests 2000 --max-requests-jitter 200 \
  --access-logfile -
