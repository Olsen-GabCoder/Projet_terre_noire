import { useRef, useEffect } from 'react';
import '../styles/SectionSeparator.css';

const paths = {
  1: {
    fill:  'M0,0 L1440,0 L1440,55 C1200,82 980,38 720,62 C460,86 220,40 0,68 Z',
    back:  'M0,0 L1440,0 L1440,67 C1180,90 980,55 720,76 C460,95 220,58 0,82 Z',
    trace: 'M0,68 C220,40 460,86 720,62 C980,38 1200,82 1440,55',
  },
  2: {
    fill:  'M0,0 L1440,0 L1440,48 C1180,72 940,32 700,56 C460,80 240,42 0,64 Z',
    back:  'M0,0 L1440,0 L1440,62 C1180,82 940,48 700,68 C460,92 240,55 0,76 Z',
    trace: 'M0,64 C240,42 460,80 700,56 C940,32 1180,72 1440,48',
  },
  3: {
    fill:  'M0,0 L1440,0 L1440,62 C1240,38 1000,80 740,58 C480,36 240,76 0,52 Z',
    back:  'M0,0 L1440,0 L1440,75 C1240,55 1000,92 740,72 C480,52 240,90 0,68 Z',
    trace: 'M0,52 C240,76 480,36 740,58 C1000,80 1240,38 1440,62',
  },
};

const dots = {
  1: { left: { cx: 0, cy: 68 }, right: { cx: 1440, cy: 55 } },
  2: { left: { cx: 0, cy: 64 }, right: { cx: 1440, cy: 48 } },
  3: { left: { cx: 0, cy: 52 }, right: { cx: 1440, cy: 62 } },
};

const particles = {
  1: [{ cx: 200, cy: 58, r: 1.8 }, { cx: 450, cy: 74, r: 2.2 }, { cx: 720, cy: 62, r: 2.6 }, { cx: 990, cy: 52, r: 2.0 }, { cx: 1240, cy: 71, r: 1.7 }],
  2: [{ cx: 180, cy: 54, r: 1.8 }, { cx: 480, cy: 69, r: 2.0 }, { cx: 700, cy: 56, r: 2.6 }, { cx: 980, cy: 46, r: 2.2 }, { cx: 1260, cy: 62, r: 1.7 }],
  3: [{ cx: 210, cy: 68, r: 1.8 }, { cx: 490, cy: 48, r: 2.0 }, { cx: 740, cy: 58, r: 2.6 }, { cx: 1010, cy: 72, r: 2.2 }, { cx: 1280, cy: 48, r: 1.7 }],
};

const FILL_MAP = {
  'dark-to-cream':  { fill: 'url(#fill-dark)', back: 'url(#fill-dark-back)' },
  'cream-to-dark':  { fill: 'url(#fill-creamdark)', back: 'url(#fill-creamdark-back)' },
  'cream-to-cream': { fill: 'url(#fill-creamcream)', back: 'url(#fill-creamcream-back)' },
};

const SectionSeparator = ({ direction = 'dark-to-cream', variant = 1 }) => {
  const ref = useRef(null);
  const v = paths[variant] || paths[1];
  const d = dots[variant] || dots[1];
  const p = particles[variant] || particles[1];
  const fills = FILL_MAP[direction] || FILL_MAP['dark-to-cream'];
  const mist = direction === 'cream-to-cream' ? 'url(#mist-soft)' : 'url(#mist-warm)';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { el.classList.add('in-view'); return; }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          obs.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`sep sep-${direction}`} role="presentation" aria-hidden="true">
      <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className="sep-svg">
        <rect className="mist-layer" x="0" y="0" width="1440" height="110" fill={mist} />
        <path className="wave-back" d={v.back} fill={fills.back} />
        <path className="wave-fill" d={v.fill} fill={fills.fill} />
        <path className="wave-glow" d={v.trace} />
        <path className="wave-trace" d={v.trace} />
        <circle className="wave-dot" cx={d.left.cx} cy={d.left.cy} r="2.5" />
        <circle className="wave-dot" cx={d.right.cx} cy={d.right.cy} r="2.5" />
        {p.map((pt, i) => (
          <circle key={i} className={`particle particle-${i + 1}`} cx={pt.cx} cy={pt.cy} r={pt.r} />
        ))}
      </svg>
    </div>
  );
};

export default SectionSeparator;
