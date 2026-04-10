import { useTranslation } from 'react-i18next';
import '../styles/Privacy.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="privacy-page">
      <SEO title={t('pages.privacy.seoTitle')} />
      <PageHero
        title={t('pages.privacy.heroTitle')}
        subtitle={t('pages.privacy.heroSub')}
      />

      <div className="privacy-content">
        <div className="privacy-card">
          <h2>{t('pages.privacy.dataCollectionTitle')}</h2>
          <p>{t('pages.privacy.dataCollectionText')}</p>

          <h2>{t('pages.privacy.submissionTitle')}</h2>
          <p>{t('pages.privacy.submissionText')}</p>

          <h2>{t('pages.privacy.retentionTitle')}</h2>
          <p>{t('pages.privacy.retentionText')}</p>

          <h2>{t('pages.privacy.rightsTitle')}</h2>
          <p>
            {t('pages.privacy.rightsText')} <a href="mailto:contact@frollot.com">contact@frollot.com</a>.
          </p>

          <h2>{t('pages.privacy.contactTitle')}</h2>
          <p>
            {t('pages.privacy.contactText')} <a href="mailto:contact@frollot.com">contact@frollot.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
