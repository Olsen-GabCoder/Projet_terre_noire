import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI, handleApiError } from '../services/api';
import PageHero from '../components/PageHero';
import '../styles/Login.css';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!uid || !token) {
      setInvalidLink(true);
    }
  }, [uid, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (invalidLink || !uid || !token) return;
    if (formData.new_password.length < 8) {
      setError(t('pages.resetPassword.errorMinLength'));
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      setError(t('pages.resetPassword.errorMismatch'));
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({
        uid,
        token,
        new_password: formData.new_password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="login-page">
        <PageHero
          title={t('pages.resetPassword.invalidLinkTitle')}
          subtitle={t('pages.resetPassword.invalidLinkDesc')}
          hasShine={false}
          className="login-hero"
        />
        <div className="login-content">
          <div className="login-wrap">
            <div className="login-card">
              <Link to="/forgot-password" className="login-btn login-btn-submit">
                <i className="fas fa-redo" /> {t('pages.resetPassword.newRequest')}
              </Link>
              <div className="login-footer">
                <Link to="/login" className="login-link">{t('pages.resetPassword.backToLogin')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <PageHero
          title={t('pages.resetPassword.successTitle')}
          subtitle={t('pages.resetPassword.successRedirect')}
          icon="fas fa-check-circle"
          className="login-hero"
        />
      </div>
    );
  }

  return (
    <div className="login-page">
      <PageHero
        title={t('pages.resetPassword.heroTitle')}
        subtitle={t('pages.resetPassword.heroSub')}
        pill={t('pages.resetPassword.pill')}
        icon="fas fa-lock"
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
            {error && (
              <div className="login-alert login-alert-error">
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="new_password">{t('pages.resetPassword.newPassword')}</label>
                <div className="login-input-wrap login-input-wrap--pwd">
                  <i className="fas fa-lock login-input-ico" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new_password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="login-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('pages.resetPassword.hide') : t('pages.resetPassword.show')}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="confirm_password">{t('pages.resetPassword.confirmPassword')}</label>
                <div className="login-input-wrap">
                  <i className="fas fa-lock login-input-ico" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="login-input"
                    placeholder="••••••••"
                    required
                    minLength={8}
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
                    {t('pages.resetPassword.saving')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-check" />
                    {t('pages.resetPassword.submitBtn')}
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <Link to="/login" className="login-link">
                <i className="fas fa-arrow-left" /> {t('pages.resetPassword.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="login-footer-fade" />
    </div>
  );
};

export default ResetPassword;
