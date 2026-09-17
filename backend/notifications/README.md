# Portable notifications
#
# Install:
#   1. Copy `notifications/` into your Django project
#   2. Add "notifications.apps.NotificationsConfig" to INSTALLED_APPS
#   3. path("api/v1/", include("notifications.urls"))
#   4. migrate
#
# Write from domain services:
#   from notifications.services import NotificationService
#   NotificationService.notify(user=actor, title="…", body="…", link_path="/users/…")
#
# Requires: AUTH_USER_MODEL, core.models.BaseModel (or your UUID PK base).
