from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'subject', 'message']

    def validate_email(self, value):
        return value.lower().strip()

    def validate_name(self, value):
        return value.strip() if value else value
