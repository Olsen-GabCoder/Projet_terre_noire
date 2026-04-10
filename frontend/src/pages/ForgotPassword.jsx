import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI, handleApiError } from '../services/api';
import PageHero from '../components/PageHero';
import '../styles/Login.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t('pages.forgotPassword.errorEmpty'));
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage(null);
    try {
      const res = await authAPI.forgotPassword(email.trim().toLowerCase());
      setMessage(res.data?.message || t('pages.forgotPassword.successMessage'));
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <PageHero
        title={t('pages.forgotPassword.heroTitle')}
        subtitle={t('pages.forgotPassword.heroSub')}
        pill={t('pages.forgotPassword.pill')}
        icon="fas fa-key"
        orbCount={3}
        hasShine
        className="login-hero"
      />

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
                {t('pages.forgotPassword.secureRecovery')}
              </span>
            </div>
            {error && (
              <div className="login-alert login-alert-error">
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="login-alert login-alert-success">
                <i className="fas fa-check-circle" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">{t('pages.forgotPassword.emailLabel')}</label>
                <div className="login-input-wrap">
                  <i className="fas fa-envelope login-input-ico" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="login-input"
                    placeholder={t('pages.forgotPassword.emailPlaceholder')}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-btn login-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    {t('pages.forgotPassword.sending')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane" />
                    {t('pages.forgotPassword.sendLink')}
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>
                <Link to="/login" className="login-link">
                  <i className="fas fa-arrow-left" /> {t('pages.forgotPassword.backToLogin')}
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

export default ForgotPassword;
