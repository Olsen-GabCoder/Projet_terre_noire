"""Add AI meeting summary fields to ClubSession."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social', '0041_alter_clubbookhistory_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='clubsession',
            name='meeting_summary',
            field=models.TextField(blank=True, verbose_name='Résumé IA de la séance'),
        ),
        migrations.AddField(
            model_name='clubsession',
            name='summary_key_points',
            field=models.JSONField(blank=True, default=list, verbose_name='Points clés'),
        ),
        migrations.AddField(
            model_name='clubsession',
            name='summary_next_steps',
            field=models.TextField(blank=True, verbose_name='Prochaines étapes'),
        ),
        migrations.AddField(
            model_name='clubsession',
            name='summary_generated_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Date du résumé'),
        ),
        migrations.AddField(
            model_name='clubsession',
            name='summary_generated_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Résumé généré par',
            ),
        ),
    ]
