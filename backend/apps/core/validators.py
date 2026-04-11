"""
Validateurs partagés pour les uploads de fichiers.
Utilisés par les services professionnels (livrables) et potentiellement
par les manuscrits (migration future).
"""
from django.core.exceptions import ValidationError


BLOCKED_EXTENSIONS = {
    'exe', 'bat', 'sh', 'cmd', 'ps1', 'vbs', 'js',
    'msi', 'com', 'scr', 'jar',
}

# Magic bytes pour les formats courants — on vérifie uniquement
# les fichiers dont l'extension prétend être l'un de ces formats.
MAGIC_SIGNATURES = {
    'pdf':  [b'%PDF'],
    'docx': [b'PK\x03\x04'],
    'xlsx': [b'PK\x03\x04'],
    'zip':  [b'PK\x03\x04'],
    'doc':  [b'\xd0\xcf\x11\xe0'],
    'xls':  [b'\xd0\xcf\x11\xe0'],
    'png':  [b'\x89PNG'],
    'jpg':  [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
}

MAX_DELIVERABLE_SIZE = 100 * 1024 * 1024  # 100 Mo


def validate_deliverable_file(file):
    """
    Valide un fichier livrable uploadé par un prestataire.
    Lève ValidationError si le fichier est refusé.
    """
    # 1. Taille
    if file.size > MAX_DELIVERABLE_SIZE:
        raise ValidationError("Le fichier ne doit pas dépasser 100 Mo.")

    # 2. Extension blacklistée
    name = file.name or ''
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
    if ext in BLOCKED_EXTENSIONS:
        raise ValidationError(
            "Ce type de fichier n'est pas autorisé pour des raisons de sécurité."
        )

    # 3. Magic bytes — uniquement pour les formats qu'on sait vérifier
    if ext in MAGIC_SIGNATURES:
        header = file.read(8)
        file.seek(0)
        expected = MAGIC_SIGNATURES[ext]
        if not any(header.startswith(sig) for sig in expected):
            raise ValidationError(
                "Le contenu du fichier ne correspond pas à son extension. "
                "Vérifiez que le fichier n'est pas corrompu."
            )

    return file
