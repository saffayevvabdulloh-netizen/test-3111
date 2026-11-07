from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from .spa import media, spa

admin.site.site_header = "Bolajon AI — boshqaruv"
admin.site.site_title = "Bolajon AI"
admin.site.index_title = "Boshqaruv paneli"

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    re_path(r"^%s$" % settings.ADMIN_URL.rstrip("/"), RedirectView.as_view(url="/" + settings.ADMIN_URL)),
    path("api/v1/", include("users.urls")),
    path("api/v1/", include("school.urls")),
    path("api/v1/", include("games.urls")),
    path("api/v1/", include("voice.urls")),
    path("api/v1/", include("chat.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.SERVE_MEDIA:
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", media)]

# LAST: everything else that is not an API/admin/static/media path and has no file extension
# belongs to the React app. (Missing /assets/x.js therefore stays a real 404, not an HTML page.)
urlpatterns += [re_path(r"^(?!(?:api|admin|media|static|assets)(?:/|$))(?!.*\.[A-Za-z0-9]+$).*$", spa)]

handler404 = "root.spa.not_found"
handler500 = "root.spa.error_500"
