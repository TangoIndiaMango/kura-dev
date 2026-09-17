# Generated manually for KYC default + never-submitted PENDING_PSP cleanup

from django.db import migrations, models


def normalize_unsubmitted_kyc(apps, schema_editor):
    Account = apps.get_model("accounts", "Account")
    IdentityDocument = apps.get_model("accounts", "IdentityDocument")
    submitted_ids = set(
        IdentityDocument.objects.values_list("account_id", flat=True).distinct()
    )
    Account.objects.filter(kyc_status__in=["PENDING_PSP", "PENDING"]).exclude(
        id__in=submitted_ids
    ).update(kyc_status="NONE")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_rename_identity_front_back_image"),
    ]

    operations = [
        migrations.AlterField(
            model_name="account",
            name="kyc_status",
            field=models.CharField(
                choices=[
                    ("NONE", "None"),
                    ("PROVISIONAL", "Provisional"),
                    ("PENDING", "Pending"),
                    ("PENDING_PSP", "Pending PSP"),
                    ("VERIFIED", "Verified"),
                    ("REJECTED", "Rejected"),
                ],
                default="NONE",
                max_length=20,
            ),
        ),
        migrations.RunPython(normalize_unsubmitted_kyc, migrations.RunPython.noop),
    ]
