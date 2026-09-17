from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mobility", "0013_subscription_queued_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="token_ciphertext",
            field=models.TextField(blank=True, default=""),
        ),
    ]
