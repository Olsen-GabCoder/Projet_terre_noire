import { useState, useEffect, useRef, useCallback } from 'react';
import { CGU_SECTIONS, CGU_LAST_UPDATED } from '../data/cgu-content';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import '../styles/Terms.css';

const STORAGE_KEY = 'frollot_cgu_reading';

const Terms = () => {
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const resumeRef = useRef(null);
  const hasRestoredRef = useRef(false);

  const formattedDate = new Date(CGU_LAST_UPDATED + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Barre de progression ──
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Tracking de la section courante (IntersectionObserver) ──
  useEffect(() => {
    const observers = [];
    CGU_SECTIONS.forEach(section => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setCurrentSection(section.id);
        },
        { rootMargin: '-20% 0px -70% 0px' },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  // ── Sauvegarde position de lecture ──
  useEffect(() => {
    if (!currentSection) return;
    const data = { sectionId: currentSection, scrollY: window.scrollY, ts: Date.now() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [currentSection]);

  // ── Restauration au chargement ──
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      // Expire après 30 jours
      if (Date.now() - data.ts > 30 * 24 * 60 * 60 * 1000) return;
      // Ne proposer que si on n'est pas déjà sur la bonne section (lien direct avec hash)
      if (data.sectionId && data.sectionId !== CGU_SECTIONS[0].id && !window.location.hash) {
        resumeRef.current = data;
        setShowResume(true);
        // Auto-dismiss après 8 secondes
        setTimeout(() => setShowResume(false), 8000);
      }
    } catch {}
  }, []);

  const handleResume = useCallback(() => {
    if (!resumeRef.current) return;
    const el = document.getElementById(resumeRef.current.sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowResume(false);
  }, []);

  const handleDismissResume = useCallback(() => {
    setShowResume(false);
  }, []);

  // Nom lisible de la section sauvegardée
  const savedSectionTitle = resumeRef.current
    ? CGU_SECTIONS.find(s => s.id === resumeRef.current.sectionId)?.title || ''
    : '';

  return (
    <div className="terms-page">
      <SEO
        title="Conditions générales d'utilisation"
        description="Conditions générales d'utilisation de la plateforme Frollot — droits, obligations, propriété intellectuelle, services et règlement des litiges."
      />

      {/* Barre de progression de lecture */}
      <div className="terms-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
        <div className="terms-progress__bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Bandeau reprendre la lecture */}
      {showResume && (
        <div className="terms-resume">
          <div className="terms-resume__inner">
            <i className="fas fa-bookmark" />
            <span>Reprendre la lecture — <strong>{savedSectionTitle}</strong></span>
            <button className="terms-resume__btn" onClick={handleResume}>Reprendre</button>
            <button className="terms-resume__close" onClick={handleDismissResume} aria-label="Fermer">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      )}

      <PageHero
        title="Conditions générales d'utilisation"
        subtitle="Les règles qui régissent l'utilisation de la plateforme Frollot"
      />

      <article className="terms-article">
        <div className="terms-meta">
          <time dateTime={CGU_LAST_UPDATED}>
            <i className="fas fa-calendar-alt" /> Dernière mise à jour : {formattedDate}
          </time>
        </div>

        {CGU_SECTIONS.map(section => (
          <section key={section.id} id={section.id} className="terms-section">
            <h2>
              <span className="terms-section__number">{section.number}.</span> {section.title}
            </h2>
            <div className="terms-section__body" dangerouslySetInnerHTML={{ __html: section.content }} />
          </section>
        ))}
      </article>

      <div className="terms-footer-fade" />
    </div>
  );
};

export default Terms;
