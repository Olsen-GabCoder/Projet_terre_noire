"""Add SessionRSVP model for session attendance tracking."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social', '0019_add_moderator_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='SessionRSVP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[
                        ('GOING', 'Participe'),
                        ('NOT_GOING', 'Ne participe pas'),
                        ('MAYBE', 'Peut-être'),
                    ],
                    max_length=10, verbose_name='Statut',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='rsvps',
                    to='social.clubsession',
                    verbose_name='Séance',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='session_rsvps',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Membre',
                )),
            ],
            options={
                'verbose_name': 'RSVP séance',
                'verbose_name_plural': 'RSVPs séances',
                'unique_together': {('session', 'user')},
            },
        ),
    ]
