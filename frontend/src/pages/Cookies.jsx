import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Cookies.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Cookies = () => {
  const { t } = useTranslation();

  return (
    <div className="cookies-page">
      <SEO title={t('pages.cookies.seoTitle')} />
      <PageHero
        title={t('pages.cookies.heroTitle')}
        subtitle={t('pages.cookies.heroSub')}
      />
      <div className="cookies-content">
        <p className="cookies-intro">{t('pages.cookies.intro')}</p>
        <div className="cookies-card">
          <h2>{t('pages.cookies.whatTitle')}</h2>
          <p>{t('pages.cookies.whatText')}</p>
          <h2>{t('pages.cookies.typesTitle')}</h2>
          <p>{t('pages.cookies.typesText')}</p>
          <h2>{t('pages.cookies.managementTitle')}</h2>
          <p>{t('pages.cookies.managementText')}</p>
          <h2>{t('pages.cookies.dataTitle')}</h2>
          <p>{t('pages.cookies.dataText')} <Link to="/privacy">{t('pages.cookies.privacyLink')}</Link>.</p>
          <div className="cookies-cta">
            <Link to="/privacy" className="cookies-btn cookies-btn--primary">{t('pages.cookies.privacyBtn')}</Link>
            <Link to="/contact" className="cookies-btn cookies-btn--outline">{t('pages.cookies.contactUs')}</Link>
          </div>
        </div>
      </div>
      <div className="cookies-footer-fade" />
    </div>
  );
};

export default Cookies;
