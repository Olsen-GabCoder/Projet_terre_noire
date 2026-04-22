"""Add MessageReport model for message moderation."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social', '0017_add_reply_to_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(
                    choices=[
                        ('SPAM', 'Spam'),
                        ('HARASSMENT', 'Harcèlement'),
                        ('INAPPROPRIATE', 'Contenu inapproprié'),
                        ('HATE_SPEECH', 'Discours haineux'),
                        ('OTHER', 'Autre'),
                    ],
                    max_length=20, verbose_name='Motif',
                )),
                ('details', models.TextField(blank=True, verbose_name='Détails supplémentaires')),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'En attente'),
                        ('REVIEWED', 'Examiné'),
                        ('DISMISSED', 'Rejeté'),
                    ],
                    default='PENDING', max_length=20, verbose_name='Statut',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reports',
                    to='social.bookclubmessage',
                    verbose_name='Message signalé',
                )),
                ('reporter', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='message_reports',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Signalé par',
                )),
            ],
            options={
                'verbose_name': 'Signalement de message',
                'verbose_name_plural': 'Signalements de messages',
                'ordering': ['-created_at'],
                'unique_together': {('message', 'reporter')},
            },
        ),
    ]
