# Generated manually for soft fleet assignment history

import django.db.models.deletion
from django.db import migrations, models

import core.ids


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0022_soft_fleet_assignment_limits"),
        ("mobility", "0022_soft_fleet_assignment_limits"),
    ]

    operations = [
        migrations.CreateModel(
            name="VehicleAssignment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=core.ids.uuid7,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("starts_at", models.DateTimeField(db_index=True)),
                ("ends_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("note", models.CharField(blank=True, default="", max_length=255)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vehicle_assignments",
                        to="accounts.driver",
                    ),
                ),
                (
                    "vehicle",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assignments",
                        to="mobility.vehicle",
                    ),
                ),
            ],
            options={
                "ordering": ["-starts_at", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="vehicleassignment",
            index=models.Index(
                fields=["vehicle", "-starts_at"],
                name="mobility_ve_vehicle_6f0a1c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vehicleassignment",
            index=models.Index(
                fields=["driver", "-starts_at"],
                name="mobility_ve_driver__8c2b4d_idx",
            ),
        ),
    ]
