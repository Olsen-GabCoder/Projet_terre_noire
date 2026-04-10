from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0006_add_editorial_quote_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='quote',
            name='author_must_purchase',
            field=models.BooleanField(
                default=False,
                help_text="Cocher si le contrat impose à l'auteur d'acheter un nombre d'exemplaires.",
                verbose_name="Achat obligatoire par l'auteur",
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='author_purchase_quantity',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text="Nombre d'exemplaires que l'auteur peut acheter librement, sans obligation.",
                verbose_name="Exemplaires en achat libre (optionnel)",
            ),
        ),
    ]
