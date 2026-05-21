import React from 'react';

export default function TnDivider({ style, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      color: dark ? 'rgba(255,255,255,0.35)' : 'var(--tn-gold)',
      ...style,
    }}>
      <span style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
      <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
        <path d="M0 4 L4 0 L8 4 L12 0 L16 4 L20 0 L24 4" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
    </div>
  );
}
