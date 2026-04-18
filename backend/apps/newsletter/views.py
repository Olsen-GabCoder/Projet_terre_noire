import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import NewsletterSubscriber
from .serializers import NewsletterSubscribeSerializer

logger = logging.getLogger(__name__)


class NewsletterSubscribeView(APIView):
    """Inscription à la newsletter avec double opt-in."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        if serializer.is_valid():
            subscriber = serializer.save()

            # Envoyer l'email de confirmation (double opt-in)
            try:
                from apps.core.email import send_async, send_templated_email
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                confirmation_url = f"{frontend_url}/newsletter/confirm/{subscriber.confirmation_token}"
                send_async(
                    send_templated_email,
                    subject="Confirmez votre inscription à la newsletter Frollot",
                    template_name='newsletter_confirmation',
                    context={
                        'confirmation_url': confirmation_url,
                        'user_email': subscriber.email,
                    },
                    to_emails=[subscriber.email],
                )
            except Exception:
                logger.exception("Erreur envoi email confirmation newsletter %s", subscriber.email)

            return Response(
                {'success': True, 'message': 'Un email de confirmation vous a été envoyé. Vérifiez votre boîte de réception.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NewsletterConfirmView(APIView):
    """Confirmation d'inscription à la newsletter (double opt-in)."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            sub = NewsletterSubscriber.objects.get(confirmation_token=token)
            if sub.confirmed:
                return Response({'message': 'Inscription déjà confirmée.'})
            sub.confirmed = True
            sub.save(update_fields=['confirmed'])

            # Envoyer le welcome email après confirmation
            try:
                from apps.core.tasks import send_newsletter_welcome_task
                send_newsletter_welcome_task.delay(sub.email)
            except Exception:
                pass

            return Response({'message': 'Inscription confirmée. Bienvenue !'})
        except NewsletterSubscriber.DoesNotExist:
            return Response(
                {'error': 'Lien de confirmation invalide.'},
                status=status.HTTP_404_NOT_FOUND,
            )


class NewsletterUnsubscribeView(APIView):
    """Désabonnement de la newsletter. RGPD article 21."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'message': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            sub = NewsletterSubscriber.objects.get(email=email)
            if not sub.is_active:
                return Response({'message': 'Vous êtes déjà désabonné.'})
            sub.is_active = False
            sub.save(update_fields=['is_active'])
            return Response({'message': 'Désabonnement effectué.'})
        except NewsletterSubscriber.DoesNotExist:
            return Response(
                {'message': 'Email non trouvé.'},
                status=status.HTTP_404_NOT_FOUND,
            )
