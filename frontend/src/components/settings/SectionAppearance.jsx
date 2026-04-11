import { useTranslation } from 'react-i18next';

const SectionAppearance = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleLanguageChange = (lang) => {
    if (lang !== currentLang) i18n.changeLanguage(lang);
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-palette" /> {t('pages.settings.appearance.title')}</h2>
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.appearance.subtitle')}</p>

        <div className="sa-language">
          <span className="sa-language__label">{t('pages.settings.appearance.language')}</span>
          <small className="sa-language__hint">{t('pages.settings.appearance.languageHint')}</small>
          <div className="sa-language__options">
            <button
              type="button"
              className={`sa-language__btn ${currentLang === 'fr' ? 'sa-language__btn--active' : ''}`}
              onClick={() => handleLanguageChange('fr')}
            >
              <span className="sa-language__flag">🇫🇷</span>
              {t('pages.settings.appearance.french')}
            </button>
            <button
              type="button"
              className={`sa-language__btn ${currentLang === 'en' ? 'sa-language__btn--active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              <span className="sa-language__flag">🇬🇧</span>
              {t('pages.settings.appearance.english')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionAppearance;
