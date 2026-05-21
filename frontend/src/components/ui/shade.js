/**
 * Shade a hex color by amount (-100..100).
 * Negative = darker, positive = lighter.
 */
export function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 0xff,
    g = (n >> 8) & 0xff,
    b = n & 0xff;
  const a = amount / 100;
  r = Math.round(r + (a < 0 ? r : 255 - r) * a);
  g = Math.round(g + (a < 0 ? g : 255 - g) * a);
  b = Math.round(b + (a < 0 ? b : 255 - b) * a);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
