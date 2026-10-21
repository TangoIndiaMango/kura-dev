"""Staging mirrors production security with slightly looser host defaults."""
from .prod import *  # noqa: F403
from .base import env_bool

# Staging still never runs with DEBUG=True
DEBUG = False
PSP_ALLOW_DEV_VA = False
# Demo telemetry only when a staging deploy opts in.
MOCK_IOT_ENABLED = env_bool("MOCK_IOT_ENABLED", False)
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
