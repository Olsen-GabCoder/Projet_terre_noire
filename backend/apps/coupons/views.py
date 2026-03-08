from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import Coupon
from .serializers import CouponValidateSerializer


class CouponValidateView(APIView):
    """
    Valider un code promo.
    POST /api/coupons/validate/
    Body: { "code": "MAISON10" }
    Réponse: { "valid": true, "discount_percent": 10, "message": "10% de réduction appliqué" }
    """
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'valid': False,
                    'message': serializer.errors.get('code', ['Code promo invalide.'])[0],
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        code = serializer.validated_data['code']
        coupon = Coupon.objects.get(code=code)

        if coupon.discount_percent is not None:
            msg = f"{int(coupon.discount_percent)}% de réduction appliqué"
            return Response({
                'valid': True,
                'discount_percent': float(coupon.discount_percent),
                'discount_amount': None,
                'message': msg,
            })
        else:
            msg = f"{int(coupon.discount_amount or 0)} FCFA de réduction appliqué"
            return Response({
                'valid': True,
                'discount_percent': None,
                'discount_amount': float(coupon.discount_amount or 0),
                'message': msg,
            })
