from django.urls import path

from core.views.media import MediaViewSet

upload = MediaViewSet.as_view({"post": "upload"})

urlpatterns = [
    path("upload/", upload, name="media-upload"),
]
