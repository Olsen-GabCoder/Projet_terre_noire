from django.urls import path
from .views import (
    ManuscriptCreateView, 
    ManuscriptListView, 
    ManuscriptDetailView,
    ManuscriptStatusUpdateView
)

app_name = 'manuscripts'

urlpatterns = [
    path('submit/', ManuscriptCreateView.as_view(), name='manuscript_submit'),
    path('', ManuscriptListView.as_view(), name='manuscript_list'),
    path('<int:pk>/', ManuscriptDetailView.as_view(), name='manuscript_detail'),
    path('<int:pk>/update-status/', ManuscriptStatusUpdateView.as_view(), name='manuscript_update_status'),
]