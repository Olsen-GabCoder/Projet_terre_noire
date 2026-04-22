"""Add ClubSession model for scheduled reading sessions."""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social', '0014_add_quote_fields_to_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClubSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='Sujet de la séance')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
                ('scheduled_at', models.DateTimeField(verbose_name='Date et heure')),
                ('is_online', models.BooleanField(default=True, verbose_name='En ligne')),
                ('location', models.CharField(blank=True, max_length=255, verbose_name='Lieu (si en présentiel)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='social.bookclub', verbose_name='Club')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Séance de club',
                'verbose_name_plural': 'Séances de club',
                'ordering': ['scheduled_at'],
            },
        ),
    ]
