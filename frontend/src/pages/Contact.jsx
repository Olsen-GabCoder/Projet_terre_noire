import { useState } from 'react';
import { contactAPI, handleApiError } from '../services/api';
import '../styles/Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', subject: 'Commande', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');
    try {
      const res = await contactAPI.submit(formData);
      if (res.data?.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: 'Commande', message: '' });
      } else {
        setSubmitStatus('error');
        setErrorMessage(res.data?.message || 'Une erreur est survenue.');
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(handleApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">

      {/* ── HERO ── */}
      <section className="contact-hero">
        <div className="contact-hero__orb contact-hero__orb--1" />
        <div className="contact-hero__orb contact-hero__orb--2" />
        <div className="contact-hero__grid-bg" />

        <div className="contact-hero__inner">
          <div className="contact-hero__chip">
            <span className="contact-hero__chip-dot" />
            Disponible · Port-Gentil, Gabon
          </div>
          <h1 className="contact-hero__title">Contactez-nous</h1>
          <p className="contact-hero__sub">
            Une question, un projet d'édition ou une commande ?<br />
            Notre équipe est à votre écoute.
          </p>
          <div className="contact-hero__trust">
            <span className="contact-hero__trust-item">
              <i className="fas fa-clock" /> Réponse sous 24h
            </span>
            <span className="contact-hero__trust-sep" />
            <span className="contact-hero__trust-item">
              <i className="fas fa-shield-alt" /> Données sécurisées
            </span>
            <span className="contact-hero__trust-sep" />
            <span className="contact-hero__trust-item">
              <i className="fas fa-headset" /> Support humain
            </span>
          </div>
        </div>
      </section>

      <div className="contact-hero-fade" />

      {/* ── CONTENU ── */}
      <div className="contact-content">
        <div className="contact-layout">

          {/* ── COLONNE PRINCIPALE : Formulaire ── */}
          <div className="contact-main">
            <div className="card card--form">
              <span className="card__tag">Formulaire de contact</span>
              <h2 className="card__title">Envoyer un message</h2>
              <p className="card__desc">Remplissez le formulaire, nous vous répondrons sous 24h.</p>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contact-name">Nom</label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                      <input
                        id="contact-name"
                        type="text" name="name" value={formData.name}
                        onChange={handleChange} placeholder="Votre nom complet" required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-email">Email</label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </span>
                      <input
                        id="contact-email"
                        type="email" name="email" value={formData.email}
                        onChange={handleChange} placeholder="votre@email.com" required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-subject">Sujet</label>
                  <div className="input-group input-group--select">
                    <span className="input-group__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </span>
                    <select id="contact-subject" name="subject" value={formData.subject} onChange={handleChange}>
                      <option value="Commande">Question commande</option>
                      <option value="Manuscrit">Soumission manuscrit</option>
                      <option value="Partenariat">Partenariat</option>
                      <option value="Autre">Autre</option>
                    </select>
                    <span className="input-group__chevron" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-message">Message</label>
                  <div className="input-group input-group--textarea">
                    <span className="input-group__icon input-group__icon--top" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </span>
                    <textarea
                      id="contact-message"
                      name="message" rows="4" value={formData.message}
                      onChange={handleChange} placeholder="Décrivez votre demande en détail..." required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><span className="btn-spinner" /> Envoi en cours…</>
                  ) : (
                    <>
                      <svg className="btn-submit__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      Envoyer le message
                    </>
                  )}
                </button>

                {submitStatus === 'success' && (
                  <p className="form-success">
                    <svg className="form-success__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Message envoyé ! Nous vous répondrons très bientôt.
                  </p>
                )}
                {submitStatus === 'error' && (
                  <p className="form-error">
                    <i className="fas fa-exclamation-circle" /> {errorMessage || 'Une erreur est survenue. Réessayez ou contactez-nous par téléphone.'}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="contact-sidebar">

            {/* Adresse */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-map-marker-alt" /></span>
                <h3>Adresse</h3>
              </div>
              <p>Avenue Ivan Le Terrible<br />Port-Gentil, Gabon</p>
            </div>

            {/* Email */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-envelope" /></span>
                <h3>Email</h3>
              </div>
              <p>
                <a href="mailto:terrenoireeditions@gmail.com" className="info-link">
                  terrenoireeditions@gmail.com <i className="fas fa-arrow-right" />
                </a>
              </p>
            </div>

            {/* Téléphone */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-phone-alt" /></span>
                <h3>Téléphone</h3>
              </div>
              <p>+241 65 34 88 87</p>
              <p>+241 76 59 35 35</p>
            </div>

            {/* Horaires */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-clock" /></span>
                <h3>Horaires</h3>
              </div>
              <p>Lun – Ven · 7h30 – 18h30</p>
              <p>Sam · 10h – 18h30</p>
              <span className="avail-badge">Ouvert maintenant</span>
            </div>

            {/* FAQ */}
            <div className="card card--sm card--faq">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-question-circle" /></span>
                <h3>Questions fréquentes</h3>
              </div>
              <div className="faq-list">
                <div className="faq-item">
                  <p className="faq-q">Commande</p>
                  <p className="faq-a">Panier puis paiement via Mobicash, Airtel Money, espèces ou carte Visa.</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">Livraison</p>
                  <p className="faq-a">2-3 j. à Port-Gentil · 5-7 j. ailleurs.</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">Manuscrit</p>
                  <p className="faq-a">Via ce formulaire ou par email direct.</p>
                </div>
              </div>
            </div>

            {/* Réseaux */}
            <div className="card card--sm card--social">
              <h3>Retrouvez-nous</h3>
              <div className="social-links">
                <a href="https://www.facebook.com/terrenoireeditions" className="social-link social-link--facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-facebook-f" />
                  <span>Facebook</span>
                </a>
                <a href="https://www.instagram.com/terrenoireeditions" className="social-link social-link--instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-instagram" />
                  <span>Instagram</span>
                </a>
                <a href="https://www.linkedin.com/company/terrenoireeditions" className="social-link social-link--linkedin" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-linkedin-in" />
                  <span>LinkedIn</span>
                </a>
                <a href="https://wa.me/24165348887" className="social-link social-link--whatsapp" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-whatsapp" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

          </aside>
        </div>
      </div>

      <div className="contact-footer-fade" />
    </div>
  );
};

export default Contact;