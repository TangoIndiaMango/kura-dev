# Generated manually for User.avatar (staff / operator profile photo).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0017_remove_account_acquisition_path"),
        ("core", "0002_media_asset_and_domain_fks"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="user_avatars",
                to="core.mediaasset",
            ),
        ),
    ]
