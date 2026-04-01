# Migration: couverture arrière (4e de couverture) pour les livres

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0007_book_pdf_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='book',
            name='back_cover_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='books/back_covers/',
                verbose_name='Image de couverture arrière (4e de couverture)',
            ),
        ),
    ]
