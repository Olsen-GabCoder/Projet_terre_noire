import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import SectionProfile from '../../components/settings/SectionProfile';
import SectionRoles from '../../components/settings/SectionRoles';
import SectionAppearance from '../../components/settings/SectionAppearance';
import SectionNotifications from '../../components/settings/SectionNotifications';
import SectionSecurity from '../../components/settings/SectionSecurity';
import SectionPrivacy from '../../components/settings/SectionPrivacy';
import '../../styles/SettingsPage.css';

const SECTIONS = [
  { id: 'profile', icon: 'fas fa-user', labelKey: 'pages.settings.nav.profile' },
  { id: 'roles', icon: 'fas fa-id-badge', labelKey: 'pages.settings.nav.roles' },
  { id: 'appearance', icon: 'fas fa-palette', labelKey: 'pages.settings.nav.appearance' },
  { id: 'notifications', icon: 'fas fa-bell', labelKey: 'pages.settings.nav.notifications' },
  { id: 'security', icon: 'fas fa-shield-halved', labelKey: 'pages.settings.nav.security' },
  { id: 'privacy', icon: 'fas fa-user-shield', labelKey: 'pages.settings.nav.privacy' },
];

const SECTION_COMPONENTS = {
  profile: SectionProfile,
  roles: SectionRoles,
  appearance: SectionAppearance,
  notifications: SectionNotifications,
  security: SectionSecurity,
  privacy: SectionPrivacy,
};

const SettingsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('section') || 'profile';

  const ActiveComponent = SECTION_COMPONENTS[activeId] || SectionProfile;

  return (
    <div className="stg">
      {/* Header */}
      <div className="dashboard-home__header">
        <h1><i className="fas fa-cog" /> {t('pages.settings.title')}</h1>
        <p className="dashboard-home__subtitle">{t('pages.settings.subtitle')}</p>
      </div>

      <div className="stg__layout">
        {/* Sidebar (desktop) / Pills (mobile) */}
        <nav className="stg__nav" aria-label={t('pages.settings.title')}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`stg__nav-item ${activeId === s.id ? 'stg__nav-item--active' : ''}`}
              onClick={() => setSearchParams({ section: s.id })}
            >
              <i className={s.icon} />
              <span>{t(s.labelKey)}</span>
            </button>
          ))}
        </nav>

        {/* Content — single active section */}
        <div className="stg__content">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
