"""Add requires_approval on BookClub and membership_status on BookClubMembership."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0020_add_session_rsvp'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookclub',
            name='requires_approval',
            field=models.BooleanField(default=False, verbose_name='Approbation requise'),
        ),
        migrations.AddField(
            model_name='bookclubmembership',
            name='membership_status',
            field=models.CharField(
                choices=[
                    ('APPROVED', 'Approuvé'),
                    ('PENDING', 'En attente'),
                    ('REJECTED', 'Rejeté'),
                ],
                default='APPROVED',
                max_length=10,
                verbose_name="Statut d'adhésion",
            ),
        ),
    ]
