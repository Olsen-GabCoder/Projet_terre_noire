# Data migration : crée un profil LECTEUR pour tous les utilisateurs existants.

from django.db import migrations
from django.utils.text import slugify


def create_lecteur_profiles(apps, schema_editor):
    User = apps.get_model('users', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')
    for user in User.objects.all():
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        base_slug = slugify(f"{full_name}-lecteur")
        slug = base_slug
        counter = 1
        while UserProfile.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        UserProfile.objects.get_or_create(
            user=user,
            profile_type='LECTEUR',
            defaults={'slug': slug},
        )


def reverse_lecteur_profiles(apps, schema_editor):
    UserProfile = apps.get_model('users', 'UserProfile')
    UserProfile.objects.filter(profile_type='LECTEUR').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_userprofile'),
    ]

    operations = [
        migrations.RunPython(create_lecteur_profiles, reverse_lecteur_profiles),
    ]
