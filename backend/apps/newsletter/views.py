import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import NewsletterSubscriber
from .serializers import NewsletterSubscribeSerializer

logger = logging.getLogger(__name__)


class NewsletterSubscribeView(APIView):
    """Inscription à la newsletter. Accessible à tous."""
    # TODO: implement double opt-in (confirmation email with link)
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        if serializer.is_valid():
            subscriber = serializer.save()
            from apps.core.tasks import send_newsletter_welcome_task
            send_newsletter_welcome_task.delay(subscriber.email)
            return Response(
                {'success': True, 'message': 'Inscription réussie ! Merci de votre confiance.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
