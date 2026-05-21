from django.urls import path
from .views import ContactSubmitView, ContactMessagesView, ContactMessageDetailView

app_name = 'contact'

urlpatterns = [
    path('submit/', ContactSubmitView.as_view(), name='submit'),
    path('messages/', ContactMessagesView.as_view(), name='messages-list'),
    path('messages/<int:pk>/', ContactMessageDetailView.as_view(), name='message-detail'),
]
