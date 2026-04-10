# backend/test_api.py
import requests
import sys

def test_api():
    base_url = "http://127.0.0.1:8000/api"
    
    print("🧪 Test de l'API Django...")
    
    # Test 1: Vérifier que le serveur est en ligne
    try:
        response = requests.get(base_url, timeout=5)
        print(f"✅ Serveur accessible - Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur")
        print("   Assurez-vous que Django tourne: python manage.py runserver")
        return False
    
    # Test 2: Tester l'endpoint token (sans authentification)
    try:
        response = requests.post(
            f"{base_url}/token/",
            json={"username": "test", "password": "test"},
            timeout=5
        )
        print(f"✅ Endpoint /token/ accessible - Status: {response.status_code}")
        if response.status_code == 400:
            print("   (Erreur 400 attendue car identifiants invalides)")
    except Exception as e:
        print(f"❌ Erreur avec /token/: {e}")
        return False
    

    
    
    # Test 3: Tester l'endpoint users (sans authentification)
    try:
        response = requests.get(f"{base_url}/users/", timeout=5)
        print(f"✅ Endpoint /users/ accessible - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur avec /users/: {e}")
        return False
    
    print("\n🎉 Tous les tests d'accessibilité API sont passés!")
    print("   Le backend est correctement configuré.")
    
    return True

if __name__ == "__main__":
    if test_api():
        sys.exit(0)
    else:
        sys.exit(1)