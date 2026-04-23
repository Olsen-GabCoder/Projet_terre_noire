"""
Add is_banned and banned_at to BookClubMembership
for permanent ban support.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0025_add_reading_checkpoint'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookclubmembership',
            name='is_banned',
            field=models.BooleanField(default=False, verbose_name='Banni'),
        ),
        migrations.AddField(
            model_name='bookclubmembership',
            name='banned_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Banni le'),
        ),
    ]
