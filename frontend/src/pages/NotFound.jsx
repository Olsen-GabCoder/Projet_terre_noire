import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => (
  <div className="notfound-page">
    <section className="notfound-hero">
      <div className="notfound-hero__orb notfound-hero__orb--1" />
      <div className="notfound-hero__grid-bg" />
      <div className="notfound-hero__inner">
        <div className="notfound-hero__code">404</div>
        <div className="notfound-hero__line" />
        <h1 className="notfound-hero__title">Page non trouvée</h1>
        <p className="notfound-hero__sub">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="notfound-hero__actions">
          <Link to="/" className="notfound-btn notfound-btn--primary">
            <i className="fas fa-home" /> Retour à l&apos;accueil
          </Link>
          <Link to="/catalog" className="notfound-btn notfound-btn--outline">
            <i className="fas fa-book" /> Voir le catalogue
          </Link>
        </div>
      </div>
    </section>
    <div className="notfound-footer-fade" />
  </div>
);

export default NotFound;
