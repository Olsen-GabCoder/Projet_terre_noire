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
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        if serializer.is_valid():
            subscriber = serializer.save()
            try:
                from apps.core.email import send_newsletter_welcome
                send_newsletter_welcome(subscriber.email)
            except Exception as e:
                logger.exception("Erreur envoi email newsletter à %s: %s", subscriber.email, e)
            return Response(
                {'success': True, 'message': 'Inscription réussie ! Merci de votre confiance.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
