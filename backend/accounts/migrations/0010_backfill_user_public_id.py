# Generated manually — backfill public_id for existing users

from django.db import migrations

from core.ids import kura_id


def backfill_public_ids(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for user in User.objects.filter(public_id__isnull=True).iterator():
        prefix = "OP" if user.role in {"DRIVER", "FLEET_OWNER"} else "ST"
        for _ in range(20):
            candidate = kura_id(prefix, 6)
            if not User.objects.filter(public_id=candidate).exists():
                user.public_id = candidate
                user.save(update_fields=["public_id"])
                break


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0009_user_public_id_audit_notifications"),
    ]

    operations = [
        migrations.RunPython(backfill_public_ids, noop),
    ]
