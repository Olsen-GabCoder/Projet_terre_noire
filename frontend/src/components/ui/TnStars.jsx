import React from 'react';

export default function TnStars({ value = 4.5, size = 'sm', count }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className={`tn-stars ${size === 'lg' ? 'tn-stars--lg' : ''}`}>
        {[0, 1, 2, 3, 4].map(i => (
          <i
            key={i}
            className={
              i < full
                ? 'fas fa-star'
                : i === full && half
                  ? 'fas fa-star-half-alt'
                  : 'far fa-star'
            }
          />
        ))}
      </span>
      {count != null ? (
        <span style={{ fontSize: 12, color: 'var(--tn-gray-500)', fontWeight: 500 }}>
          {value.toFixed(1)} · {count} avis
        </span>
      ) : null}
    </span>
  );
}
