import React from 'react';
import '../styles/PageHero.css';

/**
 * PageHero — Composant hero unifié pour toutes les pages Frollot.
 *
 * Props :
 *   title       (string|node)  — Titre principal (h1)
 *   subtitle    (string|node)  — Sous-titre (p)
 *   icon        (string)       — Classe FontAwesome optionnelle (ex: "fas fa-key")
 *   pill        (string|node)  — Texte/noeud de la pill badge
 *   orbCount    (2|3)          — Nombre d'orbes (défaut: 2)
 *   hasShine    (bool)         — Ajoute le halo radial (Login/Register)
 *   hasLine     (bool)         ��� Affiche la ligne accent (défaut: true)
 *   hasFade     (bool)         — Affiche le dégradé hero→contenu (défaut: true)
 *   className   (string)       — Classe(s) CSS additionnelle(s) sur la section
 *   children    (node)         — Contenu optionnel sous le sous-titre (stats, CTA…)
 */
const PageHero = React.memo(function PageHero({
  title,
  subtitle,
  icon,
  pill,
  orbCount = 2,
  hasShine = false,
  hasLine = true,
  hasFade = true,
  className = '',
  children,
}) {
  return (
    <>
      <section className={`page-hero ${className}`.trim()}>
        {/* Fond */}
        <div className="page-hero__grid-bg" />
        <div className="page-hero__orb page-hero__orb--1" />
        <div className="page-hero__orb page-hero__orb--2" />
        {orbCount >= 3 && <div className="page-hero__orb page-hero__orb--3" />}
        {hasShine && <div className="page-hero__shine" />}

        {/* Contenu */}
        <div className="page-hero__inner">
          {pill && <div className="page-hero__pill">{pill}</div>}
          {icon && (
            <div className="page-hero__icon">
              <i className={icon} />
            </div>
          )}
          {hasLine && <div className="page-hero__line" />}
          <h1 className="page-hero__title">{title}</h1>
          {subtitle && <p className="page-hero__sub">{subtitle}</p>}
          {children && <div className="page-hero__extra">{children}</div>}
        </div>
      </section>
      {hasFade && <div className="page-hero-fade" />}
    </>
  );
});

export default PageHero;
