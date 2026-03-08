from rest_framework import serializers
from .models import NewsletterSubscriber


class NewsletterSubscribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['email']

    def validate_email(self, value):
        value = value.lower().strip()
        if NewsletterSubscriber.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Cet email est déjà inscrit à notre newsletter.")
        return value

    def create(self, validated_data):
        email = validated_data['email'].lower().strip()
        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=email,
            defaults={'is_active': True}
        )
        if not created and not subscriber.is_active:
            subscriber.is_active = True
            subscriber.save()
        return subscriber
