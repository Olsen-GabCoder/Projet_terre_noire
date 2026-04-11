from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    UserRegistrationSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    UserListSerializer,
    UserProfileSerializer,
    UserProfileCreateSerializer,
    DeleteAccountSerializer,
)
from .models import UserProfile
from .token_serializers import EmailTokenObtainPairSerializer
from .password_reset_serializers import ForgotPasswordSerializer, ResetPasswordSerializer
from .throttles import ForgotPasswordThrottle, ResetPasswordThrottle, RegistrationThrottle, ResendVerificationThrottle

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour permettre la connexion avec l'email ou le username.
    """
    serializer_class = EmailTokenObtainPairSerializer


class UserRegistrationView(generics.CreateAPIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur.
    Accessible à tous (pas besoin d'être authentifié).
    Rate limited : 10 inscriptions/heure par IP.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegistrationThrottle]

    def create(self, request, *args, **kwargs):
        """
        Surcharge pour personnaliser la réponse après création.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)

        # Email de bienvenue (async)
        from apps.core.tasks import send_welcome_registration_task
        send_welcome_registration_task.delay(user.id)

        # Réponse avec les données de l'utilisateur créé (sans le mot de passe)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': 'Inscription réussie !',
                'user': UserDetailSerializer(user, context=self.get_serializer_context()).data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def perform_create(self, serializer):
        """Sauvegarde l'utilisateur et crée son profil Lecteur par défaut."""
        user = serializer.save()
        UserProfile.objects.get_or_create(user=user, profile_type='LECTEUR')
        return user


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Vue pour récupérer et mettre à jour le profil de l'utilisateur connecté.
    Seul l'utilisateur authentifié peut accéder à son propre profil.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        """
        Retourne l'utilisateur actuellement authentifié.
        Pas besoin de passer l'ID dans l'URL.
        """
        return self.request.user

    def get_serializer_class(self):
        """
        Retourne le sérialiseur approprié selon la méthode HTTP.
        - GET : UserDetailSerializer (lecture complète)
        - PUT/PATCH : UserUpdateSerializer (mise à jour partielle)
        """
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer

    def update(self, request, *args, **kwargs):
        """
        Surcharge pour personnaliser la réponse après mise à jour.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Retourne les données mises à jour avec le sérialiseur de détail
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(
            {
                'message': 'Profil mis à jour avec succès',
                'user': UserDetailSerializer(instance, context=self.get_serializer_context()).data
            }
        )


class ChangePasswordView(generics.UpdateAPIView):
    """
    Vue pour changer le mot de passe de l'utilisateur connecté.
    Nécessite l'ancien mot de passe pour des raisons de sécurité.
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Retourne l'utilisateur actuellement authentifié"""
        return self.request.user

    def update(self, request, *args, **kwargs):
        """
        Surcharge pour changer le mot de passe et personnaliser la réponse.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Invalider les anciens tokens
        user.token_version += 1
        user.save(update_fields=['token_version'])

        # Mettre à jour la session pour éviter la déconnexion
        update_session_auth_hash(request, user)

        return Response(
            {'message': 'Mot de passe changé avec succès'},
            status=status.HTTP_200_OK
        )


class UserListView(generics.ListAPIView):
    """
    Vue pour lister les utilisateurs (réservée aux administrateurs).
    Utilisation typique : panel d'administration.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None  # Ou utilisez PageNumberPagination selon vos besoins


class UserDetailAdminView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vue d'administration pour gérer un utilisateur spécifique.
    Permet de voir, modifier ou supprimer un utilisateur (soft delete).
    """
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'id'

    def perform_destroy(self, instance):
        """
        Soft delete : désactive l'utilisateur au lieu de le supprimer.
        """
        instance.is_active = False
        instance.save()


class ForgotPasswordView(APIView):
    """
    Demande de réinitialisation du mot de passe.
    POST /api/users/forgot-password/ avec { "email": "user@example.com" }
    Envoie un email avec un lien de réinitialisation (même réponse si email inexistant, pour éviter l'énumération).
    Rate limited : 3 demandes/heure par IP.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()

        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_active:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            subject = "Réinitialisation de votre mot de passe — Frollot"
            message = (
                f"Bonjour,\n\n"
                f"Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
                f"Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :\n{reset_url}\n\n"
                f"Ce lien expire dans 24 heures.\n\n"
                f"Si vous n'avez pas fait cette demande, ignorez cet email.\n\n"
                f"L'équipe Frollot"
            )
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                return Response(
                    {'message': "Impossible d'envoyer l'email. Réessayez plus tard."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        return Response({
            'message': "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Réinitialisation du mot de passe avec token.
    POST /api/users/reset-password/ avec { "uid": "...", "token": "...", "new_password": "..." }
    Rate limited : 5 tentatives/heure par IP.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResetPasswordThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'message': 'Lien invalide ou expiré. Demandez un nouveau lien.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'message': 'Lien invalide ou expiré. Demandez un nouveau lien.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.token_version += 1  # Invalider tous les anciens tokens
        user.save(update_fields=['password', 'token_version'])
        return Response({'message': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)


class UserProfileListCreateView(generics.ListCreateAPIView):
    """
    Lister les profils de l'utilisateur connecté ou en activer un nouveau.
    GET  /api/users/me/profiles/
    POST /api/users/me/profiles/  { "profile_type": "AUTEUR", "bio": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserProfileCreateSerializer
        return UserProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            {
                'message': f'Profil {profile.get_profile_type_display()} activé avec succès.',
                'profile': UserProfileSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Voir, modifier ou désactiver un profil spécifique.
    Le profil Lecteur ne peut pas être désactivé.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.profile_type == 'LECTEUR':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Le profil Lecteur ne peut pas être désactivé.")
        instance.is_active = False
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': f'Profil {instance.get_profile_type_display()} désactivé.'},
            status=status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    """
    Vérifie l'email de l'utilisateur via un token envoyé par email.
    POST /api/users/verify-email/ avec { "token": "uuid" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_value = request.data.get('token')
        if not token_value:
            return Response(
                {'message': 'Token de vérification manquant.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .models import EmailVerificationToken
        try:
            verification = EmailVerificationToken.objects.select_related('user').get(token=token_value)
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'message': 'Token de vérification invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if verification.is_used:
            return Response(
                {'message': 'Ce lien a déjà été utilisé. Connectez-vous.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if verification.is_expired:
            return Response(
                {'message': 'Ce lien a expiré. Demandez un nouveau lien de vérification.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Activer le compte
        verification.is_used = True
        verification.save(update_fields=['is_used'])
        user = verification.user
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'message': 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.'})


class ResendVerificationView(APIView):
    """
    Renvoie l'email de vérification.
    POST /api/users/resend-verification/ avec { "email": "..." }
    Rate limited : 3/heure.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        from .models import EmailVerificationToken
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'message': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(email__iexact=email, is_active=False).first()
        if user:
            # Supprimer l'ancien token et en créer un nouveau
            EmailVerificationToken.objects.filter(user=user).delete()
            verification = EmailVerificationToken.objects.create(user=user)
            try:
                from apps.core.email import send_templated_email
                send_templated_email(
                    subject="Vérifiez votre email — Frollot",
                    template_name='email_verification',
                    context={
                        'user': user,
                        'verification_url': f"{settings.FRONTEND_URL}/verify-email?token={verification.token}",
                        'frontend_url': settings.FRONTEND_URL,
                    },
                    to_emails=[user.email],
                )
            except Exception:
                pass
        # Réponse générique pour éviter l'énumération d'emails
        return Response({
            'message': "Si un compte non vérifié existe avec cet email, un nouveau lien a été envoyé."
        })


class CheckAuthView(APIView):
    """
    Vue pour vérifier si l'utilisateur est authentifié.
    Utile pour le frontend pour vérifier l'état d'authentification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Retourne les informations de l'utilisateur si authentifié.
        """
        return Response({
            'authenticated': True,
            'user': UserDetailSerializer(request.user, context={'request': request}).data
        })


# ──────────────────────────────────────────────────
# TOTP 2FA Views
# ──────────────────────────────────────────────────

class TOTPSetupView(APIView):
    """
    Initialise la configuration TOTP 2FA.
    POST /api/users/totp/setup/
    Retourne le secret, le QR code base64 et l'URI otpauth.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .totp_manager import generate_totp_secret, get_totp_uri, generate_qr_code_base64
        secret = generate_totp_secret()
        uri = get_totp_uri(request.user, secret)
        qr_code = generate_qr_code_base64(uri)
        return Response({
            'secret': secret,
            'qr_code': qr_code,
            'otpauth_uri': uri,
        })


class TOTPVerifySetupView(APIView):
    """
    Finalise l'activation TOTP 2FA en verifiant un code.
    POST /api/users/totp/verify-setup/ avec { secret, code }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .totp_manager import verify_totp_code, generate_backup_codes, hash_code
        from .models import TOTPBackupCode

        secret = request.data.get('secret', '').strip()
        code = request.data.get('code', '').strip()

        if not secret or not code:
            return Response(
                {'detail': 'secret et code sont requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verify_totp_code(secret, code):
            return Response(
                {'detail': 'Code TOTP invalide. Verifiez votre application authenticator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Activer TOTP
        user = request.user
        user.totp_secret = secret
        user.totp_enabled = True
        user.save(update_fields=['totp_secret', 'totp_enabled'])

        # Generer les codes de secours
        backup_codes = generate_backup_codes()
        TOTPBackupCode.objects.filter(user=user).delete()
        TOTPBackupCode.objects.bulk_create([
            TOTPBackupCode(user=user, code_hash=hash_code(code_val))
            for code_val in backup_codes
        ])

        return Response({
            'enabled': True,
            'backup_codes': backup_codes,
        })


class TOTPDisableView(APIView):
    """
    Desactive le TOTP 2FA.
    POST /api/users/totp/disable/ avec { password }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import TOTPBackupCode

        password = request.data.get('password', '')
        if not request.user.check_password(password):
            return Response(
                {'detail': 'Mot de passe incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user.totp_enabled = False
        user.totp_secret = None
        user.save(update_fields=['totp_enabled', 'totp_secret'])
        TOTPBackupCode.objects.filter(user=user).delete()

        return Response({'disabled': True})


class TOTPBackupCodesView(APIView):
    """
    Retourne le nombre de codes de secours restants.
    GET /api/users/totp/backup-codes/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = request.user.totp_backup_codes.filter(is_used=False).count()
        return Response({'remaining_codes': count})


class TOTPRegenerateCodesView(APIView):
    """
    Regenere les codes de secours TOTP.
    POST /api/users/totp/regenerate-codes/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .totp_manager import generate_backup_codes, hash_code
        from .models import TOTPBackupCode

        if not request.user.totp_enabled:
            return Response(
                {'detail': 'TOTP 2FA n\'est pas active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        TOTPBackupCode.objects.filter(user=request.user).delete()
        backup_codes = generate_backup_codes()
        TOTPBackupCode.objects.bulk_create([
            TOTPBackupCode(user=request.user, code_hash=hash_code(code_val))
            for code_val in backup_codes
        ])

        return Response({'backup_codes': backup_codes})


# ──────────────────────────────────────────────────
# Session management Views
# ──────────────────────────────────────────────────

class ActiveSessionListView(APIView):
    """
    Liste les sessions actives (non expirees) de l'utilisateur.
    GET /api/users/sessions/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils import timezone as tz
        sessions = request.user.active_sessions.filter(
            expires_at__gt=tz.now()
        ).values(
            'session_key', 'device_name', 'device_type',
            'ip_address', 'last_active_at', 'created_at', 'expires_at',
        )
        # Mark current session
        current_session_key = None
        if hasattr(request, 'auth') and request.auth:
            current_session_key = request.auth.get('session_key')

        results = []
        for s in sessions:
            s['is_current'] = str(s['session_key']) == str(current_session_key) if current_session_key else False
            results.append(s)

        return Response(results)


class RevokeSessionView(APIView):
    """
    Revoque une session specifique.
    DELETE /api/users/sessions/<session_key>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, session_key):
        from .models import ActiveSession
        deleted, _ = ActiveSession.objects.filter(
            session_key=session_key,
            user=request.user,
        ).delete()
        if deleted:
            return Response({'revoked': True})
        return Response(
            {'detail': 'Session introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )


class RevokeAllSessionsView(APIView):
    """
    Revoque toutes les sessions sauf la session courante.
    POST /api/users/sessions/revoke-all/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import ActiveSession
        qs = ActiveSession.objects.filter(user=request.user)
        # Exclude current session if available
        if hasattr(request, 'auth') and request.auth:
            current_session_key = request.auth.get('session_key')
            if current_session_key:
                qs = qs.exclude(session_key=current_session_key)
        count, _ = qs.delete()
        return Response({'revoked_count': count})


class LoginHistoryView(APIView):
    """
    Historique des 50 dernieres connexions de l'utilisateur.
    GET /api/users/me/login-history/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import LoginHistory
        entries = LoginHistory.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50].values(
            'id', 'email_used', 'ip_address', 'device_info',
            'status', 'failure_reason', 'created_at',
        )
        return Response(list(entries))


class DashboardCountsView(APIView):
    """Compteurs pour les badges de la sidebar du dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        counts = {}

        # Invitations en attente
        try:
            from apps.organizations.models import Invitation
            counts['invitations'] = Invitation.objects.filter(
                email=user.email, status='PENDING'
            ).count()
        except Exception:
            counts['invitations'] = 0

        # Manuscrits soumis
        try:
            from apps.manuscripts.models import Manuscript
            counts['manuscripts'] = Manuscript.objects.filter(submitter=user).count()
        except Exception:
            counts['manuscripts'] = 0

        # Demandes de service envoyées par le client
        try:
            from apps.services.models import ServiceRequest
            counts['my_service_requests'] = ServiceRequest.objects.filter(client=user).count()
        except Exception:
            counts['my_service_requests'] = 0

        # Services pro — demandes reçues (prestataire)
        try:
            from apps.services.models import ServiceRequest
            from apps.users.models import UserProfile
            pro_profiles = UserProfile.objects.filter(
                user=user, profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'], is_active=True
            )
            if pro_profiles.exists():
                counts['pro_requests_total'] = ServiceRequest.objects.filter(provider_profile__in=pro_profiles).count()
                counts['pro_requests_pending'] = ServiceRequest.objects.filter(provider_profile__in=pro_profiles, status='SUBMITTED').count()
                counts['pro_orders'] = 0
                try:
                    from apps.services.models import ServiceOrder
                    counts['pro_orders'] = ServiceOrder.objects.filter(provider__in=pro_profiles).exclude(status__in=['COMPLETED', 'CANCELLED']).count()
                except Exception:
                    pass
                counts['pro_listings'] = 0
                try:
                    from apps.services.models import ServiceListing
                    counts['pro_listings'] = ServiceListing.objects.filter(provider__in=pro_profiles, is_active=True).count()
                except Exception:
                    pass
            else:
                counts['pro_requests_total'] = 0
                counts['pro_requests_pending'] = 0
                counts['pro_orders'] = 0
                counts['pro_listings'] = 0
        except Exception:
            counts['pro_requests_total'] = 0
            counts['pro_requests_pending'] = 0
            counts['pro_orders'] = 0
            counts['pro_listings'] = 0

        # Prêts actifs
        try:
            from apps.library.models import BookLoan
            counts['active_loans'] = BookLoan.objects.filter(user=user, status__in=['APPROVED', 'CHECKED_OUT']).count()
        except Exception:
            counts['active_loans'] = 0

        return Response(counts)


class PublicPresenceView(APIView):
    """
    GET /api/users/me/public-presence/
    Retourne la liste des facettes publiques de l'utilisateur connecté :
    pages auteur, profils prestataires, organisations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        facets = []

        # 1. Author facet
        try:
            from apps.books.models import Author
            author = Author.objects.filter(user=user).first()
            if author:
                books_count = author.books.filter(available=True).count()
                if books_count > 0:
                    facets.append({
                        'type': 'author',
                        'url': f'/authors/{author.id}',
                        'books_count': books_count,
                    })
        except Exception:
            pass

        # 2. Professional facets (CORRECTEUR, ILLUSTRATEUR, TRADUCTEUR)
        pro_profiles = UserProfile.objects.filter(
            user=user,
            profile_type__in=['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'],
            is_active=True,
        ).exclude(slug='')
        for profile in pro_profiles:
            facets.append({
                'type': 'professional',
                'profile_type': profile.profile_type,
                'url': f'/professionals/{profile.slug}',
                'is_verified': profile.is_verified,
            })

        # 3. Organization facets
        try:
            from apps.organizations.models import Organization, OrganizationMembership
            from django.db.models import Q

            org_ids_seen = set()

            # Organizations owned by user
            for org in Organization.objects.filter(owner=user, is_active=True):
                org_ids_seen.add(org.id)
                facets.append({
                    'type': 'organization',
                    'name': org.name,
                    'url': f'/organizations/{org.slug}',
                    'role': 'PROPRIETAIRE',
                })

            # Organizations where user is active member (not already owner)
            memberships = OrganizationMembership.objects.filter(
                user=user, is_active=True, organization__is_active=True,
            ).select_related('organization').exclude(organization__id__in=org_ids_seen)
            for m in memberships:
                facets.append({
                    'type': 'organization',
                    'name': m.organization.name,
                    'url': f'/organizations/{m.organization.slug}',
                    'role': m.role,
                })
        except Exception:
            pass

        return Response({'facets': facets})


class DeleteAccountView(APIView):
    """
    Suppression de compte self-service (RGPD).
    POST /api/users/me/delete/ avec { password, confirmation: 'SUPPRIMER' }

    Vérifie les opérations en cours (blockers), anonymise les contenus publics,
    efface les données personnelles, désactive le compte. Irréversible.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db import transaction
        from django.utils import timezone
        import uuid

        user = request.user
        serializer = DeleteAccountSerializer(data=request.data, context={'user': user})
        serializer.is_valid(raise_exception=True)

        # ── Détection des opérations bloquantes ──
        blockers = []

        # 1. Propriétaire d'organisations
        from apps.organizations.models import Organization
        owned_orgs = Organization.objects.filter(owner=user)
        for org in owned_orgs:
            blockers.append(
                f"Vous êtes propriétaire de l'organisation « {org.name} ». "
                "Transférez la propriété ou dissolvez l'organisation."
            )

        # 2. Commandes de livres non terminales
        from apps.orders.models import Order
        active_orders = Order.objects.filter(user=user).exclude(status__in=['DELIVERED', 'CANCELLED']).count()
        if active_orders:
            blockers.append(f"Vous avez {active_orders} commande(s) de livres en cours.")

        # 3. Services en cours (client)
        from apps.services.models import ServiceOrder
        active_client_orders = ServiceOrder.objects.filter(client=user).exclude(status__in=['COMPLETED', 'CANCELLED']).count()
        if active_client_orders:
            blockers.append(f"Vous avez {active_client_orders} commande(s) de service en cours (client).")

        # 4. Services en cours (prestataire)
        active_provider_orders = ServiceOrder.objects.filter(provider__user=user).exclude(status__in=['COMPLETED', 'CANCELLED']).count()
        if active_provider_orders:
            blockers.append(f"Vous avez {active_provider_orders} commande(s) de service en cours (prestataire).")

        # 5. Retraits en attente
        from apps.marketplace.withdrawal_models import WithdrawalRequest
        active_withdrawals = WithdrawalRequest.objects.filter(user=user, status__in=['PENDING', 'PROCESSING']).count()
        if active_withdrawals:
            blockers.append(f"Vous avez {active_withdrawals} retrait(s) de fonds en attente.")

        # 6. Prêts non rendus
        from apps.library.models import BookLoan
        active_loans = BookLoan.objects.filter(borrower=user).exclude(status__in=['RETURNED', 'CANCELLED']).count()
        if active_loans:
            blockers.append(f"Vous avez {active_loans} prêt(s) de bibliothèque non restitué(s).")

        # 7. Soldes de portefeuilles > 0
        from apps.services.models import ProfessionalWallet
        for pw in ProfessionalWallet.objects.filter(professional__user=user, balance__gt=0):
            blockers.append(f"Vous avez un solde de {pw.balance} FCFA dans votre portefeuille prestataire. Effectuez un retrait.")

        from apps.marketplace.models import VendorWallet, DeliveryWallet
        for vw in VendorWallet.objects.filter(vendor__owner=user, balance__gt=0):
            blockers.append(f"L'organisation « {vw.vendor.name} » a un solde de {vw.balance} FCFA.")

        for dw in DeliveryWallet.objects.filter(agent__user=user, balance__gt=0):
            blockers.append(f"Vous avez un solde de {dw.balance} FCFA dans votre portefeuille livreur. Effectuez un retrait.")

        if blockers:
            return Response({
                'message': "Impossible de supprimer votre compte tant que des opérations sont en cours.",
                'blockers': blockers,
            }, status=status.HTTP_409_CONFLICT)

        # ── Capturer l'email AVANT effacement pour l'email de confirmation ──
        original_email = user.email
        original_name = user.get_full_name() or user.username

        # ── Suppression dans une transaction atomique ──
        unique_id = uuid.uuid4().hex[:12]

        with transaction.atomic():
            # Anonymiser les contenus publics (FK → NULL pour les modèles passés en SET_NULL)
            from apps.books.models import BookReview
            from apps.social.models import Post, PostComment, BookClubMessage, BookClub
            from apps.organizations.models import OrganizationReview

            BookReview.objects.filter(user=user).update(user=None)
            Post.objects.filter(author=user).update(author=None)
            PostComment.objects.filter(user=user).update(user=None)
            BookClubMessage.objects.filter(author=user).update(author=None)
            BookClub.objects.filter(creator=user).update(creator=None)
            OrganizationReview.objects.filter(user=user).update(user=None)

            # Préserver les données financières (FK → NULL)
            Order.objects.filter(user=user).update(user=None)
            ServiceOrder.objects.filter(client=user).update(client=None)
            from apps.services.models import ServiceRequest
            ServiceRequest.objects.filter(client=user).update(client=None)
            WithdrawalRequest.objects.filter(user=user).update(user=None)
            BookLoan.objects.filter(borrower=user).update(borrower=None)
            from apps.organizations.models import Inquiry
            Inquiry.objects.filter(sender=user).update(sender=None)

            # Effacer les champs personnels
            user.username = f'deleted_{unique_id}'
            user.email = f'deleted_{unique_id}@frollot.local'
            user.first_name = ''
            user.last_name = ''
            user.phone_number = None
            user.address = ''
            user.city = ''
            user.country = ''
            user.totp_secret = None
            user.totp_enabled = False
            user.receive_newsletter = False
            user.is_active = False
            user.deletion_requested_at = timezone.now()
            user.set_unusable_password()

            # Supprimer l'image de profil
            if user.profile_image:
                try:
                    user.profile_image.delete(save=False)
                except Exception:
                    pass
                user.profile_image = ''

            user.save()

            # Les cascades Django suppriment automatiquement :
            # sessions, tokens 2FA, social accounts, profiles (→ listings, wallets),
            # follows, reading lists, wishlist, likes, memberships, invitations, réservations

        # ── Email de confirmation (envoyé à l'ancien email) ──
        try:
            from apps.core.email import send_templated_email
            send_templated_email(
                subject="Votre compte Frollot a été supprimé",
                template_name='account_deletion',
                context={
                    'user_name': original_name,
                    'frontend_url': settings.FRONTEND_URL,
                },
                to_emails=[original_email],
            )
        except Exception:
            pass

        return Response({
            'message': 'Votre compte a été supprimé. Vos données personnelles ont été effacées.',
        })