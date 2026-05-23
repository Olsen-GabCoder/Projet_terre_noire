import { useEffect, useState } from 'react';

/**
 * useCountUp — Animated counter hook (Vague 6.F)
 *
 * Animates a number from 0 to target over a duration.
 *
 * Usage:
 *   const value = useCountUp(target, duration, active);
 *   <span>{value}</span>
 *
 * @param {number|string} target — Final number to count to
 * @param {number} duration — Animation duration in ms (default 1800)
 * @param {boolean} active — Trigger animation (default false)
 * @returns {number|string} — Current animated value
 */
export default function useCountUp(target, duration = 1800, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    const num = parseInt(target, 10);
    if (isNaN(num)) { setValue(target); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(num / (duration / 16)));
    const id = setInterval(() => {
      start += step;
      if (start >= num) { setValue(num); clearInterval(id); }
      else setValue(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return value;
}
