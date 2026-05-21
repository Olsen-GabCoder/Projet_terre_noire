from django.urls import path
from .views import (
    NewsletterSubscribeView, NewsletterConfirmView, NewsletterUnsubscribeView,
    NewsletterStatsView, NewsletterSubscribersListView,
)

app_name = 'newsletter'

urlpatterns = [
    path('subscribe/', NewsletterSubscribeView.as_view(), name='subscribe'),
    path('confirm/<str:token>/', NewsletterConfirmView.as_view(), name='confirm'),
    path('unsubscribe/<str:token>/', NewsletterUnsubscribeView.as_view(), name='unsubscribe'),
    path('stats/', NewsletterStatsView.as_view(), name='stats'),
    path('subscribers/', NewsletterSubscribersListView.as_view(), name='subscribers-list'),
    path('subscribers/<int:pk>/', NewsletterSubscribersListView.as_view(), name='subscribers-delete'),
]
