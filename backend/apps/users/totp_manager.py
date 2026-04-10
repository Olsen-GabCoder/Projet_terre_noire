"""
Gestion TOTP (2FA) pour Frollot.
"""
import pyotp
import qrcode
import io
import base64
import hashlib
import secrets


def generate_totp_secret():
    """Genere un secret TOTP aleatoire (base32)."""
    return pyotp.random_base32()


def get_totp_uri(user, secret):
    """Retourne l'URI otpauth:// pour l'ajout dans une app authenticator."""
    return pyotp.TOTP(secret).provisioning_uri(user.email, issuer_name='Frollot')


def generate_qr_code_base64(uri):
    """Genere un QR code PNG encode en base64 a partir d'un URI."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode('utf-8')


def verify_totp_code(secret, code):
    """Verifie un code TOTP avec une fenetre de tolerance de +/- 1."""
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def generate_backup_codes(count=8):
    """Genere des codes de secours lisibles (hex 8 caracteres)."""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def hash_code(code):
    """Hash un code de secours avec SHA-256."""
    return hashlib.sha256(code.encode()).hexdigest()


def check_backup_code(user, code):
    """
    Verifie un code de secours : cherche un hash correspondant non utilise.
    Marque le code comme utilise si trouve. Retourne True/False.
    """
    code_hashed = hash_code(code.upper().strip())
    backup = user.totp_backup_codes.filter(code_hash=code_hashed, is_used=False).first()
    if backup:
        backup.is_used = True
        backup.save(update_fields=['is_used'])
        return True
    return False
