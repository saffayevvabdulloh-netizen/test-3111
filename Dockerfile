# ---------- 1) build the React app ----------
FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2) Django that also serves the built app ----------
FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend/dist
COPY docker/entrypoint.sh /entrypoint.sh
ENV FRONTEND_DIST=/app/frontend/dist
RUN python -m whitenoise.compress /app/frontend/dist
# collectstatic needs settings to import; these throw-away values are NOT used at runtime
RUN SECRET_KEY=build-time-only DEBUG=False python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["/entrypoint.sh"]
