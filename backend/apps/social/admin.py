from django.contrib import admin

from .models import (
    UserFollow, AuthorFollow, OrganizationFollow,
    ReadingList, ReadingListItem,
    Post, PostLike, PostComment,
    BookClub, BookClubMembership, BookClubMessage,
    MessageReport,
)


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'following', 'created_at']
    list_filter = ['created_at']
    search_fields = ['follower__username', 'following__username']
    raw_id_fields = ['follower', 'following']


@admin.register(AuthorFollow)
class AuthorFollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['follower__username', 'author__full_name']
    raw_id_fields = ['follower', 'author']


@admin.register(OrganizationFollow)
class OrganizationFollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'organization', 'created_at']
    list_filter = ['created_at']
    search_fields = ['follower__username', 'organization__name']
    raw_id_fields = ['follower', 'organization']


@admin.register(ReadingList)
class ReadingListAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'is_public', 'created_at', 'updated_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['title', 'user__username']
    raw_id_fields = ['user']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ReadingListItem)
class ReadingListItemAdmin(admin.ModelAdmin):
    list_display = ['reading_list', 'book', 'position', 'added_at']
    list_filter = ['added_at']
    search_fields = ['reading_list__title', 'book__title']
    raw_id_fields = ['reading_list', 'book']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['author', 'post_type', 'book', 'created_at']
    list_filter = ['post_type', 'created_at']
    search_fields = ['author__username', 'content', 'book__title']
    raw_id_fields = ['author', 'book']


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'post', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username']
    raw_id_fields = ['user', 'post']


@admin.register(PostComment)
class PostCommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'post', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'content']
    raw_id_fields = ['user', 'post']


@admin.register(BookClub)
class BookClubAdmin(admin.ModelAdmin):
    list_display = ['name', 'book', 'creator', 'is_public', 'max_members', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'creator__username', 'book__title']
    raw_id_fields = ['book', 'creator']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(BookClubMembership)
class BookClubMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'club', 'role', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['user__username', 'club__name']
    raw_id_fields = ['user', 'club']


@admin.register(BookClubMessage)
class BookClubMessageAdmin(admin.ModelAdmin):
    list_display = ['author', 'club', 'created_at']
    list_filter = ['created_at']
    search_fields = ['author__username', 'content', 'club__name']
    raw_id_fields = ['author', 'club']


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'reason', 'status', 'reporter', 'created_at']
    list_filter = ['status', 'reason', 'created_at']
    search_fields = ['reporter__username', 'details']
    raw_id_fields = ['message', 'reporter']
