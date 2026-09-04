from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, DriverViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='accounts')
router.register(r'drivers', DriverViewSet, basename='drivers')

urlpatterns = router.urls
