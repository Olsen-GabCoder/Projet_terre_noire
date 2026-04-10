import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { newsletterAPI } from '../services/api';
import '../styles/Footer.css';

const LOGO_SRC = '/images/logo_frollot.png';

const Footer = React.memo(function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [logoErr, setLogoErr] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('error'); return; }
    setBusy(true);
    try {
      const res = await newsletterAPI.subscribe(email.trim().toLowerCase());
      if (res.data?.success) { setStatus('success'); setEmail(''); setTimeout(() => setStatus(''), 5000); }
      else { setStatus('network-error'); }
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail;
      setStatus(msg && msg.includes('inscrit') ? 'already-subscribed' : 'network-error');
    } finally { setBusy(false); }
  };

  const links = [
    { to: '/catalog', label: t('nav.catalog') },
    { to: '/authors', label: t('footer.ourAuthors') },
    { to: '/services', label: t('nav.services') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
    { to: '/faq', label: t('footer.faq') },
    { to: '/support', label: t('footer.support') },
  ];

  const legal = [
    { to: '/terms', label: t('header.terms') },
    { to: '/privacy', label: t('header.privacy') },
    { to: '/cookies', label: t('header.cookies') },
    { to: '/cgv', label: t('footer.cgv') },
  ];

  const socials = [
    { href: 'https://www.facebook.com/frollot', icon: 'fab fa-facebook-f', label: 'Facebook' },
    { href: 'https://www.instagram.com/frollot', icon: 'fab fa-instagram', label: 'Instagram' },
    { href: 'https://www.linkedin.com/company/frollot', icon: 'fab fa-linkedin-in', label: 'LinkedIn' },
    { href: 'https://wa.me/24165348887', icon: 'fab fa-whatsapp', label: 'WhatsApp' },
  ];

  return (
    <>
      <footer className="ft">
        {/* Mesh gradient animé */}
        <div className="ft__mesh" />

        {/* Glow separator */}
        <div className="ft__glow" />

        {/* ── Contenu principal — une seule bande ── */}
        <div className="ft__row">
          {/* Brand anchor */}
          <Link to="/" className="ft__brand">
            <div className="ft__logo">
              {!logoErr ? (
                <img src={LOGO_SRC} alt="Frollot" onError={() => setLogoErr(true)} />
              ) : (
                <i className="fas fa-book-open" aria-hidden="true" />
              )}
            </div>
            <span className="ft__name">Frollot</span>
          </Link>

          {/* Liens inline */}
          <nav className="ft__links" aria-label="Footer navigation">
            {links.map((l, i) => (
              <span key={l.to}>
                {i > 0 && <span className="ft__dot" aria-hidden="true" />}
                <Link to={l.to}>{l.label}</Link>
              </span>
            ))}
          </nav>

          {/* Newsletter pill */}
          <form onSubmit={handleSubmit} className="ft__pill">
            <div className="ft__pill-glow" />
            <input
              type="email"
              placeholder={t('footer.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className={status === 'error' ? 'has-error' : ''}
              aria-label="Email newsletter"
            />
            <button type="submit" disabled={busy} aria-label={t('footer.subscribe')}>
              {busy
                ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
                : <i className="fas fa-arrow-right" aria-hidden="true" />
              }
            </button>
          </form>

          {/* Social */}
          <div className="ft__social">
            {socials.map(s => (
              <a key={s.label} href={s.href} className="ft__soc" aria-label={s.label} target="_blank" rel="noopener noreferrer">
                <i className={s.icon} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* Newsletter feedback — positioned below */}
        {status && status !== 'error' && (
          <div className="ft__nl-feedback">
            {status === 'success' && <span className="ft__nl-ok"><i className="fas fa-check-circle" aria-hidden="true" /> {t('footer.subscribeSuccess')}</span>}
            {status === 'already-subscribed' && <span className="ft__nl-err"><i className="fas fa-info-circle" aria-hidden="true" /> {t('footer.alreadySubscribed')}</span>}
            {status === 'network-error' && <span className="ft__nl-err"><i className="fas fa-exclamation-circle" aria-hidden="true" /> {t('footer.connectionError')}</span>}
          </div>
        )}

        {/* ── Bottom line ── */}
        <div className="ft__bottom">
          <span className="ft__copy">&copy; {year} Frollot — {t('footer.allRights')}</span>
          <div className="ft__legal">
            {legal.map((l, i) => (
              <span key={l.to}>
                {i > 0 && <span className="ft__dot ft__dot--dim" aria-hidden="true" />}
                <Link to={l.to}>{l.label}</Link>
              </span>
            ))}
          </div>
          <div className="ft__pay">
            <i className="fas fa-mobile-alt" aria-hidden="true" title="Mobicash" />
            <i className="fas fa-mobile-alt" aria-hidden="true" title="Airtel Money" />
            <i className="fas fa-money-bill-wave" aria-hidden="true" title="Especes" />
            <i className="fab fa-cc-visa" aria-hidden="true" title="Visa" />
          </div>
          <span className="ft__by">{t('footer.designedBy')} <a href="https://github.com/olsenkampala" target="_blank" rel="noopener noreferrer">Olsen KAMPALA</a>, {t('footer.engineerTitle')}</span>
        </div>
      </footer>

      {showTop && (
        <button className="ft-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t('footer.topButton')}>
          <i className="fas fa-arrow-up" aria-hidden="true" />
        </button>
      )}
    </>
  );
});

export default Footer;
