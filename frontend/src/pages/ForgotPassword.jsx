import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, handleApiError } from '../services/api';
import '../styles/Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage(null);
    try {
      const res = await authAPI.forgotPassword(email.trim().toLowerCase());
      setMessage(res.data?.message || "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.");
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero__orb login-hero__orb--1" />
        <div className="login-hero__orb login-hero__orb--2" />
        <div className="login-hero__orb login-hero__orb--3" />
        <div className="login-hero__grid-bg" />
        <div className="login-hero__shine" />
        <div className="login-hero__inner">
          <span className="login-hero__pill">Mot de passe oublié</span>
          <div className="login-hero__line" />
          <div className="login-hero__icon">
            <i className="fas fa-key" />
          </div>
          <h1 className="login-hero__title">
            <span className="login-hero__title-main">Réinitialiser</span>
          </h1>
          <p className="login-hero__sub">
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>
      </section>

      <div className="login-hero-fade" />

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
                Récupération sécurisée
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
                <label htmlFor="email">Adresse email</label>
                <div className="login-input-wrap">
                  <i className="fas fa-envelope login-input-ico" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="login-input"
                    placeholder="votre@email.com"
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
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane" />
                    Envoyer le lien
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>
                <Link to="/login" className="login-link">
                  <i className="fas fa-arrow-left" /> Retour à la connexion
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
