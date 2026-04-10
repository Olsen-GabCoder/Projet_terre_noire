import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReveal } from '../hooks/useReveal';
import '../styles/Support.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Support = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();

  return (
    <div className="support-page">
      <SEO title={t('pages.support.seoTitle')} />
      <PageHero
        title={t('pages.support.heroTitle')}
        subtitle={t('pages.support.heroSub')}
      />

      <div ref={revealRef} className="support-content reveal-section">
        <p className="support-intro">
          {t('pages.support.intro')}
        </p>

        <div className="support-grid">
          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-envelope" />
            </div>
            <h2>{t('pages.support.emailTitle')}</h2>
            <p>{t('pages.support.emailText1')} <a href="mailto:contact@frollot.com">contact@frollot.com</a>. {t('pages.support.emailText2')}</p>
            <p>{t('pages.support.emailNote')}</p>
          </div>

          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-phone-alt" />
            </div>
            <h2>{t('pages.support.phoneTitle')}</h2>
            <p>{t('pages.support.phoneText')}</p>
            <ul>
              <li><a href="tel:+24165348887">+241 65 34 88 87</a></li>
              <li><a href="tel:+24176593535">+241 76 59 35 35</a></li>
            </ul>
            <p>{t('pages.support.phoneHours')}</p>
          </div>

          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-map-marker-alt" />
            </div>
            <h2>{t('pages.support.addressTitle')}</h2>
            <p>{t('pages.support.addressText')}</p>
            <p><strong>{t('pages.support.addressValue')}</strong></p>
            <p>{t('pages.support.addressNote')}</p>
          </div>

          <div className="support-card support-card--wide">
            <div className="support-card__icon">
              <i className="fas fa-edit" />
            </div>
            <h2>{t('pages.support.formTitle')}</h2>
            <p>{t('pages.support.formText')}</p>
            <Link to="/contact" className="support-btn support-btn--primary">{t('pages.support.formBtn')}</Link>
          </div>
        </div>

        <div className="support-links">
          <h3>{t('pages.support.resourcesTitle')}</h3>
          <div className="support-links__grid">
            <Link to="/faq" className="support-link">
              <i className="fas fa-question-circle" />
              <span>{t('pages.support.linkFaq')}</span>
            </Link>
            <Link to="/delivery" className="support-link">
              <i className="fas fa-truck" />
              <span>{t('pages.support.linkDelivery')}</span>
            </Link>
            <Link to="/cgv" className="support-link">
              <i className="fas fa-file-contract" />
              <span>{t('pages.support.linkCgv')}</span>
            </Link>
            <Link to="/submit-manuscript" className="support-link">
              <i className="fas fa-file-upload" />
              <span>{t('pages.support.linkManuscript')}</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="support-footer-fade" />
    </div>
  );
};

export default Support;
