# Generated manually for Account.risk_status.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0019_user_notification_prefs"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="risk_status",
            field=models.CharField(
                choices=[
                    ("NORMAL", "Normal"),
                    ("WATCH", "Watch"),
                    ("RESTRICTED", "Restricted"),
                    ("FROZEN", "Frozen"),
                ],
                db_index=True,
                default="NORMAL",
                max_length=20,
            ),
        ),
    ]
