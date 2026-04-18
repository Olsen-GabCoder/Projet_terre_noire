from django.urls import path
from .views import NewsletterSubscribeView, NewsletterConfirmView, NewsletterUnsubscribeView

app_name = 'newsletter'

urlpatterns = [
    path('subscribe/', NewsletterSubscribeView.as_view(), name='subscribe'),
    path('confirm/<uuid:token>/', NewsletterConfirmView.as_view(), name='confirm'),
    path('unsubscribe/', NewsletterUnsubscribeView.as_view(), name='unsubscribe'),
]
