/**
 * TnStars — Star rating display + interactive (Vague 2.5 P3)
 *
 * Usage:
 *   <TnStars value={4.5} />
 *   <TnStars value={4.2} showCount count={38} size="md" />
 *   <TnStars interactive onChange={setRating} size="lg" />
 *   <TnStars value={4.5} variant="compact" />
 */
import React, { useState } from 'react';

const cn = (...c) => c.filter(Boolean).join(' ');

export default function TnStars({
  value = 0,
  max = 5,
  size = 'sm',
  count,
  showCount = false,
  showValue = false,
  interactive = false,
  onChange,
  variant = 'default',
  label,
  className = '',
  ...rest
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue ?? value;

  // Legacy compat: count != null without showCount → show count (old behavior)
  const effectiveShowCount = showCount || count != null;

  if (variant === 'compact') {
    return (
      <span
        className={cn('tn-stars', 'tn-stars--compact', size !== 'sm' && `tn-stars--${size}`, className)}
        role="img"
        aria-label={label || `Note ${value} sur ${max}`}
        {...rest}
      >
        <i className="fas fa-star tn-stars__star" aria-hidden="true" />
        <span className="tn-stars__value">{value.toFixed(1)}</span>
      </span>
    );
  }

  const stars = [];
  for (let i = 1; i <= max; i++) {
    const isFull = displayValue >= i;
    const isHalf = !isFull && displayValue >= i - 0.5;
    const icon = isHalf ? 'fa-star-half-stroke' : 'fa-star';
    const emptyClass = !isFull && !isHalf ? 'tn-stars__star--empty' : '';

    if (interactive) {
      stars.push(
        <button
          key={i}
          type="button"
          className={cn('tn-stars__star', emptyClass)}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => setHoverValue(i)}
          onMouseLeave={() => setHoverValue(null)}
          aria-label={`${i} sur ${max}`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <i className={`fas ${icon}`} aria-hidden="true" />
        </button>
      );
    } else {
      stars.push(
        <i key={i} className={cn('fas', icon, emptyClass)} aria-hidden="true" />
      );
    }
  }

  return (
    <span
      className={cn('tn-stars', size !== 'sm' && `tn-stars--${size}`, interactive && 'tn-stars--interactive', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label || `Note ${value} sur ${max}`}
      {...rest}
    >
      {stars}
      {showValue && <span className="tn-stars__value">{value.toFixed(1)}</span>}
      {effectiveShowCount && count != null && count > 0 && (
        <span className="tn-stars__count">
          {!showValue && `${value.toFixed(1)} · `}{count} avis
        </span>
      )}
    </span>
  );
}
