from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUserRole(BasePermission):
    """Allows access only to staff/admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.role in ['SUPER_ADMIN', 'OPS_MANAGER', 'HUB_AGENT'])
        )

class IsDriverUserRole(BasePermission):
    """Allows access to driver / operator users."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'DRIVER'
        )

class IsStaffOrReadOnly(BasePermission):
    """Safe methods are allowed for authenticated users; writes require staff role."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_staff or request.user.role in ['SUPER_ADMIN', 'OPS_MANAGER'])
