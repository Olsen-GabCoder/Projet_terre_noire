import { Link } from 'react-router-dom';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-page">

      {/* ── HERO COMPACT ── */}
      <section className="about-hero">
        <div className="about-hero__orb about-hero__orb--1" />
        <div className="about-hero__grid-bg" />
        
        <div className="about-hero__inner">
          <div className="about-hero__line" />
          <h1 className="about-hero__title">Terre Noire Éditions</h1>
          <p className="about-hero__sub">
            Maison d'édition gabonaise à Port-Gentil.
            <br />
            Au service des auteurs et des lecteurs.
          </p>
        </div>
      </section>

      <div className="about-hero-fade" />

      {/* ── CONTENU BENTO GRID ── */}
      <div className="about-content">
        <div className="about-layout">

          {/* Mission & Vision */}
          <div className="card card--md">
            <span className="card__tag">Notre ADN</span>
            <h2>Mission</h2>
            <p>Publier et diffuser des œuvres de qualité au Gabon et au-delà. Nous croyons au pouvoir du livre pour faire grandir les lecteurs et donner une voix aux auteurs.</p>
          </div>
          <div className="card card--md">
            <span className="card__tag">Notre ADN</span>
            <h2>Vision</h2>
            <blockquote>« Créer un espace d'échange autour de la littérature, favoriser la découverte de nouveaux auteurs et développer le goût de la lecture. »</blockquote>
          </div>

          {/* Valeurs : 4 mini-cartes */}
          {[
            { ico: 'fas fa-bullseye', title: 'Excellence' },
            { ico: 'fas fa-handshake', title: 'Respect' },
            { ico: 'fas fa-seedling', title: 'Croissance' },
            { ico: 'fas fa-fire', title: 'Passion' },
          ].map((v) => (
            <div className="card card--mini" key={v.title}>
              <i className={`${v.ico} card__ico`} />
              <span>{v.title}</span>
            </div>
          ))}

          {/* Histoire */}
          <div className="card card--md card--wide">
            <span className="card__tag">Nos Racines</span>
            <h2>Histoire & Ancrage</h2>
            <p>Terre Noire Éditions est établie à <strong>Port-Gentil, avenue Ivan Le Terrible</strong>. Nous nous consacrons à l'édition, la diffusion et la promotion d'œuvres littéraires.</p>
            <p>Notre objectif : donner une voix aux talents du Gabon et de la sous-région en rendant leurs livres accessibles.</p>
          </div>

          {/* Projets */}
          <div className="card card--md">
            <span className="card__tag">Nos Actions</span>
            <h2>Grands Projets</h2>
            <ul className="project-list">
              <li><strong>Conférences</strong> — Rencontres auteurs & lecteurs</li>
              <li><strong>Édition</strong> — Romans, essais, poésie</li>
              <li><strong>Produits</strong> — Objets pour la communauté</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="card card--cta">
            <div>
              <h2>Rejoignez l'aventure</h2>
              <p>Lecteur ou auteur, votre place est parmi nous.</p>
            </div>
            <div className="cta-btns">
              <Link to="/catalog" className="btn btn--primary">Découvrir nos livres</Link>
              <Link to="/contact" className="btn btn--outline">Contactez-nous</Link>
            </div>
          </div>

        </div>
      </div>

      <div className="about-footer-fade" />
    </div>
  );
};

export default About;
