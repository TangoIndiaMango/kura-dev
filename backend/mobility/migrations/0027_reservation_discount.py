from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mobility", "0026_custom_vehicle_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="list_price_kobo",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="reservation",
            name="discount_code",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="reservation",
            name="discount_kobo",
            field=models.BigIntegerField(default=0),
        ),
    ]
