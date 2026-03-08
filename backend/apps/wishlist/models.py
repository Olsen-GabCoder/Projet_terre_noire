from django.db import models
from django.conf import settings


class WishlistItem(models.Model):
    """Livre dans la liste d'envie d'un utilisateur."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items'
    )
    book = models.ForeignKey(
        'books.Book',
        on_delete=models.CASCADE,
        related_name='wishlist_users'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Élément liste d'envie"
        verbose_name_plural = "Éléments liste d'envie"
        unique_together = [['user', 'book']]
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.email} — {self.book.title}"
