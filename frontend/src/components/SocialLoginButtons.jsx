import { useState, useEffect } from 'react';
import api from '../services/api';

// Les liens OAuth doivent pointer vers le backend directement (pas via proxy AJAX)
// car c'est un redirect navigateur, pas un appel AJAX
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SocialLoginButtons = () => {
  const [providers, setProviders] = useState({ google: false, facebook: false });

  useEffect(() => {
    api.get('/users/oauth/providers/')
      .then((res) => setProviders(res.data))
      .catch(() => {});
  }, []);

  if (!providers.google && !providers.facebook) return null;

  return (
    <div className="social-login">
      <div className="social-login__divider">
        <span>ou</span>
      </div>

      <div className="social-login__buttons">
        {providers.google && (
          <a
            href={`${API_BASE}/users/oauth/google/`}
            className="social-login__btn social-login__btn--google"
          >
            <img src="/images/logo_google.png" alt="" className="social-login__icon" />
            <span>Continuer avec Google</span>
          </a>
        )}

        {providers.facebook && (
          <a
            href={`${API_BASE}/users/oauth/facebook/`}
            className="social-login__btn social-login__btn--facebook"
          >
            <img src="/images/logo_fbk.png" alt="" className="social-login__icon" />
            <span>Continuer avec Facebook</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
