"""Serve the React single-page app from Django (single-server deployment)."""
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.defaults import page_not_found, server_error
from django.views.decorators.http import require_safe
from django.views.static import serve as serve_file

_cache = {"mtime": None, "html": b""}


def _index_html():
    path = settings.FRONTEND_DIST / "index.html"
    try:
        mtime = path.stat().st_mtime
    except FileNotFoundError:
        return None
    if _cache["mtime"] != mtime:          # picks up a fresh `npm run build` without restarting
        _cache.update(mtime=mtime, html=path.read_bytes())
    return _cache["html"]


@require_safe
def spa(request, path=""):
    """Every non-API, non-file URL (/app/games/3, /teach, /login ...) gets index.html;
    React Router then renders the right page. Real 404s for missing files stay 404."""
    html = _index_html()
    if html is None:
        return HttpResponse(
            "Frontend is not built yet. Run ./build.sh (or: cd frontend && npm install && npm run build).",
            status=503, content_type="text/plain; charset=utf-8",
        )
    resp = HttpResponse(html, content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = "no-cache"    # always revalidate: it points at the newest hashed assets
    return resp


@require_safe
def media(request, path):
    # document_root is read per request (so it follows settings / tests)
    resp = serve_file(request, path, document_root=settings.MEDIA_ROOT)
    # uploads get a random file name and are never edited in place -> the browser may keep them
    if resp.status_code in (200, 304):
        resp["Cache-Control"] = "public, max-age=2592000, immutable"
    return resp


def not_found(request, exception=None):
    """API clients get JSON, browsers get the normal 404 page."""
    if request.path.startswith("/api/"):
        return JsonResponse({"detail": "Not found."}, status=404)
    return page_not_found(request, exception)


def error_500(request):
    if request.path.startswith("/api/"):
        return JsonResponse({"code": "server_error"}, status=500)   # no text: the frontend shows its own message
    return server_error(request)
