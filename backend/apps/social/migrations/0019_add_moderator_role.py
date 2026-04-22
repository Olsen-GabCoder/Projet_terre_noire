"""Add MODERATOR choice to BookClubMembership.role."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0018_add_message_report'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bookclubmembership',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Administrateur'),
                    ('MODERATOR', 'Modérateur'),
                    ('MEMBER', 'Membre'),
                ],
                default='MEMBER',
                max_length=10,
            ),
        ),
    ]
