import { useState } from 'react';
import { Link } from 'react-router-dom';
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

      {/* ══════════ HERO ══════════ */}
      <section className="ct-hero">
        <div className="ct-hero__orb ct-hero__orb--1" />
        <div className="ct-hero__orb ct-hero__orb--2" />
        <div className="ct-hero__grid-bg" />
        <div className="ct-hero__inner">
          <span className="ct-hero__pill">
            <span className="ct-hero__pill-dot" />
            Disponible · Port-Gentil, Gabon
          </span>
          <div className="ct-hero__line" />
          <h1 className="ct-hero__title">Contactez-<span className="ct-hero__title-accent">nous</span></h1>
          <p className="ct-hero__sub">
            Une question, un projet d&apos;edition ou une commande ?
            Notre equipe est a votre ecoute.
          </p>
          <div className="ct-hero__trust">
            {[
              ['fa-clock', 'Reponse sous 24h'],
              ['fa-shield-halved', 'Donnees securisees'],
              ['fa-headset', 'Support humain'],
            ].map(([icon, label]) => (
              <span key={label} className="ct-hero__trust-item">
                <i className={`fas ${icon}`} /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="ct-hero-fade" />

      {/* ══════════ CONTENU ══════════ */}
      <div className="ct-content">

        {/* ── INFOS DE CONTACT ── */}
        <div className="ct-info-row">
          {[
            ['fa-envelope', 'Email', 'terrenoireeditions@gmail.com', 'mailto:terrenoireeditions@gmail.com'],
            ['fa-phone', 'Telephone', '+241 65 34 88 87 / +241 07 65 93 535', 'tel:+24165348887'],
            ['fa-brands fa-whatsapp', 'WhatsApp', '+241 65 34 88 87', 'https://wa.me/24165348887'],
            ['fa-location-dot', 'Adresse', 'Port-Gentil, Gabon', null],
          ].map(([icon, title, value, href]) => (
            <div key={title} className="ct-info-card">
              <div className="ct-info-card__icon"><i className={`fas ${icon}`} /></div>
              <div>
                <h3>{title}</h3>
                {href ? (
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{value}</a>
                ) : (
                  <p>{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── FORMULAIRE ── */}
        <div className="ct-card ct-card--form">
          <div className="ct-section-header">
            <span className="ct-section-num"><i className="fas fa-paper-plane" /></span>
            <div>
              <h2>Envoyez-nous un message</h2>
              <p className="ct-section-desc">Remplissez le formulaire, nous vous repondrons sous 24h.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="ct-form">
            <div className="ct-form__row">
              <div className="ct-form__group">
                <label htmlFor="ct-name">Nom complet <span>*</span></label>
                <div className="ct-input-wrap">
                  <i className="fas fa-user" />
                  <input id="ct-name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Votre nom" required />
                </div>
              </div>
              <div className="ct-form__group">
                <label htmlFor="ct-email">Email <span>*</span></label>
                <div className="ct-input-wrap">
                  <i className="fas fa-envelope" />
                  <input id="ct-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" required />
                </div>
              </div>
            </div>

            <div className="ct-form__group">
              <label htmlFor="ct-subject">Sujet <span>*</span></label>
              <div className="ct-input-wrap ct-input-wrap--select">
                <i className="fas fa-tag" />
                <select id="ct-subject" name="subject" value={formData.subject} onChange={handleChange}>
                  <option value="Commande">Question commande</option>
                  <option value="Manuscrit">Soumission manuscrit</option>
                  <option value="Partenariat">Partenariat</option>
                  <option value="Autre">Autre</option>
                </select>
                <i className="fas fa-chevron-down ct-select-arrow" />
              </div>
            </div>

            <div className="ct-form__group">
              <label htmlFor="ct-message">Message <span>*</span></label>
              <div className="ct-input-wrap ct-input-wrap--textarea">
                <i className="fas fa-pen ct-icon-top" />
                <textarea id="ct-message" name="message" rows="5" value={formData.message} onChange={handleChange} placeholder="Decrivez votre demande en detail..." required />
              </div>
            </div>

            <button type="submit" className="ct-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><i className="fas fa-spinner fa-spin" /> Envoi en cours...</>
              ) : (
                <><i className="fas fa-paper-plane" /> Envoyer le message</>
              )}
            </button>

            {submitStatus === 'success' && (
              <div className="ct-alert ct-alert--success">
                <i className="fas fa-check-circle" /> Message envoye ! Nous vous repondrons tres bientot.
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="ct-alert ct-alert--error">
                <i className="fas fa-exclamation-circle" /> {errorMessage || 'Une erreur est survenue.'}
              </div>
            )}
          </form>
        </div>

        {/* ── RESEAUX SOCIAUX + FAQ ── */}
        <div className="ct-bottom-row">
          <div className="ct-card">
            <div className="ct-section-header">
              <span className="ct-section-num"><i className="fas fa-share-nodes" /></span>
              <h2>Retrouvez-nous</h2>
            </div>
            <div className="ct-social-grid">
              {[
                ['fab fa-facebook-f', 'Facebook', 'https://www.facebook.com/terrenoireeditions', '#1877f2'],
                ['fab fa-tiktok', 'TikTok', 'https://www.tiktok.com/@terrenoireeditions', '#000'],
                ['fab fa-whatsapp', 'WhatsApp', 'https://wa.me/24165348887', '#25d366'],
                ['fas fa-envelope', 'Email', 'mailto:terrenoireeditions@gmail.com', 'var(--color-primary)'],
              ].map(([icon, label, href, color]) => (
                <a key={label} href={href} className="ct-social-link" target="_blank" rel="noopener noreferrer" style={{ '--social-color': color }}>
                  <i className={icon} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="ct-card">
            <div className="ct-section-header">
              <span className="ct-section-num"><i className="fas fa-circle-question" /></span>
              <h2>Questions frequentes</h2>
            </div>
            <div className="ct-faq-list">
              {[
                ['Commande', 'Panier puis paiement via Mobicash, Airtel Money, especes ou carte Visa.'],
                ['Livraison', '5-7 jours a Port-Gentil, 7-10 jours dans les autres villes du Gabon.'],
                ['Manuscrit', 'Via le formulaire en ligne ou par email direct.'],
              ].map(([q, a]) => (
                <div key={q} className="ct-faq-item">
                  <strong>{q}</strong>
                  <p>{a}</p>
                </div>
              ))}
              <Link to="/faq" className="ct-faq-link">
                Voir toutes les questions <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </div>
        </div>

      </div>
      <div className="ct-footer-fade" />
    </div>
  );
};

export default Contact;
