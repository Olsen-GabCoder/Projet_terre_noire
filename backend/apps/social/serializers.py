from rest_framework import serializers

from apps.books.serializers import BookListSerializer
from .models import (
    UserFollow, AuthorFollow, OrganizationFollow,
    ReadingList, ReadingListItem,
    Post, PostLike, PostComment,
    BookClub, BookClubMembership, BookClubMessage,
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
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'content', 'image', 'book', 'post_type', 'rating']
        read_only_fields = ['id']

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
        return obj.author.get_full_name() or obj.author.username

    def get_author_image(self, obj):
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
    frequency_display = serializers.CharField(source='get_meeting_frequency_display', read_only=True)

    class Meta:
        model = BookClub
        fields = [
            'id', 'name', 'slug', 'description', 'cover_image',
            'category', 'meeting_frequency', 'frequency_display',
            'languages', 'tags', 'current_book',
            'creator', 'is_public', 'max_members',
            'members_count', 'user_is_member',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.memberships.count()

    def get_user_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user).exists()
        return False


class BookClubDetailSerializer(BookClubListSerializer):
    pass


class BookClubCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookClub
        fields = [
            'id', 'name', 'description', 'cover_image',
            'category', 'rules', 'meeting_frequency',
            'languages', 'tags', 'current_book',
            'is_public', 'max_members',
        ]
        read_only_fields = ['id']


class BookClubMemberSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)

    class Meta:
        model = BookClubMembership
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class BookClubMessageSerializer(serializers.ModelSerializer):
    author = SimpleUserSerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = BookClubMessage
        fields = [
            'id', 'club', 'author', 'message_type',
            'content', 'attachment', 'attachment_url',
            'attachment_name', 'voice_duration', 'created_at',
        ]
        read_only_fields = ['id', 'club', 'author', 'created_at']

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None
