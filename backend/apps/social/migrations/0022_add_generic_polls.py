"""
Add poll_type to BookPoll and text_label to BookPollOption
to support generic polls (not just book selection).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social', '0021_add_approval_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookpoll',
            name='poll_type',
            field=models.CharField(
                max_length=10,
                choices=[('BOOK', 'Livre'), ('GENERIC', 'Générique')],
                default='BOOK',
                verbose_name='Type de sondage',
            ),
        ),
        migrations.AlterField(
            model_name='bookpolloption',
            name='book',
            field=models.ForeignKey(
                to='books.Book',
                on_delete=models.CASCADE,
                related_name='poll_options',
                verbose_name='Livre',
                null=True,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name='bookpolloption',
            name='text_label',
            field=models.CharField(
                max_length=200,
                null=True,
                blank=True,
                verbose_name='Option texte',
            ),
        ),
    ]
