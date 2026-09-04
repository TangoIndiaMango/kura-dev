from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView

def health_check(request):
    return JsonResponse({"status": "ok", "service": "kura-api", "version": "1.0.0"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('healthz', health_check, name='health_check'),

    # OpenAPI 3.1 Schema & Scalar Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', TemplateView.as_view(template_name='scalar.html'), name='scalar-docs'),

    # API v1 routes
    path('api/v1/auth/', include('accounts.urls_auth')),
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/mobility/', include('mobility.urls')),
    path('api/v1/finance/', include('finance.urls')),
    path('api/v1/operations/', include('operations.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
]
