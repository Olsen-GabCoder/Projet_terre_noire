"""Tests pour l'app manuscripts."""
from rest_framework.test import APITestCase
from rest_framework import status


class ManuscriptSubmitTest(APITestCase):
    """Tests de soumission de manuscrit."""

    def test_submit_missing_file(self):
        """Soumission sans fichier doit échouer."""
        response = self.client.post('/api/manuscripts/submit/', {
            'title': 'Mon Roman',
            'author_name': 'Auteur',
            'email': 'auteur@example.com',
            'genre': 'ROMAN',
            'language': 'FR',
            'description': 'Description du manuscrit',
            'terms_accepted': True,
        })
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY])
