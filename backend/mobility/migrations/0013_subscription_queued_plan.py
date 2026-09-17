from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("mobility", "0012_plans_discounts_lifecycle"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="queued_plan",
            field=models.ForeignKey(
                blank=True,
                help_text="Next plan to apply when the current period ends. Empty = no change queued.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="queued_subscriptions",
                to="mobility.plan",
            ),
        ),
    ]
