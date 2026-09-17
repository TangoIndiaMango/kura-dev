# Generated manually for KYC photo re-request during manual review.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_engines_impact_telemetry"),
    ]

    operations = [
        migrations.AddField(
            model_name="identitydocument",
            name="photos_requested",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="identitydocument",
            name="request_note",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
