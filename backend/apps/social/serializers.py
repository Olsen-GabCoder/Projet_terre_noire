from rest_framework import serializers

from apps.books.serializers import BookListSerializer
from .models import (
    UserFollow, AuthorFollow, OrganizationFollow,
    ReadingList, ReadingListItem,
    Post, PostComment,
    BookClub, BookClubMembership, BookClubMessage,
    MessageReport,
    ClubSession, SessionRSVP, ClubBookHistory,
    ClubWishlistItem, ReadingCheckpoint, ModerationLog,
)


# ── Helpers ──

class SimpleUserSerializer(serializers.Serializer):
    """Représentation légère d'un utilisateur."""
    id = serializers.IntegerField()
    full_name = serializers.SerializerMethodField()
    username = serializers.CharField()
    profile_image = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


# ── Follows ──

class UserFollowSerializer(serializers.ModelSerializer):
    follower = SimpleUserSerializer(read_only=True)
    following = SimpleUserSerializer(read_only=True)

    class Meta:
        model = UserFollow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuthorFollowSerializer(serializers.ModelSerializer):
    follower = SimpleUserSerializer(read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = AuthorFollow
        fields = ['id', 'follower', 'author', 'author_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrganizationFollowSerializer(serializers.ModelSerializer):
    follower = SimpleUserSerializer(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = OrganizationFollow
        fields = ['id', 'follower', 'organization', 'organization_name', 'created_at']
        read_only_fields = ['id', 'created_at']


# ── Listes de lecture ──

class ReadingListItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)

    class Meta:
        model = ReadingListItem
        fields = ['id', 'book', 'note', 'position', 'added_at']
        read_only_fields = ['id', 'added_at']


class ReadingListSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = ReadingList
        fields = ['id', 'user', 'title', 'slug', 'description', 'is_public',
                  'items_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return obj.items.count()


class ReadingListDetailSerializer(ReadingListSerializer):
    items = ReadingListItemSerializer(many=True, read_only=True)

    class Meta(ReadingListSerializer.Meta):
        fields = ReadingListSerializer.Meta.fields + ['items']


class ReadingListCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingList
        fields = ['id', 'title', 'description', 'is_public']
        read_only_fields = ['id']


# ── Publications ──

class PostCommentSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    content = serializers.CharField(max_length=2000)

    class Meta:
        model = PostComment
        fields = ['id', 'user', 'post', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'post', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    author = SimpleUserSerializer(read_only=True)
    book = BookListSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'image', 'book', 'post_type',
                  'rating', 'likes_count', 'comments_count', 'user_has_liked',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_likes_count(self, obj):
        # Uses prefetch cache (prefetch_related('likes') on queryset)
        return len(obj.likes.all())

    def get_comments_count(self, obj):
        # Uses prefetch cache (prefetch_related('comments') on queryset)
        return len(obj.comments.all())

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Iterate prefetched cache instead of issuing a filter query per post
        return any(like.user_id == request.user.id for like in obj.likes.all())


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'content', 'image', 'book', 'post_type', 'rating']
        read_only_fields = ['id']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le contenu ne peut pas être vide.")
        if len(value) > 5000:
            raise serializers.ValidationError("Le contenu ne peut pas dépasser 5000 caractères.")
        return value

    def validate_image(self, value):
        if value:
            allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            if hasattr(value, 'content_type') and value.content_type not in allowed:
                raise serializers.ValidationError("Format d'image non supporté.")
            if hasattr(value, 'size') and value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("L'image ne peut pas dépasser 10 Mo.")
        return value

    def validate(self, data):
        if data.get('post_type') == 'PLATFORM_REVIEW':
            rating = data.get('rating')
            if not rating or rating < 1 or rating > 5:
                raise serializers.ValidationError({'rating': 'Une note entre 1 et 5 est requise.'})
            data['book'] = None
        return data


class PlatformReviewSerializer(serializers.ModelSerializer):
    """Serializer public pour les avis plateforme affichés sur la Home."""
    author_name = serializers.SerializerMethodField()
    author_image = serializers.SerializerMethodField()
    profile_types = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author_name', 'author_image', 'profile_types',
                  'content', 'rating', 'likes_count', 'created_at']

    def get_author_name(self, obj):
        if not obj.author:
            return "Utilisateur supprimé"
        return obj.author.get_full_name() or obj.author.username

    def get_author_image(self, obj):
        if not obj.author:
            return None
        if obj.author.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.author.profile_image.url)
            return obj.author.profile_image.url
        return None

    def get_profile_types(self, obj):
        return obj.author.profile_types

    def get_likes_count(self, obj):
        return obj.likes.count()


# ── Clubs de lecture ──

class BookClubListSerializer(serializers.ModelSerializer):
    creator = SimpleUserSerializer(read_only=True)
    current_book = BookListSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    user_is_member = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    user_membership_status = serializers.SerializerMethodField()
    frequency_display = serializers.CharField(source='get_meeting_frequency_display', read_only=True)

    class Meta:
        model = BookClub
        fields = [
            'id', 'name', 'slug', 'description', 'cover_image',
            'category', 'meeting_frequency', 'frequency_display',
            'languages', 'tags', 'current_book',
            'creator', 'is_public', 'requires_approval', 'max_members',
            'reading_goal_pages', 'reading_goal_deadline',
            'members_count', 'user_is_member', 'user_membership_status', 'unread_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.memberships.filter(membership_status='APPROVED').count()

    def get_user_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user, membership_status='APPROVED').exists()
        return False

    def get_user_membership_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            m = obj.memberships.filter(user=request.user).first()
            return m.membership_status if m else None
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        membership = obj.memberships.filter(user=request.user).first()
        if not membership:
            return 0
        if not membership.last_read_at:
            # Jamais lu → tous les messages sont non lus
            return obj.messages.count()
        return obj.messages.filter(created_at__gt=membership.last_read_at).count()


class BookClubDetailSerializer(BookClubListSerializer):
    average_progress = serializers.SerializerMethodField()
    my_progress = serializers.SerializerMethodField()

    class Meta(BookClubListSerializer.Meta):
        fields = BookClubListSerializer.Meta.fields + ['average_progress', 'my_progress']

    def get_average_progress(self, obj):
        memberships = obj.memberships.all()
        if not memberships:
            return 0
        total = sum(m.reading_progress for m in memberships)
        return round(total / len(memberships))

    def get_my_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        m = obj.memberships.filter(user=request.user).first()
        return m.reading_progress if m else 0


class BookClubCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookClub
        fields = [
            'id', 'name', 'description', 'cover_image',
            'category', 'rules', 'meeting_frequency',
            'languages', 'tags', 'current_book',
            'is_public', 'requires_approval', 'max_members',
            'reading_goal_pages', 'reading_goal_deadline',
        ]
        read_only_fields = ['id']

    def validate_cover_image(self, value):
        if value:
            allowed = ['image/jpeg', 'image/png', 'image/webp']
            if hasattr(value, 'content_type') and value.content_type not in allowed:
                raise serializers.ValidationError("Format d'image non supporté.")
            if hasattr(value, 'size') and value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("L'image ne peut pas dépasser 5 Mo.")
        return value


class BookClubMemberSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)

    class Meta:
        model = BookClubMembership
        fields = ['id', 'user', 'role', 'membership_status', 'joined_at', 'reading_progress', 'is_banned', 'banned_at']
        read_only_fields = ['id', 'joined_at']


class BookClubMessageSerializer(serializers.ModelSerializer):
    author = SimpleUserSerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    quote_book_detail = serializers.SerializerMethodField()
    reply_to_preview = serializers.SerializerMethodField()

    forwarded_from_preview = serializers.SerializerMethodField()

    class Meta:
        model = BookClubMessage
        fields = [
            'id', 'club', 'author', 'message_type',
            'content', 'attachment', 'attachment_url',
            'attachment_name', 'voice_duration',
            'quote_text', 'quote_page', 'quote_book', 'quote_book_detail',
            'reply_to', 'reply_to_preview',
            'forwarded_from', 'forwarded_from_preview',
            'is_deleted', 'is_pinned', 'edited_at', 'created_at',
            'reactions_summary',
        ]
        read_only_fields = ['id', 'club', 'author', 'is_deleted', 'is_pinned', 'edited_at', 'created_at']

    def get_reply_to_preview(self, obj):
        """Aperçu léger du message parent (pas de récursion)."""
        if not obj.reply_to:
            return None
        parent = obj.reply_to
        return {
            'id': parent.id,
            'author': SimpleUserSerializer(parent.author).data if parent.author else None,
            'content': parent.content[:120] if parent.content else '',
            'message_type': parent.message_type,
            'is_deleted': parent.is_deleted,
        }

    def get_forwarded_from_preview(self, obj):
        if not obj.forwarded_from:
            return None
        fwd = obj.forwarded_from
        return {
            'id': fwd.id,
            'author': SimpleUserSerializer(fwd.author).data if fwd.author else None,
            'content': fwd.content[:120] if fwd.content else '',
            'message_type': fwd.message_type,
            'club_name': fwd.club.name if fwd.club else None,
        }

    def get_quote_book_detail(self, obj):
        if obj.quote_book:
            return BookListSerializer(obj.quote_book, context=self.context).data
        return None

    def get_reactions_summary(self, obj):
        """Retourne [{emoji, count, reacted_by_me}] agrégé par emoji."""
        from collections import Counter
        reactions = obj.reactions.all()
        if not reactions:
            return []
        request = self.context.get('request')
        current_user_id = request.user.id if request and request.user.is_authenticated else None
        counter = Counter()
        user_reacted = set()
        for r in reactions:
            counter[r.emoji] += 1
            if r.user_id == current_user_id:
                user_reacted.add(r.emoji)
        return [
            {'emoji': emoji, 'count': count, 'reacted_by_me': emoji in user_reacted}
            for emoji, count in counter.most_common()
        ]

    def validate_attachment(self, value):
        if value:
            if hasattr(value, 'size') and value.size > 20 * 1024 * 1024:
                raise serializers.ValidationError("Le fichier ne peut pas dépasser 20 Mo.")
        return value

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


# ── Signalements ──

class MessageReportSerializer(serializers.ModelSerializer):
    reporter = SimpleUserSerializer(read_only=True)
    message_preview = serializers.SerializerMethodField()

    class Meta:
        model = MessageReport
        fields = ['id', 'message', 'reporter', 'reason', 'details', 'status', 'created_at', 'message_preview']
        read_only_fields = ['id', 'message', 'reporter', 'status', 'created_at']

    def get_message_preview(self, obj):
        msg = obj.message
        return {
            'id': msg.id,
            'author': SimpleUserSerializer(msg.author).data if msg.author else None,
            'content': msg.content[:120] if msg.content else '',
            'message_type': msg.message_type,
            'is_deleted': msg.is_deleted,
            'created_at': msg.created_at,
        }


# ── Invitations ──

class ClubInvitationSerializer(serializers.ModelSerializer):
    created_by = SimpleUserSerializer(read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    club_slug = serializers.CharField(source='club.slug', read_only=True)
    club_cover = serializers.ImageField(source='club.cover_image', read_only=True)
    club_members_count = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        from apps.social.models import ClubInvitation
        model = ClubInvitation
        fields = [
            'id', 'token', 'club_name', 'club_slug', 'club_cover',
            'club_members_count', 'created_by',
            'max_uses', 'use_count', 'expires_at', 'is_active', 'is_valid',
            'created_at',
        ]

    def get_club_members_count(self, obj):
        return obj.club.memberships.count()


# ── Polls (votes pour le prochain livre) ──

class BookPollOptionSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    proposed_by = SimpleUserSerializer(read_only=True)
    votes_count = serializers.SerializerMethodField()
    voted_by_me = serializers.SerializerMethodField()

    class Meta:
        from apps.social.models import BookPollOption
        model = BookPollOption
        fields = ['id', 'book', 'text_label', 'proposed_by', 'votes_count', 'voted_by_me', 'created_at']

    def get_votes_count(self, obj):
        return obj.votes.count()

    def get_voted_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()


class BookPollSerializer(serializers.ModelSerializer):
    options = BookPollOptionSerializer(many=True, read_only=True)
    created_by = SimpleUserSerializer(read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        from apps.social.models import BookPoll
        model = BookPoll
        fields = ['id', 'title', 'poll_type', 'status', 'created_by', 'options', 'total_votes', 'created_at', 'closed_at']

    def get_total_votes(self, obj):
        return sum(o.votes.count() for o in obj.options.all())


# ── Sessions (séances programmées) ──

class ClubSessionSerializer(serializers.ModelSerializer):
    created_by = SimpleUserSerializer(read_only=True)
    rsvp_counts = serializers.SerializerMethodField()
    my_rsvp = serializers.SerializerMethodField()

    class Meta:
        model = ClubSession
        fields = [
            'id', 'club', 'title', 'description',
            'scheduled_at', 'is_online', 'location',
            'recurrence',
            'created_by', 'created_at',
            'rsvp_counts', 'my_rsvp',
        ]
        read_only_fields = ['id', 'club', 'created_by', 'created_at']

    def get_rsvp_counts(self, obj):
        rsvps = obj.rsvps.all()
        return {
            'going': sum(1 for r in rsvps if r.status == 'GOING'),
            'not_going': sum(1 for r in rsvps if r.status == 'NOT_GOING'),
            'maybe': sum(1 for r in rsvps if r.status == 'MAYBE'),
        }

    def get_my_rsvp(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        rsvp = next((r for r in obj.rsvps.all() if r.user_id == request.user.id), None)
        return rsvp.status if rsvp else None


# ── Historique des livres lus ──

class ClubBookHistorySerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)

    class Meta:
        model = ClubBookHistory
        fields = ['id', 'club', 'book', 'started_at', 'finished_at', 'created_at']
        read_only_fields = ['id', 'club', 'created_at']


# ── Wishlist collective ──

class ClubWishlistItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    suggested_by = SimpleUserSerializer(read_only=True)
    votes_count = serializers.SerializerMethodField()
    voted_by_me = serializers.SerializerMethodField()

    class Meta:
        from apps.social.models import ClubWishlistItem
        model = ClubWishlistItem
        fields = ['id', 'book', 'suggested_by', 'votes_count', 'voted_by_me', 'created_at']

    def get_votes_count(self, obj):
        return obj.votes.count()

    def get_voted_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()


# ── Jalons de lecture ──

class ReadingCheckpointSerializer(serializers.ModelSerializer):
    created_by = SimpleUserSerializer(read_only=True)
    is_reached = serializers.SerializerMethodField()

    class Meta:
        model = ReadingCheckpoint
        fields = ['id', 'label', 'target_page', 'sort_order', 'reached_at', 'is_reached', 'created_by', 'created_at']
        read_only_fields = ['id', 'reached_at', 'created_at']

    def get_is_reached(self, obj):
        return obj.reached_at is not None


# ── Journal de modération ──

class ModerationLogSerializer(serializers.ModelSerializer):
    actor = SimpleUserSerializer(read_only=True)
    target_user = SimpleUserSerializer(read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ModerationLog
        fields = ['id', 'action', 'action_display', 'actor', 'target_user', 'target_message', 'details', 'created_at']
