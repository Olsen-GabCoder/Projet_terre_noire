import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';
import PageHero from '../components/PageHero';
import '../styles/Login.css';
import SEO from '../components/SEO';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyTotp, isAuthenticated, loading: authLoading } = useAuth();

  // États
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA
  const [totpStep, setTotpStep] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Gestion du retour OAuth (erreur uniquement — le succès passe par la page d'accueil)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('oauth') === 'error') {
      setError(t('login.errorOAuth'));
    }
  }, [location.search]);

  // Redirection si déjà connecté (ou après succès OAuth)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
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

  // Soumission login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError(t('login.errorEmpty'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password, rememberMe);

      if (result.success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else if (result.totpRequired) {
        // 2FA requise — passer à l'étape code TOTP
        setChallengeToken(result.challengeToken);
        setTotpStep(true);
      } else {
        if (typeof result.error === 'object' && result.error.detail) {
          setError(result.error.detail);
        } else if (result.error) {
          setError(t('login.errorInvalid'));
        } else {
          setError(t('login.errorGeneric'));
        }
      }
    } catch (err) {
      setError(t('login.errorServer'));
    } finally {
      setIsLoading(false);
    }
  };

  // Soumission code 2FA
  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    if (!totpCode.trim()) { setError(t('login.errorTotpEmpty')); return; }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyTotp(challengeToken, totpCode.trim());
      if (result.success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.error || t('login.errorTotpInvalid'));
      }
    } catch {
      setError(t('login.errorTotpVerify'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <SEO title={t('login.pageTitle')} />
      {/* ── HERO ── */}
      <PageHero
        title={t('login.heroTitle')}
        subtitle={t('login.heroSubtitle')}
        pill={t('login.heroPill')}
        icon="fas fa-key"
        orbCount={3}
        hasShine
        className="login-hero"
      />

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
                {t('login.secureLogin')}
              </span>
            </div>
            {error && (
              <div className="login-alert login-alert-error" aria-live="polite">
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}

            {!totpStep ? (
              <>
                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-field">
                    <label htmlFor="email">{t('login.emailLabel')}</label>
                    <div className="login-input-wrap">
                      <i className="fas fa-envelope login-input-ico" />
                      <input
                        type="text"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="login-input"
                        placeholder={t('login.emailPlaceholder')}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="password">{t('login.passwordLabel')}</label>
                    <div className="login-input-wrap login-input-wrap--pwd">
                      <i className="fas fa-lock login-input-ico" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="login-input"
                        placeholder={t('login.passwordPlaceholder')}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="login-pwd-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="login-options">
                    <label className="login-remember">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                      />
                      <span>{t('login.rememberMe')}</span>
                    </label>
                    <Link to="/forgot-password" className="login-forgot">
                      <i className="fas fa-question-circle" />
                      {t('login.forgotPassword')}
                    </Link>
                  </div>

                  <button type="submit" className="login-btn login-btn-submit" disabled={isLoading}>
                    {isLoading
                      ? <><i className="fas fa-spinner fa-spin" /> {t('login.submitting')}</>
                      : <><i className="fas fa-sign-in-alt" /> {t('login.submit')}</>}
                  </button>
                </form>

                <SocialLoginButtons />

                <div className="login-footer">
                  <p>{t('login.noAccount')}{' '}<Link to="/register" className="login-link">{t('login.signUp')}</Link></p>
                </div>
              </>
            ) : (
              <form onSubmit={handleTotpSubmit} className="login-form">
                <div className="login-totp-header">
                  <div className="login-totp-icon"><i className="fas fa-shield-halved" /></div>
                  <h3>{t('login.totpTitle')}</h3>
                  <p>{t('login.totpSubtitle')}</p>
                </div>

                <div className="login-field">
                  <label htmlFor="totp-code">{t('login.totpLabel')}</label>
                  <div className="login-input-wrap">
                    <i className="fas fa-key login-input-ico" />
                    <input
                      type="text"
                      id="totp-code"
                      value={totpCode}
                      onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '')); if (error) setError(''); }}
                      className="login-input"
                      placeholder="000000"
                      maxLength={6}
                      autoComplete="one-time-code"
                      autoFocus
                      disabled={isLoading}
                      style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.3rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn login-btn-submit" disabled={isLoading || totpCode.length < 6}>
                  {isLoading
                    ? <><i className="fas fa-spinner fa-spin" /> {t('login.totpSubmitting')}</>
                    : <><i className="fas fa-check" /> {t('login.totpSubmit')}</>}
                </button>

                <button type="button" className="login-btn login-btn-back"
                  onClick={() => { setTotpStep(false); setChallengeToken(''); setTotpCode(''); setError(''); }}>
                  <i className="fas fa-arrow-left" /> {t('login.totpBack')}
                </button>

                <p className="login-totp-hint">
                  <i className="fas fa-info-circle" /> {t('login.totpHint')}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="login-footer-fade" />
    </div>
  );
};

export default Login;