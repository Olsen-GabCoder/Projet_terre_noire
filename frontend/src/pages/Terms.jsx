import { Link } from 'react-router-dom';
import '../styles/Terms.css';

const Terms = () => (
  <div className="terms-page">
    <section className="terms-hero">
      <div className="terms-hero__orb terms-hero__orb--1" />
      <div className="terms-hero__grid-bg" />
      <div className="terms-hero__inner">
        <div className="terms-hero__line" />
        <h1 className="terms-hero__title">Conditions générales d&apos;utilisation</h1>
        <p className="terms-hero__sub">Conditions d&apos;utilisation du site Terre Noire Éditions.</p>
      </div>
    </section>
    <div className="terms-hero-fade" />
    <div className="terms-content">
      <p className="terms-intro">L&apos;accès au site est soumis aux présentes conditions. En naviguant, vous les acceptez.</p>
      <div className="terms-card">
        <h2>1. Objet</h2>
        <p>Les CGU régissent l&apos;accès au site de Terre Noire Éditions (Port-Gentil, Gabon) : catalogue, commandes, informations auteurs.</p>
        <h2>2. Accès</h2>
        <p>L&apos;accès est libre. Certaines fonctionnalités (commande, espace client) nécessitent une inscription. Nous pouvons modifier ou interrompre le site sans préavis.</p>
        <h2>3. Utilisation</h2>
        <p>Utilisation conforme aux lois. Interdits : fraude, piratage, contenus illicites, spam.</p>
        <h2>4. Propriété intellectuelle</h2>
        <p>Contenus protégés. Toute reproduction non autorisée est interdite.</p>
        <h2>5. Données</h2>
        <p>Voir notre <Link to="/privacy">politique de confidentialité</Link>.</p>
        <h2>6. Droit applicable</h2>
        <p>Droit gabonais. Contact : terrenoireeditions@gmail.com ou +241 65 34 88 87.</p>
        <div className="terms-cta">
          <Link to="/cgv" className="terms-btn terms-btn--primary">Voir les CGV</Link>
          <Link to="/contact" className="terms-btn terms-btn--outline">Nous contacter</Link>
        </div>
      </div>
    </div>
    <div className="terms-footer-fade" />
  </div>
);

export default Terms;
