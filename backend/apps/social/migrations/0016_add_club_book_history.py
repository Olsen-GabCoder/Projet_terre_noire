"""Add ClubBookHistory model for past books read by a club."""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0001_initial'),
        ('social', '0015_add_club_session'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClubBookHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('started_at', models.DateField(verbose_name='Commencé le')),
                ('finished_at', models.DateField(blank=True, null=True, verbose_name='Terminé le')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('book', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='club_history', to='books.book', verbose_name='Livre')),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='book_history', to='social.bookclub', verbose_name='Club')),
            ],
            options={
                'verbose_name': 'Historique de lecture du club',
                'verbose_name_plural': 'Historiques de lecture du club',
                'ordering': ['-finished_at', '-started_at'],
                'unique_together': {('club', 'book')},
            },
        ),
    ]
