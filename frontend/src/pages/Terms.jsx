import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Terms.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="terms-page">
      <SEO title={t('pages.terms.seoTitle')} />
      <PageHero
        title={t('pages.terms.heroTitle')}
        subtitle={t('pages.terms.heroSub')}
      />
      <div className="terms-content">
        <p className="terms-intro">{t('pages.terms.intro')}</p>
        <div className="terms-card">
          <h2>{t('pages.terms.section1Title')}</h2>
          <p>{t('pages.terms.section1p1')}</p>
          <h2>{t('pages.terms.section2Title')}</h2>
          <p>{t('pages.terms.section2p1')}</p>
          <h2>{t('pages.terms.section3Title')}</h2>
          <p>{t('pages.terms.section3p1')}</p>
          <h2>{t('pages.terms.section4Title')}</h2>
          <p>{t('pages.terms.section4p1')}</p>
          <h2>{t('pages.terms.section5Title')}</h2>
          <p>{t('pages.terms.section5p1')} <Link to="/privacy">{t('pages.terms.privacyLink')}</Link>.</p>
          <h2>{t('pages.terms.section6Title')}</h2>
          <p>{t('pages.terms.section6p1')}</p>
          <div className="terms-cta">
            <Link to="/cgv" className="terms-btn terms-btn--primary">{t('pages.terms.viewCGV')}</Link>
            <Link to="/contact" className="terms-btn terms-btn--outline">{t('pages.terms.contactUs')}</Link>
          </div>
        </div>
      </div>
      <div className="terms-footer-fade" />
    </div>
  );
};

export default Terms;
