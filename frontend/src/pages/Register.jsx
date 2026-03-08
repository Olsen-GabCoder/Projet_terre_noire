import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Register.css';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      errors.username = 'Minimum 3 caractères';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Lettres, chiffres et underscore seulement';
    }

    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Minimum 8 caractères';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmez le mot de passe';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!formData.first_name.trim()) {
      errors.first_name = 'Le prénom est requis';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Le nom est requis';
    }

    if (formData.phone_number.trim() && !/^\+?[0-9\s\-()]+$/.test(formData.phone_number)) {
      errors.phone_number = 'Format invalide';
    }

    if (!termsAccepted) {
      errors.terms = 'Vous devez accepter les conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirm: formData.confirmPassword,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim() || '',
      };

      const result = await register(registrationData);

      if (result.success) {
        navigate('/', {
          replace: true,
          state: { message: 'Inscription réussie ! Bienvenue.' },
        });
      } else {
        if (typeof result.error === 'object') {
          const apiErrors = {};
          Object.keys(result.error).forEach((key) => {
            apiErrors[key] = Array.isArray(result.error[key])
              ? result.error[key][0]
              : result.error[key];
          });
          setFieldErrors(apiErrors);
          setError('Veuillez corriger les erreurs');
        } else {
          setError(result.error || "Erreur lors de l'inscription");
        }
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reg-page">
      {/* ── HERO ── */}
      <section className="reg-hero">
        <div className="reg-hero__orb reg-hero__orb--1" />
        <div className="reg-hero__orb reg-hero__orb--2" />
        <div className="reg-hero__orb reg-hero__orb--3" />
        <div className="reg-hero__grid-bg" />
        <div className="reg-hero__shine" />

        <div className="reg-hero__inner">
          <span className="reg-hero__pill">Rejoignez-nous</span>
          <div className="reg-hero__line" />
          <div className="reg-hero__icon">
            <i className="fas fa-user-plus" />
          </div>
          <h1 className="reg-hero__title">
            <span className="reg-hero__title-main">Créer un compte</span>
          </h1>
          <p className="reg-hero__sub">
            Rejoignez notre communauté d'auteurs et de lecteurs — commandez en toute simplicité,
            soumettez vos manuscrits et accédez à votre espace personnel.
          </p>
        </div>
      </section>

      <div className="reg-hero-fade" />

      {/* ── CONTENU ── */}
      <div className="reg-content">
        <div className="reg-content__bg">
          <div className="reg-content__orb reg-content__orb--1" />
          <div className="reg-content__orb reg-content__orb--2" />
        </div>

        <div className="reg-wrap">
          <div className="reg-card">
            <div className="reg-card__header">
              <span className="reg-card__trust">
                <i className="fas fa-shield-halved" />
                Inscription sécurisée
              </span>
            </div>

            {error && (
              <div className="reg-alert reg-alert-error">
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}

            {location.state?.message && (
              <div className="reg-alert reg-alert-success">
                <i className="fas fa-check-circle" />
                <span>{location.state.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="reg-form">
              <div className="reg-row">
                <div className="reg-field">
                  <label htmlFor="username">Nom d'utilisateur *</label>
                  <div className={`reg-input-wrap ${fieldErrors.username ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder="johndoe"
                      autoComplete="username"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.username && <span className="reg-err">{fieldErrors.username}</span>}
                </div>

                <div className="reg-field">
                  <label htmlFor="email">Email *</label>
                  <div className={`reg-input-wrap ${fieldErrors.email ? 'has-error' : ''}`}>
                    <i className="fas fa-envelope reg-input-ico" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder="exemple@email.com"
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && <span className="reg-err">{fieldErrors.email}</span>}
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field">
                  <label htmlFor="first_name">Prénom *</label>
                  <div className={`reg-input-wrap ${fieldErrors.first_name ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder="Jean"
                      autoComplete="given-name"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.first_name && <span className="reg-err">{fieldErrors.first_name}</span>}
                </div>

                <div className="reg-field">
                  <label htmlFor="last_name">Nom *</label>
                  <div className={`reg-input-wrap ${fieldErrors.last_name ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder="Dupont"
                      autoComplete="family-name"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.last_name && <span className="reg-err">{fieldErrors.last_name}</span>}
                </div>
              </div>

              <div className="reg-field">
                <label htmlFor="phone_number">Téléphone <span className="reg-opt">(optionnel)</span></label>
                <div className={`reg-input-wrap ${fieldErrors.phone_number ? 'has-error' : ''}`}>
                  <i className="fas fa-phone reg-input-ico" />
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="reg-input"
                    placeholder="+241 XX XXX XXXX"
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors.phone_number && <span className="reg-err">{fieldErrors.phone_number}</span>}
              </div>

              <div className="reg-field">
                <label htmlFor="password">Mot de passe *</label>
                <div className={`reg-input-wrap reg-input-wrap--pwd ${fieldErrors.password ? 'has-error' : ''}`}>
                  <i className="fas fa-lock reg-input-ico" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="reg-input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="reg-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
                {fieldErrors.password && <span className="reg-err">{fieldErrors.password}</span>}
              </div>

              <div className="reg-field">
                <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
                <div className={`reg-input-wrap reg-input-wrap--pwd ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <i className="fas fa-lock reg-input-ico" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="reg-input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="reg-pwd-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                  >
                    <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="reg-err">{fieldErrors.confirmPassword}</span>}
                {formData.password && formData.confirmPassword && (
                  <span className={`reg-match ${formData.password === formData.confirmPassword ? 'ok' : 'err'}`}>
                    <i className={`fas fa-${formData.password === formData.confirmPassword ? 'check-circle' : 'times-circle'}`} />
                    {formData.password === formData.confirmPassword ? 'Correspond' : 'Ne correspond pas'}
                  </span>
                )}
              </div>

              <div className="reg-field">
                <label className="reg-checkbox">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>
                    J'accepte les{' '}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer">conditions</Link>
                    {' '}et la{' '}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</Link>
                  </span>
                </label>
                {fieldErrors.terms && <span className="reg-err">{fieldErrors.terms}</span>}
              </div>

              <button type="submit" className="reg-btn reg-btn-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    Inscription...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus" />
                    Créer mon compte
                  </>
                )}
              </button>
            </form>

            <div className="reg-footer">
              <p>
                Vous avez déjà un compte ?{' '}
                <Link to="/login" className="reg-link">Se connecter</Link>
              </p>
              <Link to="/" className="reg-back">
                <i className="fas fa-arrow-left" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="reg-footer-fade" />
    </div>
  );
};

export default Register;
