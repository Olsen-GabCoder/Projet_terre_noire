"""
Add recurrence field to ClubSession for recurring meetings.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0027_add_forwarded_from'),
    ]

    operations = [
        migrations.AddField(
            model_name='clubsession',
            name='recurrence',
            field=models.CharField(
                max_length=10,
                choices=[('NONE', 'Aucune'), ('WEEKLY', 'Hebdomadaire'), ('BIWEEKLY', 'Bimensuel'), ('MONTHLY', 'Mensuel')],
                default='NONE',
                verbose_name='Récurrence',
            ),
        ),
    ]
