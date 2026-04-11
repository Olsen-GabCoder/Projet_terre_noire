import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const SectionNotifications = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();

  const [receiveNewsletter, setReceiveNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) setReceiveNewsletter(user.receive_newsletter || false);
  }, [user]);

  const handleToggle = async (e) => {
    const checked = e.target.checked;
    setReceiveNewsletter(checked);
    setLoading(true); setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({ receive_newsletter: checked });
      if (result.success) {
        setMessage({ type: 'success', text: checked ? t('pages.settings.notifications.enabled') : t('pages.settings.notifications.disabled') });
      } else {
        setReceiveNewsletter(!checked);
        setMessage({ type: 'error', text: t('pages.settings.notifications.error') });
      }
    } catch {
      setReceiveNewsletter(!checked);
      setMessage({ type: 'error', text: t('pages.settings.notifications.error') });
    } finally { setLoading(false); }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-bell" /> {t('pages.settings.notifications.title')}</h2>
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.notifications.subtitle')}</p>

        <div className="settings-row">
          <div className="settings-row__label">
            <span>{t('pages.settings.notifications.newsletter')}</span>
            <small>{t('pages.settings.notifications.newsletterDesc')}</small>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" checked={receiveNewsletter} onChange={handleToggle} disabled={loading} />
            <span className="settings-toggle__slider" />
          </label>
        </div>

        {message.text && (
          <div className={`settings-msg settings-msg--${message.type}`}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionNotifications;
