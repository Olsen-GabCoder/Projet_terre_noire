import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReveal } from '../hooks/useReveal';
import '../styles/FAQ.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const FAQ = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const [openIndex, setOpenIndex] = useState(null);

  const FAQ_ITEMS = [
    { q: t('pages.faq.q1'), a: t('pages.faq.a1') },
    { q: t('pages.faq.q2'), a: t('pages.faq.a2') },
    { q: t('pages.faq.q3'), a: t('pages.faq.a3') },
    { q: t('pages.faq.q4'), a: t('pages.faq.a4') },
    { q: t('pages.faq.q5'), a: t('pages.faq.a5') },
    { q: t('pages.faq.q6'), a: t('pages.faq.a6') },
    { q: t('pages.faq.q7'), a: t('pages.faq.a7') },
    { q: t('pages.faq.q8'), a: t('pages.faq.a8') },
    { q: t('pages.faq.q9'), a: t('pages.faq.a9') },
  ];

  return (
    <div className="faq-page">
      <SEO title={t('pages.faq.seoTitle')} />
      <PageHero
        title={t('pages.faq.heroTitle')}
        subtitle={t('pages.faq.heroSub')}
      />

      <div ref={revealRef} className="faq-content reveal-section">
        <p className="faq-intro">
          {t('pages.faq.intro')}
        </p>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openIndex === i ? 'faq-item--open' : ''}`}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <div className="faq-item__header">
                <h3 className="faq-item__q">{item.q}</h3>
                <span className="faq-item__icon">
                  <i className={`fas fa-chevron-${openIndex === i ? 'up' : 'down'}`} />
                </span>
              </div>
              <div className="faq-item__body">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="faq-cta">
          <Link to="/contact" className="faq-btn faq-btn--primary">{t('pages.faq.contactUs')}</Link>
          <Link to="/delivery" className="faq-btn faq-btn--outline">{t('pages.faq.deliveryReturns')}</Link>
        </div>
      </div>
      <div className="faq-footer-fade" />
    </div>
  );
};

export default FAQ;
