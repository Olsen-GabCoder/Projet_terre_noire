# Generated manually for NewsletterSubscriber

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='NewsletterSubscriber',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='Email')),
                ('subscribed_at', models.DateTimeField(auto_now_add=True, verbose_name="Date d'inscription")),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
            ],
            options={
                'verbose_name': 'Abonné newsletter',
                'verbose_name_plural': 'Abonnés newsletter',
                'ordering': ['-subscribed_at'],
            },
        ),
    ]
