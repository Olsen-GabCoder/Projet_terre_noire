"""
Add ModerationLog model for audit trail of moderation actions.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0028_add_session_recurrence'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ModerationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=20, choices=[
                    ('KICK', 'Exclusion'), ('BAN', 'Bannissement'), ('ROLE_CHANGE', 'Changement de rôle'),
                    ('MSG_DELETE', 'Suppression de message'), ('MSG_PIN', 'Épinglage de message'),
                    ('MSG_UNPIN', 'Désépinglage de message'), ('MEMBER_APPROVE', 'Approbation de membre'),
                    ('MEMBER_REJECT', 'Rejet de membre'), ('REPORT_REVIEW', 'Traitement de signalement'),
                ], verbose_name='Action')),
                ('details', models.CharField(blank=True, max_length=300, verbose_name='Détails')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='moderation_logs', to='social.bookclub', verbose_name='Club')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderation_actions', to=settings.AUTH_USER_MODEL, verbose_name="Auteur de l'action")),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderation_targets', to=settings.AUTH_USER_MODEL, verbose_name='Utilisateur ciblé')),
                ('target_message', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderation_logs', to='social.bookclubmessage', verbose_name='Message ciblé')),
            ],
            options={
                'verbose_name': 'Journal de modération',
                'verbose_name_plural': 'Journal de modération',
                'ordering': ['-created_at'],
            },
        ),
    ]
