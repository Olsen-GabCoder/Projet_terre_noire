import { Link } from 'react-router-dom';
import '../styles/Cookies.css';

const Cookies = () => (
  <div className="cookies-page">
    <section className="cookies-hero">
      <div className="cookies-hero__orb cookies-hero__orb--1" />
      <div className="cookies-hero__grid-bg" />
      <div className="cookies-hero__inner">
        <div className="cookies-hero__line" />
        <h1 className="cookies-hero__title">Politique de cookies</h1>
        <p className="cookies-hero__sub">Comment nous utilisons les cookies sur notre site.</p>
      </div>
    </section>
    <div className="cookies-hero-fade" />
    <div className="cookies-content">
      <p className="cookies-intro">Ce site utilise des cookies pour améliorer votre expérience et le fonctionnement de nos services.</p>
      <div className="cookies-card">
        <h2>Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p>Un cookie est un petit fichier stocké par votre navigateur. Il mémorise des informations (session, préférences) pour une navigation plus fluide.</p>
        <h2>Types de cookies</h2>
        <p><strong>Essentiels :</strong> connexion, panier, sécurité. <strong>Préférences :</strong> langue, affichage. <strong>Analytiques :</strong> statistiques de visite.</p>
        <h2>Gestion</h2>
        <p>Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies. Désactiver certains cookies peut limiter des fonctionnalités.</p>
        <h2>Données</h2>
        <p>Voir notre <Link to="/privacy">politique de confidentialité</Link>.</p>
        <div className="cookies-cta">
          <Link to="/privacy" className="cookies-btn cookies-btn--primary">Politique de confidentialité</Link>
          <Link to="/contact" className="cookies-btn cookies-btn--outline">Nous contacter</Link>
        </div>
      </div>
    </div>
    <div className="cookies-footer-fade" />
  </div>
);

export default Cookies;
