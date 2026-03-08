import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css'; 

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // États
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirection si déjà connecté
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Rediriger vers la page d'où on vient, ou l'accueil par défaut
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // Effacer l'erreur quand l'utilisateur tape
  };

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Appel au contexte d'authentification
      // Note: On passe 'email' comme premier argument car notre backend
      // custom (EmailTokenObtainPairView) gère la détection email/username
      const result = await login(formData.email, formData.password);

      if (result.success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        // Gestion des erreurs spécifiques
        if (typeof result.error === 'object' && result.error.detail) {
          setError(result.error.detail);
        } else if (result.error) {
          setError("Email ou mot de passe incorrect.");
        } else {
          setError("Une erreur est survenue.");
        }
      }
    } catch (err) {
      console.error("Erreur Login Page:", err);
      setError("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── HERO ── */}
      <section className="login-hero">
        <div className="login-hero__orb login-hero__orb--1" />
        <div className="login-hero__orb login-hero__orb--2" />
        <div className="login-hero__orb login-hero__orb--3" />
        <div className="login-hero__grid-bg" />
        <div className="login-hero__shine" />

        <div className="login-hero__inner">
          <span className="login-hero__pill">Bienvenue</span>
          <div className="login-hero__line" />
          <div className="login-hero__icon">
            <i className="fas fa-key" />
          </div>
          <h1 className="login-hero__title">
            <span className="login-hero__title-main">Connexion</span>
          </h1>
          <p className="login-hero__sub">
            Accédez à votre espace pour gérer vos commandes, suivre vos manuscrits
            et retrouver votre bibliothèque.
          </p>
        </div>
      </section>

      <div className="login-hero-fade" />

      {/* ── CONTENU ── */}
      <div className="login-content">
        <div className="login-content__bg">
          <div className="login-content__orb login-content__orb--1" />
          <div className="login-content__orb login-content__orb--2" />
        </div>

        <div className="login-wrap">
          <div className="login-card">
            <div className="login-card__header">
              <span className="login-card__trust">
                <i className="fas fa-shield-halved" />
                Connexion sécurisée
              </span>
            </div>
            {error && (
              <div className="login-alert login-alert-error">
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Email ou Nom d'utilisateur</label>
                <div className="login-input-wrap">
                  <i className="fas fa-envelope login-input-ico" />
                  <input
                    type="text"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="votre@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Mot de passe</label>
                <div className="login-input-wrap login-input-wrap--pwd">
                  <i className="fas fa-lock login-input-ico" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="login-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
              </div>

              <div className="login-options">
                <Link to="/forgot-password" className="login-forgot">
                  <i className="fas fa-question-circle" />
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                className="login-btn login-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>
                Pas encore de compte ?{' '}
                <Link to="/register" className="login-link">
                  S'inscrire
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-footer-fade" />
    </div>
  );
};

export default Login;