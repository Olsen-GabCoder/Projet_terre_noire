"""
Sérialiseurs personnalisés pour l'authentification JWT.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Sérialiseur personnalisé qui permet de se connecter avec l'email ou le username.
    """
    
    def validate(self, attrs):
        # Récupérer l'email ou le username de la requête
        username_or_email = attrs.get('username', '').strip()
        
        # Si le champ contient un @, c'est un email, on cherche l'utilisateur par email
        if '@' in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                # Remplacer la valeur du champ username par le vrai username
                attrs['username'] = user.username
            except User.DoesNotExist:
                pass  # L'erreur sera gérée par la validation parente
        
        return super().validate(attrs)