from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from core.exceptions import DomainError
from .models import User, Account, Driver, StaffMembership
from .serializers import (
    UserSerializer, AccountSerializer, DriverSerializer,
    LoginSerializer, OtpRequestSerializer, OtpVerifySerializer,
    PinVerifySerializer, PinSetSerializer
)

class AuthLoginView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip()
        password = serializer.validated_data['password']

        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            user = User.objects.filter(phone=identifier).first()

        if not user or not user.check_password(password):
            raise DomainError("INVALID_CREDENTIALS", "Invalid email/phone or password.", http_status=401)

        if not user.is_active:
            raise DomainError("ACCOUNT_DISABLED", "Your account has been deactivated.", http_status=403)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        })

class OtpRequestView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = OtpRequestSerializer

    @extend_schema(request=OtpRequestSerializer)
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone'].strip()

        return Response({
            "status": "success",
            "message": f"OTP sent to {phone}. (In dev mode, enter 123456)",
            "phone": phone
        })

class OtpVerifyView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = OtpVerifySerializer

    @extend_schema(request=OtpVerifySerializer)
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone'].strip()
        code = serializer.validated_data['code'].strip()

        if code != '123456':
            raise DomainError("INVALID_OTP", "The verification code entered is invalid or expired.")

        user = User.objects.filter(phone=phone).first()
        is_new_user = False
        if not user:
            is_new_user = True
            user = User.objects.create(
                phone=phone,
                role=User.Role.DRIVER,
                first_name='Rider',
                last_name=phone[-4:]
            )
            account = Account.objects.create(
                owner_user=user,
                kind=Account.Kind.INDIVIDUAL,
                display_name=f"Rider {phone[-4:]}"
            )
            Driver.objects.create(user=user, account=account)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "is_new_user": is_new_user,
            "user": UserSerializer(user).data
        })

class PinVerifyView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PinVerifySerializer

    @extend_schema(request=PinVerifySerializer)
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pin = serializer.validated_data['pin']

        if not request.user.pin_hash:
            raise DomainError("PIN_NOT_SET", "Security PIN has not been configured yet.")

        if not request.user.check_pin(pin):
            raise DomainError("INVALID_PIN", "The security PIN entered is incorrect.", http_status=401)

        return Response({
            "status": "verified",
            "grant": "pin-grant-approved"
        })

class PinSetView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PinSetSerializer

    @extend_schema(request=PinSetSerializer)
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pin = serializer.validated_data['pin']

        request.user.set_pin(pin)
        request.user.save(update_fields=['pin_hash'])
        return Response({"status": "success", "message": "PIN successfully updated."})

class MeView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        user_data = UserSerializer(request.user).data
        account = None
        driver = getattr(request.user, 'driver_profile', None)
        if driver:
            account = AccountSerializer(driver.account).data
        else:
            first_acct = request.user.accounts.first()
            if first_acct:
                account = AccountSerializer(first_acct).data

        return Response({
            "user": user_data,
            "account": account,
            "is_driver": request.user.role == User.Role.DRIVER,
            "is_staff": request.user.is_staff or request.user.role in [User.Role.SUPER_ADMIN, User.Role.OPS_MANAGER, User.Role.HUB_AGENT]
        })

class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountSerializer
    queryset = Account.objects.all().order_by('-created_at')
    filterset_fields = ['kind', 'status', 'kyc_status']
    search_fields = ['kura_id', 'display_name', 'owner_user__phone', 'owner_user__email']

class DriverViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DriverSerializer
    queryset = Driver.objects.all().select_related('user', 'account').order_by('-created_at')
    search_fields = ['user__first_name', 'user__last_name', 'user__phone', 'license_number']
