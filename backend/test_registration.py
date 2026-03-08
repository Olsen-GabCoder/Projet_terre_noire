"""
Script de test pour l'inscription d'utilisateurs.
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_registration():
    print("🧪 Test d'inscription...")
    
    # Données de test
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePass123!",
        "password_confirm": "SecurePass123!",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+243123456789"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/register/",
            json=user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status: {response.status_code}")
        print(f"📦 Headers: {response.headers}")
        
        if response.status_code in [200, 201]:
            print("✅ Inscription réussie!")
            print(f"📝 Réponse: {response.text}")
        else:
            print("❌ Erreur d'inscription")
            print(f"📝 Réponse: {response.text}")
            
            # Afficher les erreurs de validation
            try:
                errors = response.json()
                print("🔍 Détails des erreurs:")
                for field, message in errors.items():
                    print(f"  - {field}: {message}")
            except:
                print(f"📝 Réponse brute: {response.text}")
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

def test_login():
    print("\n🧪 Test de connexion...")
    
    # Test avec username
    credentials = {
        "username": "testuser",
        "password": "SecurePass123!"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/token/",
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Connexion réussie!")
            print(f"🔑 Access Token: {data.get('access')[:50]}...")
            print(f"🔄 Refresh Token: {data.get('refresh')[:50]}...")
        else:
            print("❌ Erreur de connexion")
            print(f"📝 Réponse: {response.text}")
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    test_registration()
    test_login()