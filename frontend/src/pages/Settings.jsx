import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import '../styles/Settings.css';
import PageHero from '../components/PageHero';

const Settings = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [receiveNewsletter, setReceiveNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReceiveNewsletter(user.receive_newsletter || false);
  }, [user, navigate]);

  const handleNewsletterChange = async (e) => {
    const checked = e.target.checked;
    setReceiveNewsletter(checked);
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({ receive_newsletter: checked });
      if (result.success) {
        setMessage({ type: 'success', text: checked ? 'Newsletter activée.' : 'Newsletter désactivée.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la mise à jour.' });
        setReceiveNewsletter(!checked);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
      setReceiveNewsletter(!checked);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="settings-page">
      <PageHero
        title={t('pages.settings.title', 'Paramètres')}
        subtitle={t('pages.settings.subtitle', 'Gérez vos préférences et les notifications de votre compte.')}
      />

      <div className="settings-content">
        <div className="settings-card">
          <h2><i className="fas fa-bell" /> {t('pages.settings.notifications', 'Notifications')}</h2>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>{t('pages.settings.newsletter', 'Newsletter')}</span>
              <small>{t('pages.settings.newsletterDesc', 'Recevez nos nouveautés et actualités par email')}</small>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={receiveNewsletter}
                onChange={handleNewsletterChange}
                disabled={loading}
                aria-label={t('pages.settings.toggleNewsletter', 'Activer ou désactiver la newsletter')}
              />
              <span className="settings-toggle__slider" />
            </label>
          </div>
          {message.text && (
            <p className={`settings-msg settings-msg--${message.type}`}>
              <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
              {message.text}
            </p>
          )}
        </div>

        <div className="settings-card">
          <h2><i className="fas fa-user" /> {t('pages.settings.account', 'Compte')}</h2>
          <p>{t('pages.settings.accountDesc', 'Modifiez vos informations personnelles, adresse et coordonnées depuis votre profil.')}</p>
          <Link to="/profile" className="settings-btn settings-btn--primary">
            <i className="fas fa-arrow-right" /> {t('pages.settings.goToProfile', 'Aller au profil')}
          </Link>
        </div>

        <div className="settings-card">
          <h2><i className="fas fa-shield-alt" /> {t('pages.settings.security', 'Sécurité')}</h2>
          <p>{t('pages.settings.securityDesc', 'Pour modifier votre mot de passe ou sécuriser votre compte, contactez-nous à contact@frollot.com.')}</p>
        </div>
      </div>
      <div className="settings-footer-fade" />
    </div>
  );
};

export default Settings;
