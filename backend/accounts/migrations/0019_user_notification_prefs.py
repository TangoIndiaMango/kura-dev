# Generated manually for User.notification_prefs.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0018_user_avatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="notification_prefs",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Channel toggles, e.g. {"email": true, "push": true}.',
            ),
        ),
    ]
