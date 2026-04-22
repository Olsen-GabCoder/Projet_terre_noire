"""Add reply_to FK on BookClubMessage for threaded replies."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0016_add_club_book_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookclubmessage',
            name='reply_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='replies',
                to='social.bookclubmessage',
                verbose_name='En réponse à',
            ),
        ),
    ]
