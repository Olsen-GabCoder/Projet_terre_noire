"""
Script pour tester l'API des livres.
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_endpoints():
    print("🧪 Test des endpoints livres...")
    
    endpoints = [
        ("📚 Liste des livres", "/books/"),
        ("⭐ Livres featured", "/books/featured/"),
        ("🆕 Nouveautés", "/books/new-releases/"),
        ("📊 Statistiques", "/books/statistics/"),
        ("👤 Liste des auteurs", "/authors/"),
        ("🏷️  Liste des catégories", "/categories/"),
    ]
    
    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            print(f"{name}: Status {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   Résultats: {len(data)} éléments")
                elif isinstance(data, dict):
                    if 'count' in data:
                        print(f"   Résultats: {data['count']} éléments")
                    else:
                        print(f"   Réponse: {len(str(data))} caractères")
            else:
                print(f"   Erreur: {response.text[:100]}...")
                
        except Exception as e:
            print(f"{name}: ❌ Erreur - {e}")

def test_specific_book():
    print("\n📖 Test d'un livre spécifique...")
    
    # D'abord, obtenir un livre
    try:
        response = requests.get(f"{BASE_URL}/books/", timeout=5)
        if response.status_code == 200:
            books = response.json()
            if 'results' in books and books['results']:
                first_book = books['results'][0]
                book_id = first_book['id']
                
                # Tester le détail du livre
                response = requests.get(f"{BASE_URL}/books/{book_id}/", timeout=5)
                print(f"Détail livre {book_id}: Status {response.status_code}")
                
                if response.status_code == 200:
                    book_data = response.json()
                    print(f"   Titre: {book_data.get('title', 'N/A')}")
                    print(f"   Prix: {book_data.get('price', 'N/A')} FCFA")
                    print(f"   Auteur: {book_data.get('author', {}).get('full_name', 'N/A')}")
                else:
                    print(f"   Erreur: {response.text}")
            else:
                print("   Aucun livre trouvé")
        else:
            print(f"   Erreur liste: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")

def test_filters():
    print("\n🔍 Test des filtres...")
    
    filters = [
        ("Disponibles", "available=true"),
        ("Ebooks", "format=EBOOK"),
        ("Livres papier", "format=PAPIER"),
    ]
    
    for name, query in filters:
        try:
            response = requests.get(f"{BASE_URL}/books/?{query}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                count = data.get('count', 0)
                print(f"{name}: {count} résultats")
            else:
                print(f"{name}: Erreur {response.status_code}")
        except Exception as e:
            print(f"{name}: ❌ Erreur - {e}")

if __name__ == "__main__":
    test_endpoints()
    test_specific_book()
    test_filters()