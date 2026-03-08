# Migration : pays par défaut Gabon (Terre Noire Éditions)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_user_phone_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='country',
            field=models.CharField(default='Gabon', max_length=100, verbose_name='Pays'),
        ),
    ]
