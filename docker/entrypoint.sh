#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py ensure_admin
exec gunicorn root.wsgi:application \
  --bind 0.0.0.0:8000 \
  --worker-class gthread --workers "${WEB_CONCURRENCY:-2}" --threads "${WEB_THREADS:-8}" \
  --timeout 60 --keep-alive 5 --max-requests 2000 --max-requests-jitter 200 \
  --access-logfile -
