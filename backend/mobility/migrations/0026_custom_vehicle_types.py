from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mobility", "0025_soft_vcu_alert_rules"),
    ]

    operations = [
        migrations.AlterField(
            model_name="batterytype",
            name="vehicle_type",
            field=models.CharField(default="MOTORCYCLE", max_length=50),
        ),
        migrations.AlterField(
            model_name="plan",
            name="vehicle_type",
            field=models.CharField(default="MOTORCYCLE", max_length=50),
        ),
        migrations.AlterField(
            model_name="pricematrix",
            name="vehicle_type",
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name="vehiclemodel",
            name="vehicle_type",
            field=models.CharField(default="MOTORCYCLE", max_length=50),
        ),
    ]
