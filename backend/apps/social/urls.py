from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'lists', views.ReadingListViewSet, basename='readinglist')
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'clubs', views.BookClubViewSet, basename='bookclub')

urlpatterns = [
    # ── Follow toggles ──
    path('follow/user/', views.FollowUserToggleView.as_view(), name='follow-user-toggle'),
    path('follow/author/', views.FollowAuthorToggleView.as_view(), name='follow-author-toggle'),
    path('follow/organization/', views.FollowOrganizationToggleView.as_view(), name='follow-organization-toggle'),

    # ── Follow status ──
    path('follow/status/', views.FollowStatusView.as_view(), name='follow-status'),

    # ── Following / Followers ──
    path('following/', views.MyFollowingView.as_view(), name='my-following'),
    path('followers/user/<int:user_id>/', views.UserFollowersView.as_view(), name='user-followers'),
    path('followers/author/<int:author_id>/', views.AuthorFollowersView.as_view(), name='author-followers'),
    path('followers/organization/<int:organization_id>/', views.OrganizationFollowersView.as_view(), name='organization-followers'),

    # ── Recommendations ──
    path('recommendations/', views.RecommendationsView.as_view(), name='recommendations'),

    # ── Avis plateforme (public — Home page) ──
    path('platform-reviews/featured/', views.FeaturedPlatformReviewsView.as_view(), name='featured-platform-reviews'),

    # ── Invitation par lien (public GET, auth POST) ──
    path('clubs/join/<uuid:token>/', views.ClubJoinByLinkView.as_view(), name='club-join-by-link'),

    # ── Router (lists, posts, clubs) ──
    path('', include(router.urls)),
]
