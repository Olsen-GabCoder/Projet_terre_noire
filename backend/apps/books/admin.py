from django.contrib import admin
from .models import Category, Author, Book, BookReview, ReviewLike


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('full_name',)}
    search_fields = ['full_name']
    list_filter = ['created_at']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'price', 'format', 'available', 'is_featured', 'is_bestseller', 'popularity_score', 'created_at']
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ['title', 'reference', 'author__full_name']
    list_filter = ['format', 'available', 'is_featured', 'is_bestseller', 'category', 'created_at']
    list_editable = ['available', 'is_featured', 'is_bestseller']
    readonly_fields = ['created_at', 'updated_at', 'popularity_score', 'trending_score']
    autocomplete_fields = ['category', 'author']
    actions = ['mark_featured', 'unmark_featured']
    fieldsets = (
        ('Informations generales', {
            'fields': ('title', 'slug', 'author', 'category', 'reference', 'format', 'description', 'published_date'),
        }),
        ('Prix et disponibilite', {
            'fields': ('price', 'original_price', 'available', 'is_bestseller', 'is_featured'),
        }),
        ('Image et notation', {
            'fields': ('cover_image', 'back_cover_image', 'rating', 'rating_count'),
        }),
        ('Ebook / PDF', {
            'fields': ('pdf_file',),
            'description': 'Fichier PDF pour lecture en ligne ou achat ebook.',
        }),
        ('Scores (calcules automatiquement)', {
            'fields': ('popularity_score', 'trending_score'),
            'classes': ('collapse',),
        }),
        ('Metadonnees', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.action(description="Marquer comme Selection de la maison")
    def mark_featured(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description="Retirer de la Selection de la maison")
    def unmark_featured(self, request, queryset):
        queryset.update(is_featured=False)


@admin.register(BookReview)
class BookReviewAdmin(admin.ModelAdmin):
    list_display = ['book', 'user', 'parent', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['book__title', 'user__username', 'comment']


@admin.register(ReviewLike)
class ReviewLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'review', 'created_at']
    list_filter = ['created_at']