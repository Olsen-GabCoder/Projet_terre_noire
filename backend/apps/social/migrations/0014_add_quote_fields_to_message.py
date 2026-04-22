"""Add QUOTE message type and quote fields to BookClubMessage."""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0001_initial'),
        ('social', '0013_add_club_invitation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bookclubmessage',
            name='message_type',
            field=models.CharField(
                choices=[
                    ('TEXT', 'Texte'),
                    ('VOICE', 'Note vocale'),
                    ('IMAGE', 'Image'),
                    ('FILE', 'Fichier'),
                    ('QUOTE', 'Citation de passage'),
                ],
                default='TEXT',
                max_length=10,
                verbose_name='Type de message',
            ),
        ),
        migrations.AddField(
            model_name='bookclubmessage',
            name='quote_text',
            field=models.TextField(blank=True, verbose_name='Texte du passage cité'),
        ),
        migrations.AddField(
            model_name='bookclubmessage',
            name='quote_page',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Numéro de page du passage'),
        ),
        migrations.AddField(
            model_name='bookclubmessage',
            name='quote_book',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='club_quotes',
                to='books.book',
                verbose_name='Livre cité',
            ),
        ),
    ]
