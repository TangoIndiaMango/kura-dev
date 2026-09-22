# Generated manually for Payment.hub attribution (nullable).

import django.db.models.deletion
from django.db import migrations, models


def backfill_hub_from_cash_deposits(apps, schema_editor):
    CashDeposit = apps.get_model("operations", "CashDeposit")
    Payment = apps.get_model("finance", "Payment")
    for row in CashDeposit.objects.exclude(payment_id=None).exclude(hub_id=None).iterator():
        Payment.objects.filter(pk=row.payment_id, hub_id=None).update(hub_id=row.hub_id)


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0010_credit_offers_loan_repay"),
        ("mobility", "0021_battery_type_range_catalogue"),
        ("operations", "0009_override_nullable_swap_alert_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="hub",
            field=models.ForeignKey(
                blank=True,
                help_text="Station where this payment was collected or earned; null for remote funding.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments",
                to="mobility.hub",
            ),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(
                fields=["hub", "-created_at"],
                name="finance_pay_hub_id_created_idx",
            ),
        ),
        migrations.RunPython(backfill_hub_from_cash_deposits, migrations.RunPython.noop),
    ]
