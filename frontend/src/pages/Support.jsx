import { Link } from 'react-router-dom';
import '../styles/Support.css';

const Support = () => {
  return (
    <div className="support-page">
      <section className="support-hero">
        <div className="support-hero__orb support-hero__orb--1" />
        <div className="support-hero__grid-bg" />
        <div className="support-hero__inner">
          <div className="support-hero__line" />
          <h1 className="support-hero__title">Support & Aide</h1>
          <p className="support-hero__sub">
            Notre équipe est à votre disposition pour répondre à toutes vos questions.
          </p>
        </div>
      </section>

      <div className="support-hero-fade" />

      <div className="support-content">
        <p className="support-intro">
          Que vous ayez une question sur une commande, un problème technique ou besoin d&apos;informations sur nos services, nous sommes là pour vous aider. Choisissez le canal qui vous convient le mieux.
        </p>

        <div className="support-grid">
          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-envelope" />
            </div>
            <h2>Email</h2>
            <p>Pour toute question, écrivez-nous à <a href="mailto:terrenoireeditions@gmail.com">terrenoireeditions@gmail.com</a>. Nous répondons généralement sous 24 heures, du lundi au samedi.</p>
            <p>Indiquez votre numéro de commande si votre demande concerne une livraison ou un retour.</p>
          </div>

          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-phone-alt" />
            </div>
            <h2>Téléphone</h2>
            <p>Appelez-nous pour une réponse rapide :</p>
            <ul>
              <li><a href="tel:+24165348887">+241 65 34 88 87</a></li>
              <li><a href="tel:+24176593535">+241 76 59 35 35</a></li>
            </ul>
            <p>Horaires : Lundi-Vendredi 7h30-18h30, Samedi 10h-18h30.</p>
          </div>

          <div className="support-card">
            <div className="support-card__icon">
              <i className="fas fa-map-marker-alt" />
            </div>
            <h2>Adresse</h2>
            <p>Vous pouvez aussi nous rendre visite à notre siège :</p>
            <p><strong>Avenue Ivan Le Terrible, Port-Gentil, Gabon</strong></p>
            <p>Nous vous accueillons sur place pour toute question relative à nos ouvrages, à la soumission de manuscrits ou aux commandes en cours.</p>
          </div>

          <div className="support-card support-card--wide">
            <div className="support-card__icon">
              <i className="fas fa-edit" />
            </div>
            <h2>Formulaire de contact</h2>
            <p>Utilisez notre formulaire en ligne pour nous envoyer un message structuré. Idéal pour les demandes détaillées, les réclamations ou les propositions de partenariat.</p>
            <Link to="/contact" className="support-btn support-btn--primary">Accéder au formulaire</Link>
          </div>
        </div>

        <div className="support-links">
          <h3>Ressources utiles</h3>
          <div className="support-links__grid">
            <Link to="/faq" className="support-link">
              <i className="fas fa-question-circle" />
              <span>FAQ</span>
            </Link>
            <Link to="/delivery" className="support-link">
              <i className="fas fa-truck" />
              <span>Livraison & Retours</span>
            </Link>
            <Link to="/cgv" className="support-link">
              <i className="fas fa-file-contract" />
              <span>CGV</span>
            </Link>
            <Link to="/submit-manuscript" className="support-link">
              <i className="fas fa-file-upload" />
              <span>Soumettre un manuscrit</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="support-footer-fade" />
    </div>
  );
};

export default Support;
