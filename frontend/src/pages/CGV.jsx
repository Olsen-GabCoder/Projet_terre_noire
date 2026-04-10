import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/CGV.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const CGV = () => {
  const { t } = useTranslation();

  return (
    <div className="cgv-page">
      <SEO title={t('pages.cgv.seoTitle')} />
      <PageHero
        title={t('pages.cgv.heroTitle')}
        subtitle={t('pages.cgv.heroSub')}
      />

      <div className="cgv-content">
        <p className="cgv-intro">
          {t('pages.cgv.intro')}
        </p>
        <div className="cgv-card">
          <h2>{t('pages.cgv.section1Title')}</h2>
          <p>{t('pages.cgv.section1p1')}</p>
          <p>{t('pages.cgv.section1p2')}</p>

          <h2>{t('pages.cgv.section2Title')}</h2>
          <p>{t('pages.cgv.section2p1')}</p>
          <p>{t('pages.cgv.section2p2')}</p>

          <h2>{t('pages.cgv.section3Title')}</h2>
          <p>{t('pages.cgv.section3p1')}</p>
          <p>{t('pages.cgv.section3p2')}</p>

          <h2>{t('pages.cgv.section4Title')}</h2>
          <p>{t('pages.cgv.section4p1')}</p>
          <p>{t('pages.cgv.section4p2')}</p>

          <h2>{t('pages.cgv.section5Title')}</h2>
          <p>{t('pages.cgv.section5p1')}</p>
          <p>{t('pages.cgv.section5p2')}</p>

          <h2>{t('pages.cgv.section6Title')}</h2>
          <p>{t('pages.cgv.section6p1')}</p>

          <h2>{t('pages.cgv.section7Title')}</h2>
          <p>{t('pages.cgv.section7p1')}</p>

          <h2>{t('pages.cgv.section8Title')}</h2>
          <p>{t('pages.cgv.section8p1')} <Link to="/privacy">{t('pages.cgv.privacyLink')}</Link>. {t('pages.cgv.section8p1End')}</p>

          <h2>{t('pages.cgv.section9Title')}</h2>
          <p>{t('pages.cgv.section9p1')}</p>

          <div className="cgv-cta">
            <Link to="/contact" className="cgv-btn cgv-btn--primary">{t('pages.cgv.contactUs')}</Link>
            <Link to="/catalog" className="cgv-btn cgv-btn--outline">{t('pages.cgv.backToCatalog')}</Link>
          </div>
        </div>
      </div>
      <div className="cgv-footer-fade" />
    </div>
  );
};

export default CGV;
