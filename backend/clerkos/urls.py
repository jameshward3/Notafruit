import os

from django.contrib import admin
from django.urls import include, path

# Optional mount prefix, e.g. CLERKOS_URL_PREFIX=clerkos when the API is served at
# /clerkos/api/v1/ next to another site on the same domain. Empty on-premise.
_PREFIX = os.environ.get("CLERKOS_URL_PREFIX", "").strip("/")
_P = f"{_PREFIX}/" if _PREFIX else ""

urlpatterns = [
    path(f"{_P}django-admin/", admin.site.urls),
    path(f"{_P}api/v1/", include("clerkos.api_urls")),
]
