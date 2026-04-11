import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const SectionSecurity = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastLogin, setLastLogin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [authRes, sessionsRes, historyRes] = await Promise.all([
          api.get('/users/check-auth/'),
          api.get('/users/sessions/'),
          api.get('/users/me/login-history/'),
        ]);

        const user = authRes.data?.user || authRes.data;
        setTotpEnabled(user?.totp_enabled || false);

        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
        setSessionCount(sessions.length);

        const history = Array.isArray(historyRes.data) ? historyRes.data : [];
        const lastSuccess = history.find(h => h.status === 'SUCCESS');
        if (lastSuccess) setLastLogin(lastSuccess.created_at);
      } catch {
        // Fail silently — summary is non-critical
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const formatDate = (ds) => new Date(ds).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-shield-halved" /> {t('pages.settings.security.title')}</h2>
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.security.subtitle')}</p>

        {loading ? (
          <div className="ss-loading"><i className="fas fa-spinner fa-spin" /> {t('pages.settings.security.loading')}</div>
        ) : (
          <div className="ss-indicators">
            <div className="ss-indicator">
              <div className={`ss-indicator__icon ${totpEnabled ? 'ss-indicator__icon--ok' : 'ss-indicator__icon--warn'}`}>
                <i className={`fas fa-${totpEnabled ? 'lock' : 'lock-open'}`} />
              </div>
              <div className="ss-indicator__body">
                <span className="ss-indicator__label">{t('pages.settings.security.twoFactor')}</span>
                <span className={`ss-indicator__value ${totpEnabled ? 'ss-indicator__value--ok' : 'ss-indicator__value--warn'}`}>
                  {totpEnabled ? t('pages.settings.security.twoFactorEnabled') : t('pages.settings.security.twoFactorDisabled')}
                </span>
              </div>
            </div>

            <div className="ss-indicator">
              <div className="ss-indicator__icon ss-indicator__icon--neutral">
                <i className="fas fa-desktop" />
              </div>
              <div className="ss-indicator__body">
                <span className="ss-indicator__label">{t('pages.settings.security.activeSessions')}</span>
                <span className="ss-indicator__value">{t('pages.settings.security.sessionCount', { count: sessionCount })}</span>
              </div>
            </div>

            <div className="ss-indicator">
              <div className="ss-indicator__icon ss-indicator__icon--neutral">
                <i className="fas fa-clock" />
              </div>
              <div className="ss-indicator__body">
                <span className="ss-indicator__label">{t('pages.settings.security.lastLogin')}</span>
                <span className="ss-indicator__value">{lastLogin ? formatDate(lastLogin) : '—'}</span>
              </div>
            </div>
          </div>
        )}

        <button type="button" className="dashboard-btn dashboard-btn--primary ss-manage-btn" onClick={() => navigate('/dashboard/security')}>
          <i className="fas fa-arrow-right" /> {t('pages.settings.security.manage')}
        </button>
      </div>
    </div>
  );
};

export default SectionSecurity;
