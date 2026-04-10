import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Delivery.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Delivery = () => {
  const { t } = useTranslation();

  return (
    <div className="delivery-page">
      <SEO title={t('pages.delivery.seoTitle')} />
      <PageHero
        title={t('pages.delivery.heroTitle')}
        subtitle={<>{t('pages.delivery.heroSub1')}<br />{t('pages.delivery.heroSub2')}</>}
      />

      {/* ── CONTENU BENTO GRID ── */}
      <div className="delivery-content">
        <p className="delivery-intro">
          {t('pages.delivery.intro')}
        </p>
        <div className="delivery-layout">

          {/* Livraison — Délais */}
          <div className="card card--md">
            <span className="card__tag">{t('pages.delivery.tagDelays')}</span>
            <h2>{t('pages.delivery.delaysTitle')}</h2>
            <p>{t('pages.delivery.delaysp1')}</p>
            <p>{t('pages.delivery.delaysp2')}</p>
            <p>{t('pages.delivery.delaysp3')}</p>
          </div>

          {/* Livraison — Tarifs */}
          <div className="card card--md">
            <span className="card__tag">{t('pages.delivery.tagRates')}</span>
            <h2>{t('pages.delivery.ratesTitle')}</h2>
            <ul className="delivery-list">
              <li><strong>{t('pages.delivery.rateFree')}</strong> — {t('pages.delivery.rateFreeDesc')}</li>
              <li><strong>{t('pages.delivery.ratePaid')}</strong> — {t('pages.delivery.ratePaidDesc')}</li>
            </ul>
            <p>{t('pages.delivery.ratesNote')}</p>
          </div>

          {/* Zones */}
          <div className="card card--md">
            <span className="card__tag">{t('pages.delivery.tagCoverage')}</span>
            <h2>{t('pages.delivery.zonesTitle')}</h2>
            <p>{t('pages.delivery.zonesp1')}</p>
            <p>{t('pages.delivery.zonesp2')}</p>
          </div>

          {/* Suivi */}
          <div className="card card--md">
            <span className="card__tag">{t('pages.delivery.tagTracking')}</span>
            <h2>{t('pages.delivery.trackingTitle')}</h2>
            <p>{t('pages.delivery.trackingp1')} <Link to="/profile">{t('pages.delivery.clientArea')}</Link>.</p>
            <p>{t('pages.delivery.trackingp2')}</p>
          </div>

          {/* Retours — Conditions */}
          <div className="card card--md card--wide">
            <span className="card__tag">{t('pages.delivery.tagReturns')}</span>
            <h2>{t('pages.delivery.returnsTitle')}</h2>
            <p>{t('pages.delivery.returnsp1')}</p>
            <p>{t('pages.delivery.returnsp2')}</p>
            <p>{t('pages.delivery.returnsp3')}</p>
          </div>

          {/* Retours — Procédure */}
          <div className="card card--md">
            <span className="card__tag">{t('pages.delivery.tagProcedure')}</span>
            <h2>{t('pages.delivery.procedureTitle')}</h2>
            <p className="delivery-contact-methods">{t('pages.delivery.procedureIntro')}</p>
            <ul className="delivery-return-methods">
              <li><strong>{t('pages.delivery.byEmail')}</strong> — contact@frollot.com</li>
              <li><strong>{t('pages.delivery.byPhone')}</strong> — +241 65 34 88 87 {t('pages.delivery.or')} +241 76 59 35 35</li>
              <li><strong>{t('pages.delivery.fromSite')}</strong> — {t('pages.delivery.via')} <Link to="/contact">{t('pages.delivery.contactForm')}</Link></li>
            </ul>
            <p>{t('pages.delivery.procedureNote')}</p>
            <ol className="delivery-steps">
              <li>{t('pages.delivery.step1')}</li>
              <li>{t('pages.delivery.step2')}</li>
              <li>{t('pages.delivery.step3')}</li>
              <li>{t('pages.delivery.step4')}</li>
            </ol>
          </div>

          {/* CTA */}
          <div className="card card--cta">
            <div>
              <h2>{t('pages.delivery.ctaTitle')}</h2>
              <p>{t('pages.delivery.ctaText')}</p>
            </div>
            <div className="cta-btns">
              <Link to="/contact" className="btn btn--primary">{t('pages.delivery.contactUs')}</Link>
              <Link to="/catalog" className="btn btn--outline">{t('pages.delivery.viewCatalog')}</Link>
            </div>
          </div>

        </div>
      </div>

      <div className="delivery-footer-fade" />
    </div>
  );
};

export default Delivery;
