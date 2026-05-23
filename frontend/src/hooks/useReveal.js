import { useEffect, useRef, useState } from 'react';

/**
 * useReveal — IntersectionObserver scroll reveal hook (Vague 6.B)
 *
 * Usage:
 *   const { ref, isVisible } = useReveal();
 *   <section ref={ref} className={`tn-reveal ${isVisible ? 'tn-reveal--visible' : ''}`}>
 */
export default function useReveal({
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
  once = true,
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setIsVisible(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
