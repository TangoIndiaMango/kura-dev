from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import AuthLoginView, OtpRequestView, OtpVerifyView, PinVerifyView, PinSetView, MeView

urlpatterns = [
    path('login/', AuthLoginView.as_view(), name='auth_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('otp/request/', OtpRequestView.as_view(), name='otp_request'),
    path('otp/verify/', OtpVerifyView.as_view(), name='otp_verify'),
    path('pin/verify/', PinVerifyView.as_view(), name='pin_verify'),
    path('pin/set/', PinSetView.as_view(), name='pin_set'),
    path('me/', MeView.as_view(), name='auth_me'),
]
