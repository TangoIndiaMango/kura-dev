"""Seed staff + demo driver users (yopmail inboxes for real mail)."""
from __future__ import annotations

from accounts.models import User

DRIVER_SEED_EMAIL = "kura.driver@yopmail.com"

# Prior fake domains → migrate on re-seed
_LEGACY_BY_EMAIL: dict[str, tuple[str, ...]] = {
    "admin@yopmail.com": ("admin@kura.eco",),
    "ops@yopmail.com": ("ops@kura.eco",),
    "agent.yaba@yopmail.com": ("agent.yaba@kura.eco",),
}


def _upsert_user(*, email: str, defaults: dict, password: str, pin: str | None = None) -> User:
    user = User.objects.filter(email=email).first()
    if user is None:
        for legacy in _LEGACY_BY_EMAIL.get(email, ()):
            user = User.objects.filter(email=legacy).first()
            if user is not None:
                user.email = email
                break
    if user is None:
        user = User(email=email, **defaults)
    else:
        for key, value in defaults.items():
            setattr(user, key, value)
    user.set_password(password)
    if pin is not None:
        user.set_pin(pin)
    user.save()
    return user


def seed_users() -> dict[str, User]:
    admin_user = _upsert_user(
        email="admin@yopmail.com",
        defaults={
            "first_name": "Amina",
            "last_name": "Bello",
            "role": User.Role.SUPER_ADMIN,
            "is_staff": True,
            "is_superuser": True,
        },
        password="adminpass123",
    )

    ops_user = _upsert_user(
        email="ops@yopmail.com",
        defaults={
            "first_name": "Tunde",
            "last_name": "Adeleke",
            "role": User.Role.OPS_MANAGER,
            "is_staff": True,
        },
        password="opspass123",
    )

    agent_user = _upsert_user(
        email="agent.yaba@yopmail.com",
        defaults={
            "first_name": "Chinedu",
            "last_name": "Okafor",
            "phone": "+2348098765432",
            "role": User.Role.HUB_AGENT,
            "is_staff": True,
        },
        password="agentpass123",
        pin="1234",
    )

    driver_user, _ = User.objects.get_or_create(
        phone="+2348012345678",
        defaults={
            "email": DRIVER_SEED_EMAIL,
            "first_name": "Ibrahim",
            "last_name": "Musa",
            "role": User.Role.DRIVER,
        },
    )
    driver_user.email = DRIVER_SEED_EMAIL
    driver_user.set_password("driverpass123")
    driver_user.set_pin("1234")
    driver_user.onboarding_step = User.OnboardingStep.DONE
    driver_user.save()

    return {
        "admin": admin_user,
        "ops": ops_user,
        "agent": agent_user,
        "driver": driver_user,
    }
