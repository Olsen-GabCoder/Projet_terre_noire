from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.books.models import Book


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PAID', 'Payé'),
        ('SHIPPED', 'Expédié'),
        ('CANCELLED', 'Annulé'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    shipping_address = models.TextField()
    shipping_phone = models.CharField(max_length=20)
    shipping_city = models.CharField(max_length=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Commande #{self.id} - {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    book = models.ForeignKey(Book, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    def __str__(self):
        return f"{self.book.title} x{self.quantity}"


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ('MOBICASH', 'Mobicash'),
        ('AIRTEL', 'Airtel Money'),
        ('CASH', 'Espèces'),
        ('VISA', 'Carte Visa'),
    ]
    
    STATUS_CHOICES = [
        ('SUCCESS', 'Réussi'),
        ('FAILED', 'Échoué'),
        ('PENDING', 'En attente'),
    ]
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    transaction_id = models.CharField(max_length=100, unique=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Paiement {self.transaction_id} - {self.status}"