from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import AuthViewSet

router = DefaultRouter()
router.register(r"", AuthViewSet, basename="auth")

urlpatterns = [
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    *router.urls,
]
