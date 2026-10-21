"""Payments created before Payment.hub existed carry no hub, so hub daily
collections under-count them. Copy the hub from the swap they paid for.
Idempotent: only touches payments whose hub is still empty."""
from django.db import migrations


def backfill(apps, schema_editor):
    Payment = apps.get_model("finance", "Payment")
    Swap = apps.get_model("mobility", "Swap")
    rows = Swap.objects.filter(
        payment__isnull=False, payment__hub__isnull=True
    ).values_list("payment_id", "hub_id")
    for payment_id, hub_id in rows.iterator():
        Payment.objects.filter(pk=payment_id, hub__isnull=True).update(hub_id=hub_id)


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0012_remove_payment_finance_pay_hub_id_created_idx"),
        ("mobility", "0027_reservation_discount"),
    ]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
