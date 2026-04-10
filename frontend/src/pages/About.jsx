import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReveal } from '../hooks/useReveal';
import '../styles/About.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const About = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  return (
    <div className="about-page">
      <SEO title={t('pages.about.heroTitle', 'Frollot')} />
      <PageHero
        title={t('pages.about.heroTitle', 'Frollot')}
        subtitle={<>{t('pages.about.heroSub1', "Maison d'édition gabonaise à Port-Gentil.")}<br />{t('pages.about.heroSub2', 'Au service des auteurs et des lecteurs.')}</>}
      />

      {/* ── CONTENU BENTO GRID ── */}
      <div ref={revealRef} className="about-content reveal-section">
        <div className="about-layout">

          {/* Mission & Vision */}
          <div className="card card--md">
            <span className="card__tag">Notre ADN</span>
            <h2>{t('pages.about.mission', 'Mission')}</h2>
            <p>Publier et diffuser des œuvres de qualité au Gabon et au-delà. Nous croyons au pouvoir du livre pour faire grandir les lecteurs et donner une voix aux auteurs.</p>
          </div>
          <div className="card card--md">
            <span className="card__tag">Notre ADN</span>
            <h2>{t('pages.about.vision', 'Vision')}</h2>
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
            <h2>{t('pages.about.history', 'Histoire & Ancrage')}</h2>
            <p>Frollot est établie à <strong>Port-Gentil, avenue Ivan Le Terrible</strong>. Nous nous consacrons à l'édition, la diffusion et la promotion d'œuvres littéraires.</p>
            <p>Notre objectif : donner une voix aux talents du Gabon et de la sous-région en rendant leurs livres accessibles.</p>
          </div>

          {/* Projets */}
          <div className="card card--md">
            <span className="card__tag">Nos Actions</span>
            <h2>{t('pages.about.projects', 'Grands Projets')}</h2>
            <ul className="project-list">
              <li><strong>Conférences</strong> — Rencontres auteurs & lecteurs</li>
              <li><strong>Édition</strong> — Romans, essais, poésie</li>
              <li><strong>Produits</strong> — Objets pour la communauté</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="card card--cta">
            <div>
              <h2>{t('pages.about.ctaTitle', "Rejoignez l'aventure")}</h2>
              <p>{t('pages.about.ctaSub', 'Lecteur ou auteur, votre place est parmi nous.')}</p>
            </div>
            <div className="cta-btns">
              <Link to="/catalog" className="btn btn--primary">{t('pages.about.discoverBooks', 'Découvrir nos livres')}</Link>
              <Link to="/contact" className="btn btn--outline">{t('nav.contact', 'Contactez-nous')}</Link>
            </div>
          </div>

        </div>
      </div>

      <div className="about-footer-fade" />
    </div>
  );
};

export default About;
