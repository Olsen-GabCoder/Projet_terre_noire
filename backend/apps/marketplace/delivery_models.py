"""
Tarifs de livraison — Chaque livreur définit ses propres zones et prix.
"""
from django.db import models
from django.core.validators import MinValueValidator


CURRENCY_CHOICES = [
    ('XAF', 'FCFA (CEMAC)'),
    ('XOF', 'FCFA (UEMOA)'),
    ('NGN', 'Naira nigérian'),
    ('KES', 'Shilling kényan'),
    ('GHS', 'Cedi ghanéen'),
    ('ZAR', 'Rand sud-africain'),
    ('MAD', 'Dirham marocain'),
    ('EGP', 'Livre égyptienne'),
    ('RWF', 'Franc rwandais'),
    ('TZS', 'Shilling tanzanien'),
    ('UGX', 'Shilling ougandais'),
    ('ETB', 'Birr éthiopien'),
    ('CDF', 'Franc congolais'),
    ('AOA', 'Kwanza angolais'),
    ('MZN', 'Metical mozambicain'),
    ('USD', 'Dollar US'),
    ('EUR', 'Euro'),
]

COUNTRY_CHOICES = [
    ('GA', 'Gabon'), ('CM', 'Cameroun'), ('SN', 'Sénégal'), ('CI', "Côte d'Ivoire"),
    ('CD', 'RD Congo'), ('CG', 'Congo'), ('BF', 'Burkina Faso'), ('ML', 'Mali'),
    ('GN', 'Guinée'), ('NE', 'Niger'), ('TD', 'Tchad'), ('BJ', 'Bénin'),
    ('TG', 'Togo'), ('MR', 'Mauritanie'), ('GQ', 'Guinée équatoriale'),
    ('CF', 'Centrafrique'), ('NG', 'Nigeria'), ('GH', 'Ghana'),
    ('KE', 'Kenya'), ('TZ', 'Tanzanie'), ('UG', 'Ouganda'), ('RW', 'Rwanda'),
    ('ET', 'Éthiopie'), ('ZA', 'Afrique du Sud'), ('MA', 'Maroc'),
    ('TN', 'Tunisie'), ('DZ', 'Algérie'), ('EG', 'Égypte'),
    ('MG', 'Madagascar'), ('AO', 'Angola'), ('MZ', 'Mozambique'),
    ('ZW', 'Zimbabwe'), ('ZM', 'Zambie'), ('MW', 'Malawi'),
    ('SL', 'Sierra Leone'), ('LR', 'Liberia'), ('GM', 'Gambie'),
    ('GW', 'Guinée-Bissau'), ('CV', 'Cap-Vert'), ('ST', 'São Tomé-et-Príncipe'),
    ('BI', 'Burundi'), ('DJ', 'Djibouti'), ('ER', 'Érythrée'),
    ('SO', 'Somalie'), ('SS', 'Soudan du Sud'), ('SD', 'Soudan'),
    ('LY', 'Libye'), ('LS', 'Lesotho'), ('SZ', 'Eswatini'),
    ('BW', 'Botswana'), ('NA', 'Namibie'), ('MU', 'Maurice'),
    ('SC', 'Seychelles'), ('KM', 'Comores'),
]

# Villes principales par pays (les plus grandes)
CITIES_BY_COUNTRY = {
    'GA': ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda', 'Mouila', 'Lambaréné', 'Tchibanga', 'Koulamoutou', 'Makokou', 'Bitam', 'Ntoum', 'Owendo', 'Akanda', 'Mounana'],
    'CM': ['Douala', 'Yaoundé', 'Garoua', 'Bamenda', 'Maroua', 'Bafoussam', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbe', 'Buea', 'Kumba'],
    'SN': ['Dakar', 'Thiès', 'Rufisque', 'Kaolack', 'Saint-Louis', 'Ziguinchor', 'Touba', 'Mbour', 'Tambacounda', 'Louga'],
    'CI': ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa'],
    'CD': ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma', 'Bukavu', 'Kananga', 'Matadi'],
    'CG': ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Owando'],
    'NG': ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Enugu'],
    'GH': ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Sunyani'],
    'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'],
    'TZ': ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Zanzibar', 'Mbeya'],
    'RW': ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi'],
    'ZA': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'],
    'MA': ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda'],
    'ET': ['Addis-Abeba', 'Dire Dawa', 'Mekelle', 'Adama', 'Gondar', 'Hawassa'],
    'EG': ['Le Caire', 'Alexandrie', 'Gizeh', 'Louxor', 'Assouan'],
    'BF': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora'],
    'ML': ['Bamako', 'Sikasso', 'Mopti', 'Ségou', 'Kayes', 'Tombouctou'],
    'GN': ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé'],
    'BJ': ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi'],
    'TG': ['Lomé', 'Sokodé', 'Kara', 'Kpalimé'],
    'NE': ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua'],
    'TD': ['N\'Djamena', 'Moundou', 'Abéché', 'Sarh'],
    'UG': ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Entebbe'],
    'MG': ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga', 'Fianarantsoa'],
}


class DeliveryRate(models.Model):
    """Tarif de livraison défini par un livreur pour une zone géographique."""
    agent = models.ForeignKey(
        'users.UserProfile', on_delete=models.CASCADE,
        related_name='delivery_rates',
        limit_choices_to={'profile_type': 'LIVREUR'},
        verbose_name="Livreur",
    )
    zone_name = models.CharField(max_length=100, verbose_name="Nom de la zone")
    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, verbose_name="Pays")
    cities = models.JSONField(default=list, verbose_name="Villes couvertes")
    price = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Tarif de livraison",
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='XAF', verbose_name="Devise")
    estimated_days_min = models.PositiveIntegerField(default=1, verbose_name="Délai min (jours)")
    estimated_days_max = models.PositiveIntegerField(default=3, verbose_name="Délai max (jours)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tarif de livraison"
        verbose_name_plural = "Tarifs de livraison"
        ordering = ['price']

    def __str__(self):
        return f"{self.agent.user.get_full_name()} — {self.zone_name} : {self.price} {self.currency}"

    @classmethod
    def find_for_city(cls, city, country=None):
        """Trouve tous les tarifs actifs couvrant une ville donnée."""
        if not city:
            return cls.objects.none()
        city_lower = city.strip().lower()
        qs = cls.objects.filter(is_active=True).select_related('agent__user')
        results = []
        for rate in qs:
            if country and rate.country != country:
                continue
            if any(c.strip().lower() == city_lower for c in (rate.cities or [])):
                results.append(rate.pk)
        return cls.objects.filter(pk__in=results).select_related('agent__user')
