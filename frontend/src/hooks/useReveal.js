import { useRef, useEffect } from 'react';

/**
 * useReveal — Déclenche une classe CSS au scroll (IntersectionObserver).
 *
 * @param {Object}  options
 * @param {number}  options.threshold  — Seuil de visibilité (0-1, défaut 0.1)
 * @param {string}  options.rootMargin — Marge de l'observer
 * @param {boolean} options.stagger    — Ajoute aussi la classe `stagger-children`
 * @returns {React.RefObject}
 */
export function useReveal({ threshold = 0.1, rootMargin, stagger = false } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respecte la préférence utilisateur
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // Ajouter la classe stagger au montage (avant is-visible)
  useEffect(() => {
    if (stagger && ref.current) {
      ref.current.classList.add('stagger-children');
    }
  }, [stagger]);

  return ref;
}

export default useReveal;
