# Soft-fleet hot-path indexes + one-open-assignment integrity

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mobility", "0023_vehicleassignment"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="swap",
            index=models.Index(
                fields=["driver", "status", "completed_at"],
                name="mobility_sw_driver__hot_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="reservation",
            index=models.Index(
                fields=["driver", "status", "expires_at"],
                name="mobility_re_driver__hot_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="vehicleassignment",
            constraint=models.UniqueConstraint(
                condition=models.Q(ends_at__isnull=True),
                fields=("vehicle",),
                name="uniq_open_vehicle_assignment",
            ),
        ),
    ]
