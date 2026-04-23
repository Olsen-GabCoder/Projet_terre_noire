"""
Add ReadingCheckpoint model for structured reading milestones.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0024_add_reading_goal'),
        ('books', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReadingCheckpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=200, verbose_name='Nom du jalon')),
                ('target_page', models.PositiveIntegerField(verbose_name='Page cible')),
                ('sort_order', models.PositiveIntegerField(default=0, verbose_name='Ordre')),
                ('reached_at', models.DateTimeField(blank=True, null=True, verbose_name='Atteint le')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='checkpoints', to='social.bookclub', verbose_name='Club')),
                ('book', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reading_checkpoints', to='books.book', verbose_name='Livre')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_checkpoints', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Jalon de lecture',
                'verbose_name_plural': 'Jalons de lecture',
                'ordering': ['sort_order', 'target_page'],
                'unique_together': {('club', 'book', 'target_page')},
            },
        ),
    ]
