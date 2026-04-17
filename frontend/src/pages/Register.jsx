import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import PageHero from '../components/PageHero';
import '../styles/Register.css';
import SEO from '../components/SEO';

const Register = () => {
  const { t } = useTranslation();
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
      errors.username = t('register.valUsernameRequired');
    } else if (formData.username.length < 3) {
      errors.username = t('register.valUsernameMin');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = t('register.valUsernameChars');
    }

    if (!formData.email.trim()) {
      errors.email = t('register.valEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('register.valEmailInvalid');
    }

    if (!formData.password) {
      errors.password = t('register.valPasswordRequired');
    } else if (formData.password.length < 8) {
      errors.password = t('register.valPasswordMin');
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('register.valConfirmRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('register.valConfirmMismatch');
    }

    if (!formData.first_name.trim()) {
      errors.first_name = t('register.valFirstNameRequired');
    }

    if (!formData.last_name.trim()) {
      errors.last_name = t('register.valLastNameRequired');
    }

    if (formData.phone_number.trim() && !/^\+?[0-9\s\-()]+$/.test(formData.phone_number)) {
      errors.phone_number = t('register.valPhoneInvalid');
    }

    if (!termsAccepted) {
      errors.terms = t('register.valTermsRequired');
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
        terms_accepted: termsAccepted,
      };

      const result = await register(registrationData);

      if (result.success) {
        navigate('/', {
          replace: true,
          state: { message: t('register.success') },
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
          setError(t('register.errorFixErrors'));
        } else {
          setError(result.error || t('register.errorGeneric'));
        }
      }
    } catch (err) {
      setError(t('register.errorServer'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reg-page">
      <SEO title={t('register.pageTitle')} />
      {/* ── HERO ── */}
      <PageHero
        title={t('register.heroTitle')}
        subtitle={t('register.heroSubtitle')}
        pill={t('register.heroPill')}
        icon="fas fa-user-plus"
        orbCount={3}
        hasShine
        className="reg-hero"
      />

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
                {t('register.secureRegistration')}
              </span>
            </div>

            {error && (
              <div className="reg-alert reg-alert-error" aria-live="polite">
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
                  <label htmlFor="username">{t('register.usernameLabel')}</label>
                  <div className={`reg-input-wrap ${fieldErrors.username ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder={t('register.usernamePlaceholder')}
                      autoComplete="username"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.username && <span className="reg-err" aria-live="polite">{fieldErrors.username}</span>}
                </div>

                <div className="reg-field">
                  <label htmlFor="email">{t('register.emailLabel')}</label>
                  <div className={`reg-input-wrap ${fieldErrors.email ? 'has-error' : ''}`}>
                    <i className="fas fa-envelope reg-input-ico" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder={t('register.emailPlaceholder')}
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && <span className="reg-err" aria-live="polite">{fieldErrors.email}</span>}
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field">
                  <label htmlFor="first_name">{t('register.firstNameLabel')}</label>
                  <div className={`reg-input-wrap ${fieldErrors.first_name ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder={t('register.firstNamePlaceholder')}
                      autoComplete="given-name"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.first_name && <span className="reg-err" aria-live="polite">{fieldErrors.first_name}</span>}
                </div>

                <div className="reg-field">
                  <label htmlFor="last_name">{t('register.lastNameLabel')}</label>
                  <div className={`reg-input-wrap ${fieldErrors.last_name ? 'has-error' : ''}`}>
                    <i className="fas fa-user reg-input-ico" />
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="reg-input"
                      placeholder={t('register.lastNamePlaceholder')}
                      autoComplete="family-name"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.last_name && <span className="reg-err" aria-live="polite">{fieldErrors.last_name}</span>}
                </div>
              </div>

              <div className="reg-field">
                <label htmlFor="phone_number">{t('register.phoneLabel')} <span className="reg-opt">({t('register.optional')})</span></label>
                <div className={`reg-input-wrap ${fieldErrors.phone_number ? 'has-error' : ''}`}>
                  <i className="fas fa-phone reg-input-ico" />
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="reg-input"
                    placeholder={t('register.phonePlaceholder')}
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors.phone_number && <span className="reg-err" aria-live="polite">{fieldErrors.phone_number}</span>}
              </div>

              <div className="reg-field">
                <label htmlFor="password">{t('register.passwordLabel')}</label>
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
                    aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
                {fieldErrors.password && <span className="reg-err" aria-live="polite">{fieldErrors.password}</span>}
                <PasswordStrengthMeter password={formData.password} />
              </div>

              <div className="reg-field">
                <label htmlFor="confirmPassword">{t('register.confirmPasswordLabel')}</label>
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
                    aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
                  >
                    <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="reg-err" aria-live="polite">{fieldErrors.confirmPassword}</span>}
                {formData.password && formData.confirmPassword && (
                  <span className={`reg-match ${formData.password === formData.confirmPassword ? 'ok' : 'err'}`}>
                    <i className={`fas fa-${formData.password === formData.confirmPassword ? 'check-circle' : 'times-circle'}`} />
                    {formData.password === formData.confirmPassword ? t('register.passwordsMatch') : t('register.passwordsMismatch')}
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
                    {t('register.termsPrefix')}{' '}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer">{t('register.termsLink')}</Link>
                    {' '}{t('register.termsAnd')}{' '}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t('register.privacyLink')}</Link>
                  </span>
                </label>
                {fieldErrors.terms && <span className="reg-err" aria-live="polite">{fieldErrors.terms}</span>}
              </div>

              <button type="submit" className="reg-btn reg-btn-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    {t('register.submitting')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus" />
                    {t('register.submit')}
                  </>
                )}
              </button>
            </form>

            <SocialLoginButtons />

            <div className="reg-footer">
              <p>
                {t('register.hasAccount')}{' '}
                <Link to="/login" className="reg-link">{t('register.loginLink')}</Link>
              </p>
              <Link to="/" className="reg-back">
                <i className="fas fa-arrow-left" />
                {t('register.backToHome')}
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
