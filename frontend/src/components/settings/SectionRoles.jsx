import { useTranslation } from 'react-i18next';
import MyProfiles from '../../pages/dashboard/MyProfiles';

const SectionRoles = () => {
  const { t } = useTranslation();

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-id-badge" /> {t('pages.settings.roles.title')}</h2>
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.roles.subtitle')}</p>
        <MyProfiles />
      </div>
    </div>
  );
};

export default SectionRoles;
