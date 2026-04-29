from django.urls import path
from . import views

app_name = 'ai'

urlpatterns = [
    # Quota
    path('quota/', views.QuotaView.as_view(), name='quota'),

    # Phase 2 — Fiches livres & Éditorial
    path('categorize/', views.CategorizeBookView.as_view(), name='categorize'),
    path('generate-description/', views.GenerateDescriptionView.as_view(), name='generate-description'),
    path('generate-back-cover/', views.GenerateBackCoverView.as_view(), name='generate-back-cover'),
    path('summarize-book/', views.SummarizeBookView.as_view(), name='summarize-book'),
    path('synthesize-reviews/', views.SynthesizeReviewsView.as_view(), name='synthesize-reviews'),
    path('analyze-manuscript/', views.AnalyzeManuscriptView.as_view(), name='analyze-manuscript'),

    # Phase 3 — Recherche & Recommandations
    path('semantic-search/', views.SemanticSearchView.as_view(), name='semantic-search'),
    path('recommend/', views.RecommendBooksView.as_view(), name='recommend'),
    path('cross-sell/', views.CrossSellView.as_view(), name='cross-sell'),

    # Phase 4 — Clubs & Social
    path('moderate/', views.ModerateMessageView.as_view(), name='moderate'),
    path('summarize-discussion/', views.SummarizeDiscussionView.as_view(), name='summarize-discussion'),
    path('discussion-questions/', views.DiscussionQuestionsView.as_view(), name='discussion-questions'),
    path('detect-spoiler/', views.DetectSpoilerView.as_view(), name='detect-spoiler'),

    # Phase 4b — Clubs (séance & membres)
    path('summarize-meeting/', views.SummarizeMeetingView.as_view(), name='summarize-meeting'),
    path('detect-inactive/', views.DetectInactiveMembersView.as_view(), name='detect-inactive'),

    # Phase 4c — Manuscrits
    path('recommend-publishers/', views.RecommendPublishersView.as_view(), name='recommend-publishers'),
    path('similar-manuscripts/', views.SimilarManuscriptsView.as_view(), name='similar-manuscripts'),
    path('estimate-quote/', views.EstimateQuoteView.as_view(), name='estimate-quote'),

    # Phase 5b — Vendeur
    path('vendor-trends/', views.AnalyzeVendorTrendsView.as_view(), name='vendor-trends'),

    # Phase 5 — Commerce & Bibliothèque
    path('predict-stock/', views.PredictStockView.as_view(), name='predict-stock'),
    path('library-acquisitions/', views.SuggestLibraryAcquisitionsView.as_view(), name='library-acquisitions'),
    path('library-recommend/', views.LibraryRecommendView.as_view(), name='library-recommend'),
    path('predict-late-return/', views.PredictLateReturnView.as_view(), name='predict-late-return'),
    path('suggest-price/', views.SuggestPriceView.as_view(), name='suggest-price'),

    # Phase 5c — Social & Marketing
    path('recommend-clubs/', views.RecommendClubsView.as_view(), name='recommend-clubs'),
    path('smart-coupon-targeting/', views.SmartCouponTargetingView.as_view(), name='smart-coupon-targeting'),

    # Phase 5d — Auteurs
    path('suggest-authors/', views.SuggestAuthorsView.as_view(), name='suggest-authors'),

    # Phase 6 — Assistant global & Personnalisation
    path('activity-summary/', views.ActivitySummaryView.as_view(), name='activity-summary'),
    path('dashboard-help/', views.DashboardHelpView.as_view(), name='dashboard-help'),
    path('personalized-newsletter/', views.PersonalizedNewsletterView.as_view(), name='personalized-newsletter'),
    path('wishlist-alerts/', views.WishlistAlertView.as_view(), name='wishlist-alerts'),
    path('chatbot/', views.ChatbotView.as_view(), name='chatbot'),
    path('classify-contact/', views.ClassifyContactView.as_view(), name='classify-contact'),
    path('generate-bio/', views.GenerateBioView.as_view(), name='generate-bio'),
]
