from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0016_identitydocument_photos_request"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="account",
            name="acquisition_path",
        ),
    ]
