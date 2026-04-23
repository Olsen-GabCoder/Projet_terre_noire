"""
Add ClubWishlistItem and ClubWishlistVote models
for collective book suggestion and voting.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0022_add_generic_polls'),
        ('books', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ClubWishlistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('club', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wishlist_items', to='social.bookclub', verbose_name='Club')),
                ('book', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='club_wishlist_entries', to='books.book', verbose_name='Livre')),
                ('suggested_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='club_suggestions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Suggestion de lecture',
                'verbose_name_plural': 'Suggestions de lecture',
                'ordering': ['-created_at'],
                'unique_together': {('club', 'book')},
            },
        ),
        migrations.CreateModel(
            name='ClubWishlistVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='social.clubwishlistitem', verbose_name='Suggestion')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wishlist_votes', to=settings.AUTH_USER_MODEL, verbose_name='Votant')),
            ],
            options={
                'verbose_name': 'Vote wishlist',
                'verbose_name_plural': 'Votes wishlist',
                'unique_together': {('item', 'user')},
            },
        ),
    ]
