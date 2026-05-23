import { useEffect, useRef } from 'react';

/**
 * useParallax — Smooth scroll parallax hook (Vague 6.C)
 *
 * Usage:
 *   const { ref } = useParallax({ speed: 0.15 });
 *   <div ref={ref} className="tn-parallax">decorative elements</div>
 */
export default function useParallax({ speed = 0.15 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let ticking = false;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const translateY = -rect.top * speed;
      el.style.transform = `translateY(${translateY}px)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (el) el.style.transform = '';
    };
  }, [speed]);

  return { ref };
}
