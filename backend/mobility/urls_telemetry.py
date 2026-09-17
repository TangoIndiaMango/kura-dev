from django.urls import path

from mobility.views.telemetry_device import TelemetryDeviceIngestView

urlpatterns = [
    path("ingest", TelemetryDeviceIngestView.as_view(), name="telemetry-device-ingest"),
    path("ingest/", TelemetryDeviceIngestView.as_view(), name="telemetry-device-ingest-slash"),
]
