from rest_framework import serializers
from .models import Manuscript


class ManuscriptSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la soumission de manuscrits
    Les auteurs peuvent soumettre leur manuscrit (PDF/DOCX)
    Le champ 'status' est en lecture seule (géré par l'admin)
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'pen_name',
            'email',
            'phone_number',
            'country',
            'genre',
            'language',
            'page_count',
            'file',
            'file_url',
            'description',
            'terms_accepted',
            'status',
            'status_display',
            'submitted_at',
        ]
        read_only_fields = ['id', 'status', 'submitted_at']
    
    def get_file_url(self, obj):
        """Retourne l'URL complète du fichier manuscrit"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def validate_file(self, value):
        """Validation personnalisée du fichier"""
        # Limite de taille: 10 MB
        max_size = 10 * 1024 * 1024  # 10 MB en bytes
        
        if value.size > max_size:
            raise serializers.ValidationError(
                "Le fichier est trop volumineux. Taille maximale: 10 MB."
            )
        
        return value
    
    def validate_email(self, value):
        """Validation personnalisée de l'email"""
        return value.lower()
    
    def validate_phone_number(self, value):
        """Validation personnalisée du numéro de téléphone"""
        cleaned = ''.join(c for c in value if c.isdigit())
        if len(cleaned) < 8:
            raise serializers.ValidationError(
                "Le numéro de téléphone doit contenir au moins 8 chiffres."
            )
        return value.strip()

    def validate_page_count(self, value):
        """Validation du nombre de pages"""
        if value is not None and (value < 1 or value > 10000):
            raise serializers.ValidationError(
                "Le nombre de pages doit être entre 1 et 10 000."
            )
        return value

    def validate_terms_accepted(self, value):
        """Validation de l'acceptation des conditions"""
        if value in (True, 'true', '1', 'on', 'yes'):
            return True
        raise serializers.ValidationError(
            "Vous devez accepter les conditions de soumission."
        )

    def validate(self, attrs):
        """Vérifier terms_accepted si absent (checkbox non cochée)"""
        terms = attrs.get('terms_accepted')
        if terms is None:
            terms = self.initial_data.get('terms_accepted')
        if terms not in (True, 'true', '1', 'on', 'yes'):
            raise serializers.ValidationError({
                'terms_accepted': ["Vous devez accepter les conditions de soumission."]
            })
        attrs['terms_accepted'] = True
        return attrs

    def validate_description(self, value):
        """Validation de la description (min 50 caractères)"""
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "La description doit contenir au moins 50 caractères."
            )
        return value


class ManuscriptListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur allégé pour la liste des manuscrits (admin)
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'email',
            'status',
            'status_display',
            'submitted_at',
        ]
        read_only_fields = fields