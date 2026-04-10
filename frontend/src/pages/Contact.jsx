import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contactAPI, handleApiError } from '../services/api';
import PageHero from '../components/PageHero';
import { useReveal } from '../hooks/useReveal';
import '../styles/Contact.css';
import SEO from '../components/SEO';

const Contact = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();

  const SUBJECTS = [
    { value: 'Commande', label: t('pages.contact.subjectOrder', 'Question sur une commande'), icon: 'fas fa-shopping-bag' },
    { value: 'Compte', label: t('pages.contact.subjectAccount', 'Mon compte / Connexion'), icon: 'fas fa-user' },
    { value: 'Manuscrit', label: t('pages.contact.subjectManuscript', 'Soumission de manuscrit'), icon: 'fas fa-feather-alt' },
    { value: 'Club', label: t('pages.contact.subjectClub', 'Clubs de lecture'), icon: 'fas fa-users' },
    { value: 'Services', label: t('pages.contact.subjectServices', 'Services professionnels'), icon: 'fas fa-briefcase' },
    { value: 'Organisation', label: t('pages.contact.subjectOrganization', 'Mon organisation / Ma vitrine'), icon: 'fas fa-building' },
    { value: 'Partenariat', label: t('pages.contact.subjectPartnership', 'Partenariat / Collaboration'), icon: 'fas fa-handshake' },
    { value: 'Bug', label: t('pages.contact.subjectBug', 'Signaler un problème technique'), icon: 'fas fa-bug' },
    { value: 'Autre', label: t('pages.contact.subjectOther', 'Autre demande'), icon: 'fas fa-ellipsis-h' },
  ];

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subject: 'Commande', reference: '', message: ''
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
        setFormData({ name: '', email: '', phone: '', subject: 'Commande', reference: '', message: '' });
      } else {
        setSubmitStatus('error');
        setErrorMessage(res.data?.message || t('pages.contact.errorGeneric', 'Une erreur est survenue.'));
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
      <SEO title={t('nav.contact', 'Contact')} description={t('pages.contact.seoDescription', "Contactez l'équipe Frollot — plateforme sociale du livre.")} />

      {/* ── HERO ── */}
      <PageHero
        title={t('pages.contact.heroTitle', 'Parlons ensemble')}
        subtitle={<>{t('pages.contact.heroSub1', 'Une question sur la plateforme, un projet éditorial ou besoin d\'aide ?')}<br /><strong>{t('pages.contact.heroSub2', 'Notre équipe vous répond sous 24 heures.')}</strong></>}
        pill={<><span className="contact-hero__chip-dot" /> {t('pages.contact.heroChip', 'En ligne · Disponible 7j/7')}</>}
        className="contact-hero"
      >
        <div className="contact-hero__trust">
          <span className="contact-hero__trust-item">
            <i className="fas fa-clock" /> {t('pages.contact.trustResponse', 'Réponse sous 24h')}
          </span>
          <span className="contact-hero__trust-sep" />
          <span className="contact-hero__trust-item">
            <i className="fas fa-shield-alt" /> {t('pages.contact.trustSecure', 'Données sécurisées')}
          </span>
          <span className="contact-hero__trust-sep" />
          <span className="contact-hero__trust-item">
            <i className="fas fa-headset" /> {t('pages.contact.trustHuman', 'Support humain')}
          </span>
        </div>
      </PageHero>

      {/* ── CONTENU ── */}
      <div ref={revealRef} className="contact-content reveal-section">
        <div className="contact-layout">

          {/* ── FORMULAIRE ── */}
          <div className="contact-main">
            <div className="card card--form">
              <span className="card__tag">{t('pages.contact.formTag', 'Formulaire de contact')}</span>
              <h2 className="card__title">{t('pages.contact.sendMessage', 'Envoyer un message')}</h2>
              <p className="card__desc">{t('pages.contact.formDesc', 'Décrivez votre demande avec le plus de détails possible. Nous y répondrons personnellement.')}</p>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contact-name">{t('pages.contact.fullName', 'Nom complet')}</label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                      <input id="contact-name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('pages.contact.fullNamePlaceholder', 'Votre nom complet')} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-email">{t('pages.contact.email', 'Email')}</label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </span>
                      <input id="contact-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('pages.contact.emailPlaceholder', 'votre@email.com')} required />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contact-phone">{t('pages.contact.phone', 'Téléphone')} <span style={{color:'var(--color-text-muted-ui)',fontWeight:400,fontSize:'0.78rem'}}>({t('pages.contact.optional', 'optionnel')})</span></label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </span>
                      <input id="contact-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+241 XX XX XX XX" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-ref">{t('pages.contact.reference', 'Référence')} <span style={{color:'var(--color-text-muted-ui)',fontWeight:400,fontSize:'0.78rem'}}>({t('pages.contact.referenceHint', 'commande, manuscrit...')})</span></label>
                    <div className="input-group">
                      <span className="input-group__icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                      </span>
                      <input id="contact-ref" type="text" name="reference" value={formData.reference} onChange={handleChange} placeholder={t('pages.contact.referencePlaceholder', 'Ex: CMD-00042, MS-00015...')} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-subject">{t('pages.contact.subject', 'Sujet')}</label>
                  <div className="input-group input-group--select">
                    <span className="input-group__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </span>
                    <select id="contact-subject" name="subject" value={formData.subject} onChange={handleChange}>
                      {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <span className="input-group__chevron" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact-message">{t('pages.contact.message', 'Message')}</label>
                  <div className="input-group input-group--textarea">
                    <span className="input-group__icon input-group__icon--top" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </span>
                    <textarea id="contact-message" name="message" rows="8" value={formData.message} onChange={handleChange} placeholder={t('pages.contact.messagePlaceholder', 'Décrivez votre demande en détail. Plus vous êtes précis, plus notre réponse sera rapide et pertinente...')} required />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><span className="btn-spinner" /> {t('pages.contact.sending', 'Envoi en cours…')}</>
                  ) : (
                    <>
                      <svg className="btn-submit__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      {t('pages.contact.submit', 'Envoyer le message')}
                    </>
                  )}
                </button>

                {submitStatus === 'success' && (
                  <p className="form-success">
                    <svg className="form-success__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {t('pages.contact.successMessage', 'Message envoyé ! Nous vous répondrons très bientôt.')}
                  </p>
                )}
                {submitStatus === 'error' && (
                  <p className="form-error">
                    <i className="fas fa-exclamation-circle" /> {errorMessage || t('pages.contact.errorFallback', 'Une erreur est survenue. Réessayez ou contactez-nous par email.')}
                  </p>
                )}

                <div className="contact-form__note">
                  <i className="fas fa-info-circle" />
                  <p>{t('pages.contact.privacyNote', 'En soumettant ce formulaire, vous acceptez que vos données soient traitées uniquement pour répondre à votre demande. Elles ne seront jamais partagées avec des tiers. Consultez notre')} <Link to="/privacy">{t('pages.contact.privacyLink', 'politique de confidentialité')}</Link>.</p>
                </div>
              </form>
            </div>

            {/* Carte supplémentaire sous le formulaire */}
            <div className="card card--extra">
              <div className="contact-extra-grid">
                <div className="contact-extra-item">
                  <div className="contact-extra-icon"><i className="fas fa-book-open" /></div>
                  <h4>{t('pages.contact.extraCatalogTitle', 'Catalogue')}</h4>
                  <p>{t('pages.contact.extraCatalogDesc', "Plus de 500 livres disponibles, du roman à la poésie en passant par l'essai et la BD.")}</p>
                  <Link to="/catalog" className="contact-extra-link">{t('pages.contact.extraCatalogLink', 'Explorer')} <i className="fas fa-arrow-right" /></Link>
                </div>
                <div className="contact-extra-item">
                  <div className="contact-extra-icon"><i className="fas fa-users" /></div>
                  <h4>{t('pages.contact.extraCommunityTitle', 'Communauté')}</h4>
                  <p>{t('pages.contact.extraCommunityDesc', 'Rejoignez des clubs de lecture, suivez vos auteurs préférés et partagez vos découvertes.')}</p>
                  <Link to="/clubs" className="contact-extra-link">{t('pages.contact.extraCommunityLink', 'Découvrir')} <i className="fas fa-arrow-right" /></Link>
                </div>
                <div className="contact-extra-item">
                  <div className="contact-extra-icon"><i className="fas fa-feather-alt" /></div>
                  <h4>{t('pages.contact.extraAuthorsTitle', 'Auteurs')}</h4>
                  <p>{t('pages.contact.extraAuthorsDesc', "Soumettez votre manuscrit directement à la maison d'édition de votre choix.")}</p>
                  <Link to="/submit-manuscript" className="contact-extra-link">{t('pages.contact.extraAuthorsLink', 'Soumettre')} <i className="fas fa-arrow-right" /></Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── SIDEBAR INFO ── */}
          <aside className="contact-sidebar">

            {/* Email */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-envelope" /></span>
                <h3>{t('pages.contact.email', 'Email')}</h3>
              </div>
              <p>
                <a href="mailto:contact@frollot.com" className="info-link">
                  contact@frollot.com <i className="fas fa-arrow-right" />
                </a>
              </p>
            </div>

            {/* WhatsApp */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fab fa-whatsapp" /></span>
                <h3>WhatsApp</h3>
              </div>
              <p>
                <a href="https://wa.me/24165348887" className="info-link" target="_blank" rel="noopener noreferrer">
                  +241 65 34 88 87 <i className="fas fa-arrow-right" />
                </a>
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginTop: '0.25rem' }}>{t('pages.contact.whatsappHint', 'Réponse rapide du lundi au samedi')}</p>
            </div>

            {/* Horaires */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-clock" /></span>
                <h3>{t('pages.contact.supportHoursTitle', 'Horaires du support')}</h3>
              </div>
              <p>{t('pages.contact.hoursWeekday', 'Lun – Ven · 8h – 18h (GMT+1)')}</p>
              <p>{t('pages.contact.hoursSaturday', 'Sam · 10h – 16h')}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginTop: '0.25rem' }}>{t('pages.contact.hoursNote', 'Emails traités sous 24h, même le week-end')}</p>
            </div>

            {/* FAQ */}
            <div className="card card--sm card--faq">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-question-circle" /></span>
                <h3>{t('pages.contact.faqTitle', 'Questions fréquentes')}</h3>
              </div>
              <div className="faq-list">
                <div className="faq-item">
                  <p className="faq-q">{t('pages.contact.faq1Q', 'Comment passer commande ?')}</p>
                  <p className="faq-a">{t('pages.contact.faq1A', 'Ajoutez des livres au panier, puis finalisez via Mobicash, Airtel Money, carte Visa ou espèces à la livraison.')}</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">{t('pages.contact.faq2Q', 'Comment soumettre un manuscrit ?')}</p>
                  <p className="faq-a">{t('pages.contact.faq2A', 'Rendez-vous sur la page')} <Link to="/submit-manuscript" className="info-link">{t('pages.contact.faq2ALink', 'Soumettre un manuscrit')}</Link>{t('pages.contact.faq2AEnd', ', choisissez votre éditeur cible et uploadez votre fichier.')}</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">{t('pages.contact.faq3Q', 'Comment rejoindre un club de lecture ?')}</p>
                  <p className="faq-a">{t('pages.contact.faq3A', 'Parcourez les')} <Link to="/clubs" className="info-link">{t('pages.contact.faq3ALink', 'clubs de lecture')}</Link>{t('pages.contact.faq3AEnd', ', cliquez sur celui qui vous intéresse et appuyez sur « Rejoindre ».')}</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">{t('pages.contact.faq4Q', 'Comment créer ma vitrine d\'organisation ?')}</p>
                  <p className="faq-a">{t('pages.contact.faq4A', "Depuis votre profil, créez une organisation. Elle apparaîtra automatiquement dans l'")} <Link to="/organizations" className="info-link">{t('pages.contact.faq4ALink', 'annuaire')}</Link>.</p>
                </div>
                <div className="faq-item">
                  <p className="faq-q">{t('pages.contact.faq5Q', 'Comment devenir prestataire ?')}</p>
                  <p className="faq-a">{t('pages.contact.faq5A', 'Activez un profil professionnel (correcteur, illustrateur, traducteur) depuis votre compte, puis créez vos offres de service.')}</p>
                </div>
              </div>
            </div>

            {/* Raccourcis */}
            <div className="card card--sm">
              <div className="card--sm-header">
                <span className="card__ico"><i className="fas fa-bolt" /></span>
                <h3>{t('pages.contact.quickAccess', 'Accès rapide')}</h3>
              </div>
              <div className="contact-quick-links">
                <Link to="/faq" className="contact-quick-link"><i className="fas fa-question-circle" /> {t('pages.contact.linkFaq', 'FAQ complète')}</Link>
                <Link to="/support" className="contact-quick-link"><i className="fas fa-headset" /> {t('pages.contact.linkSupport', "Centre d'aide")}</Link>
                <Link to="/delivery" className="contact-quick-link"><i className="fas fa-truck" /> {t('pages.contact.linkDelivery', 'Infos livraison')}</Link>
                <Link to="/privacy" className="contact-quick-link"><i className="fas fa-shield-alt" /> {t('pages.contact.linkPrivacy', 'Confidentialité')}</Link>
              </div>
            </div>

            {/* Réseaux */}
            <div className="card card--sm card--social">
              <h3>{t('pages.contact.findUs', 'Retrouvez-nous')}</h3>
              <div className="social-links">
                <a href="https://www.facebook.com/frollot" className="social-link social-link--facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-facebook-f" />
                  <span>Facebook</span>
                </a>
                <a href="https://www.instagram.com/frollot" className="social-link social-link--instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-instagram" />
                  <span>Instagram</span>
                </a>
                <a href="https://www.linkedin.com/company/frollot" className="social-link social-link--linkedin" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
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
