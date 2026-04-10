import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { handleApiError } from '../services/api';
import '../styles/Auth.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'form'); // verifying | success | error | form
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Vérification automatique si token dans l'URL
  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      try {
        const res = await api.post('/users/verify-email/', { token });
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(handleApiError(err));
      }
    };
    verify();
  }, [token]);

  // Cooldown pour le renvoi
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async (e) => {
    e?.preventDefault();
    const targetEmail = email || searchParams.get('email');
    if (!targetEmail) return;
    setResending(true);
    try {
      const res = await api.post('/users/resend-verification/', { email: targetEmail });
      setMessage(res.data.message);
      setResendCooldown(60);
    } catch (err) {
      setMessage(handleApiError(err));
    }
    setResending(false);
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        {status === 'verifying' && (
          <div className="verify-email-state">
            <div className="verify-email-spinner" />
            <h2>{t('pages.verifyEmail.verifying')}</h2>
            <p>{t('pages.verifyEmail.verifyingDescription')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-email-state verify-email-state--success">
            <div className="verify-email-checkmark">
              <i className="fas fa-check-circle" />
            </div>
            <h2>{t('pages.verifyEmail.success')}</h2>
            <p>{message}</p>
            <Link to="/login" className="loading-btn" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: '1rem' }}>
              {t('pages.verifyEmail.login')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-email-state verify-email-state--error">
            <div className="verify-email-icon-error">
              <i className="fas fa-exclamation-circle" />
            </div>
            <h2>{t('pages.verifyEmail.errorTitle')}</h2>
            <p>{message}</p>
            <div className="verify-email-resend">
              <p>{t('pages.verifyEmail.enterEmailForNewLink')}</p>
              <form onSubmit={handleResend} className="verify-email-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
                <button type="submit" className="loading-btn" disabled={resending || resendCooldown > 0}>
                  {resendCooldown > 0 ? t('pages.verifyEmail.resendCooldown', { seconds: resendCooldown }) : resending ? '...' : t('pages.verifyEmail.resend')}
                </button>
              </form>
            </div>
          </div>
        )}

        {status === 'form' && (
          <div className="verify-email-state">
            <div className="verify-email-icon-envelope">
              <i className="fas fa-envelope" />
            </div>
            <h2>{t('pages.verifyEmail.formTitle')}</h2>
            <p>{t('pages.verifyEmail.formDescription')}</p>
            <form onSubmit={handleResend} className="verify-email-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
              <button type="submit" className="loading-btn" disabled={resending || resendCooldown > 0}>
                {resendCooldown > 0 ? t('pages.verifyEmail.sentCooldown', { seconds: resendCooldown }) : resending ? t('pages.verifyEmail.sending') : t('pages.verifyEmail.sendLink')}
              </button>
            </form>
            {message && <p className="verify-email-msg">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
