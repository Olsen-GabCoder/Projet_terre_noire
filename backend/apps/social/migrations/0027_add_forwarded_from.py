"""
Add forwarded_from FK to BookClubMessage for message forwarding.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0026_add_member_ban'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookclubmessage',
            name='forwarded_from',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='forwards',
                to='social.bookclubmessage',
                verbose_name='Transféré depuis',
            ),
        ),
    ]
