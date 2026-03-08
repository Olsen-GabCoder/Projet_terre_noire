"""Sérialiseurs pour la réinitialisation du mot de passe."""
from rest_framework import serializers


class ForgotPasswordSerializer(serializers.Serializer):
    """Demande de réinitialisation : envoi d'un email avec lien."""
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """Réinitialisation du mot de passe avec token."""
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value
