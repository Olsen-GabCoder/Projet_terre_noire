import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newsletterAPI } from '../services/api';
import '../styles/Footer.css';

const LOGO_SRC = '/images/logo_terre_noire.png';

const Footer = () => {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [logoErr, setLogoErr] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    setBusy(true);
    try {
      const res = await newsletterAPI.subscribe(email.trim().toLowerCase());
      if (res.data?.success) {
        setStatus('success');
        setEmail('');
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('network-error');
      }
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail;
      setStatus(msg && msg.includes('déjà inscrit') ? 'already-subscribed' : 'network-error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <footer className="ft">
        <div className="ft__orb" />

        {/* ── SECTION PRINCIPALE ── */}
        <div className="ft__main">
          <div className="ft__wrap">
            <div className="ft__grid">

              {/* COL 1 — Brand */}
              <div className="ft-brand">
                <div className="ft-brand__header">
                  <div className="ft-brand__logo">
                    {!logoErr ? (
                      <img src={LOGO_SRC} alt="Terre Noire" onError={() => setLogoErr(true)} />
                    ) : (
                      <i className="fas fa-book-open ft-brand__logo-fallback" />
                    )}
                  </div>
                  <h2 className="ft-brand__name">Terre Noire Éditions</h2>
                </div>

                <p className="ft-brand__desc">
                  Nous publions et diffusons des œuvres littéraires d'ici et d'ailleurs,
                  et accompagnons les auteurs dans leur parcours éditorial.
                </p>

                <div className="ft-social">
                  {[
                    { href: 'https://www.facebook.com/terrenoireeditions', icon: 'fab fa-facebook-f', label: 'Facebook' },
                    { href: 'https://www.instagram.com/terrenoireeditions', icon: 'fab fa-instagram', label: 'Instagram' },
                    { href: 'https://www.linkedin.com/company/terrenoireeditions', icon: 'fab fa-linkedin-in', label: 'LinkedIn' },
                    { href: 'https://wa.me/24165348887', icon: 'fab fa-whatsapp', label: 'WhatsApp' },
                  ].map((s) => (
                    <a key={s.label} href={s.href} className="ft-social__link" aria-label={s.label} target="_blank" rel="noopener noreferrer">
                      <i className={s.icon} />
                    </a>
                  ))}
                </div>

                <div className="ft-newsletter">
                  <p className="ft-newsletter__title">Recevez nos nouveautés par email</p>
                  <form onSubmit={handleSubmit} className="ft-newsletter__form">
                    <input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      className={`ft-newsletter__input ${status === 'error' ? 'has-error' : ''}`}
                      aria-label="Email newsletter"
                    />
                    <button type="submit" className="ft-newsletter__btn" disabled={busy} aria-label="S'abonner">
                      <i className={busy ? 'fas fa-spinner fa-spin' : 'fas fa-arrow-right'} />
                    </button>
                  </form>
                  {status === 'success' && (
                    <p className="ft-newsletter__msg ft-newsletter__msg--ok"><i className="fas fa-check-circle" /> Inscription réussie !</p>
                  )}
                  {status === 'already-subscribed' && (
                    <p className="ft-newsletter__msg ft-newsletter__msg--err"><i className="fas fa-info-circle" /> Cet email est déjà inscrit.</p>
                  )}
                  {(status === 'error' || status === 'network-error') && (
                    <p className="ft-newsletter__msg ft-newsletter__msg--err"><i className="fas fa-exclamation-circle" /> {status === 'error' ? 'Email invalide' : 'Erreur de connexion'}</p>
                  )}
                  <p className="ft-newsletter__privacy"><i className="fas fa-lock" /> Confidentiel — Désabonnement à tout moment</p>
                </div>
              </div>

              {/* COL 2 — Navigation */}
              <nav>
                <h3 className="ft-col__title">Navigation</h3>
                <ul className="ft-links">
                  {[
                    { href: '/', icon: 'fas fa-home', text: 'Accueil' },
                    { href: '/catalog', icon: 'fas fa-book', text: 'Catalogue' },
                    { href: '/authors', icon: 'fas fa-user-pen', text: 'Nos Auteurs' },
                    { href: '/about', icon: 'fas fa-info-circle', text: 'À propos' },
                    { href: '/contact', icon: 'fas fa-envelope', text: 'Contact' },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link to={l.href}>
                        <span className="ft-icon"><i className={l.icon} /></span>
                        {l.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* COL 3 — Services */}
              <nav>
                <h3 className="ft-col__title">Services</h3>
                <ul className="ft-links">
                  {[
                    { href: '/submit-manuscript', icon: 'fas fa-file-upload', text: 'Soumettre un manuscrit' },
                    { href: '/wishlist', icon: 'fas fa-heart', text: 'Ma liste d\'envie' },
                    { href: '/delivery', icon: 'fas fa-truck', text: 'Livraison & Retours' },
                    { href: '/faq', icon: 'fas fa-question-circle', text: 'FAQ' },
                    { href: '/support', icon: 'fas fa-headset', text: 'Support' },
                    { href: '/cgv', icon: 'fas fa-file-contract', text: 'CGV' },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link to={l.href}>
                        <span className="ft-icon"><i className={l.icon} /></span>
                        {l.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* COL 4 — Contact */}
              <div>
                <h3 className="ft-col__title">Contact</h3>
                <div className="ft-contact">
                  {[
                    { icon: 'fas fa-map-marker-alt', label: 'Adresse', value: 'Avenue Ivan Le Terrible, Port-Gentil' },
                    { icon: 'fas fa-phone-alt', label: 'Téléphone', value: <><a href="tel:+24165348887">+241 65 34 88 87</a><br /><a href="tel:+24176593535">+241 76 59 35 35</a></> },
                    { icon: 'fas fa-envelope', label: 'Email', value: <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a> },
                    { icon: 'fas fa-clock', label: 'Horaires', value: <>Lun-Ven : 7h30-18h30<br />Sam : 10h-18h30</> },
                  ].map((c) => (
                    <div className="ft-contact__row" key={c.label}>
                      <div className="ft-contact__icon"><i className={c.icon} /></div>
                      <div className="ft-contact__info">
                        <span className="ft-contact__label">{c.label}</span>
                        <span className="ft-contact__value">{c.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── PAIEMENTS ── */}
        <div className="ft__payments">
          <div className="ft__wrap">
            <div className="ft__payments-inner">
              <span className="ft__payments-label"><i className="fas fa-shield-alt" /> Paiements sécurisés</span>
              <div className="ft__payments-list">
                {[
                  { icon: 'fas fa-mobile-alt', name: 'Mobicash' },
                  { icon: 'fas fa-mobile-alt', name: 'Airtel Money' },
                  { icon: 'fas fa-money-bill-wave', name: 'Espèces' },
                  { icon: 'fab fa-cc-visa', name: 'Cartes Visa' },
                ].map((p) => (
                  <span className="ft__pay-item" key={p.name}><i className={p.icon} /> {p.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── COPYRIGHT ── */}
        <div className="ft__bottom">
          <div className="ft__wrap">
            <div className="ft__bottom-inner">
              <div>
                <p className="ft__copy">&copy; {year} <strong>Terre Noire Éditions</strong> — Tous droits réservés</p>
                <div className="ft__legal">
                  <Link to="/terms">Conditions</Link>
                  <span className="ft__legal-sep">&bull;</span>
                  <Link to="/privacy">Confidentialité</Link>
                  <span className="ft__legal-sep">&bull;</span>
                  <Link to="/cookies">Cookies</Link>
                </div>
              </div>
              <span className="ft__credit">
                <i className="fas fa-heart" /> Conçu par <a href="https://github.com/olsenkampala" target="_blank" rel="noopener noreferrer">Olsen Kampala</a>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showTop && (
        <button className="ft-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Haut de page">
          <i className="fas fa-chevron-up" />
        </button>
      )}
    </>
  );
};

export default Footer;
