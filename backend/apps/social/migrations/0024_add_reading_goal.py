"""
Add reading_goal_pages and reading_goal_deadline to BookClub
for structured reading objectives.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0023_add_club_wishlist'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookclub',
            name='reading_goal_pages',
            field=models.PositiveIntegerField(
                null=True, blank=True,
                verbose_name='Objectif de lecture (pages/semaine)',
            ),
        ),
        migrations.AddField(
            model_name='bookclub',
            name='reading_goal_deadline',
            field=models.DateField(
                null=True, blank=True,
                verbose_name="Date limite de l'objectif",
            ),
        ),
    ]
