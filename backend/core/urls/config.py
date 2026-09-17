from django.urls import path
from rest_framework.routers import DefaultRouter

from core.views.config import ConfigNamespaceView, ConfigVersionViewSet

router = DefaultRouter()
router.register(r"versions", ConfigVersionViewSet, basename="config-version")

urlpatterns = [
    *router.urls,
    # Namespace catch-all last — otherwise "versions" is treated as a namespace → 404.
    path("<str:namespace>/", ConfigNamespaceView.as_view(), name="config-namespace"),
]
