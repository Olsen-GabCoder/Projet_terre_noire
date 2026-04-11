import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SectionPrivacy = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-user-shield" /> {t('pages.settings.privacy.title')}</h2>
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.privacy.subtitle')}</p>

        <p className="spriv-description">{t('pages.settings.privacy.description')}</p>

        <a href="/privacy" className="spriv-policy-link">
          <i className="fas fa-external-link-alt" /> {t('pages.settings.privacy.policyLink')}
        </a>

        <div className="spriv-danger">
          <div className="spriv-danger__info">
            <i className="fas fa-exclamation-triangle" />
            <div>
              <strong>{t('pages.settings.privacy.deleteAccount')}</strong>
              <p>{t('pages.settings.privacy.deleteAccountDesc')}</p>
            </div>
          </div>
          <button type="button" className="dashboard-btn dashboard-btn--danger" onClick={() => navigate('/dashboard/security')}>
            <i className="fas fa-trash-alt" /> {t('pages.settings.privacy.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionPrivacy;
