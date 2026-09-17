from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mobility", "0017_vehiclemodel_service_intervals_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="petrolengine",
            name="release_signature",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Media public_id for signed release acknowledgement.",
                max_length=255,
            ),
        ),
    ]
