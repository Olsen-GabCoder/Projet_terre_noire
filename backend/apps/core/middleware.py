"""Middlewares de sécurité complémentaires pour l'API Frollot."""


class SecurityHeadersMiddleware:
    """
    Ajoute les headers de sécurité non couverts par Django natif :
    - Permissions-Policy : désactive les API navigateur non utilisées par Frollot
    - Cross-Origin-Opener-Policy : isole le contexte de navigation (recommandé OWASP)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), '
            'accelerometer=(), gyroscope=(), magnetometer=()'
        )
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        return response
