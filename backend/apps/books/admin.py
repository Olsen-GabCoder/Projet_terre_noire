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
    list_display = ['title', 'author', 'category', 'price', 'format', 'available', 'created_at']
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ['title', 'reference', 'author__full_name']
    list_filter = ['format', 'available', 'category', 'created_at']
    list_editable = ['available']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['category', 'author']  # Sélection par liste déroulante avec recherche
    fieldsets = (
        ('Informations générales', {
            'fields': ('title', 'slug', 'author', 'category', 'reference', 'format', 'description'),
        }),
        ('Prix et disponibilité', {
            'fields': ('price', 'original_price', 'available', 'is_bestseller'),
        }),
        ('Image et notation', {
            'fields': ('cover_image', 'back_cover_image', 'rating', 'rating_count'),
        }),
        ('Ebook / PDF', {
            'fields': ('pdf_file',),
            'description': 'Fichier PDF pour lecture en ligne ou achat ebook.',
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(BookReview)
class BookReviewAdmin(admin.ModelAdmin):
    list_display = ['book', 'user', 'parent', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['book__title', 'user__username', 'comment']


@admin.register(ReviewLike)
class ReviewLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'review', 'created_at']
    list_filter = ['created_at']

