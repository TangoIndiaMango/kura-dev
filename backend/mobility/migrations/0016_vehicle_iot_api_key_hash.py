# Generated manually for IoT device-key ingest (PRD Ph2).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mobility", "0015_engines_impact_telemetry"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehicle",
            name="iot_api_key_hash",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="SHA-256 hex of device API key (plaintext shown once on rotate).",
                max_length=64,
            ),
        ),
    ]
