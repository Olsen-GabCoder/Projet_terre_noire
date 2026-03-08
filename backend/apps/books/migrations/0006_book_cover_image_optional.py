# Migration: image de couverture optionnelle à la création

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0005_seed_default_categories'),
    ]

    operations = [
        migrations.AlterField(
            model_name='book',
            name='cover_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='books/covers/',
                verbose_name="Image de couverture",
            ),
        ),
    ]
