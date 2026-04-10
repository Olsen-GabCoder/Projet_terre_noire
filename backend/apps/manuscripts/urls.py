from django.urls import path
from .views import (
    ManuscriptCreateView,
    ManuscriptListView,
    ManuscriptDetailView,
    ManuscriptDownloadView,
    ManuscriptStatusUpdateView,
    MyManuscriptsView,
    MyManuscriptDetailView,
    OpenMarketLockView,
    OpenMarketUnlockView,
)
from apps.organizations.views import ManuscriptRecommendationsView

app_name = 'manuscripts'

urlpatterns = [
    path('submit/', ManuscriptCreateView.as_view(), name='manuscript_submit'),
    path('recommendations/', ManuscriptRecommendationsView.as_view(), name='manuscript_recommendations'),
    path('mine/', MyManuscriptsView.as_view(), name='my_manuscripts'),
    path('mine/<int:pk>/', MyManuscriptDetailView.as_view(), name='my_manuscript_detail'),
    path('mine/<int:pk>/lock-market/', OpenMarketLockView.as_view(), name='open_market_lock'),
    path('mine/<int:pk>/unlock-market/', OpenMarketUnlockView.as_view(), name='open_market_unlock'),
    path('', ManuscriptListView.as_view(), name='manuscript_list'),
    path('<int:pk>/', ManuscriptDetailView.as_view(), name='manuscript_detail'),
    path('<int:pk>/download/', ManuscriptDownloadView.as_view(), name='manuscript_download'),
    path('<int:pk>/update-status/', ManuscriptStatusUpdateView.as_view(), name='manuscript_update_status'),
]
