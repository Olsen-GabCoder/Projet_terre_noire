import React from 'react';

export default function RouteSuspenseFallback() {
  return (
    <div
      aria-label="Chargement de la page"
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-cream, #FAFAF5)',
        gap: '1.25rem',
      }}
    >
      <div className="route-fallback-spinner" />
      <p
        style={{
          fontFamily: 'var(--ds-serif, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: '1rem',
          color: 'var(--ds-gray-500, #6B6B6B)',
          margin: 0,
          letterSpacing: '0.01em',
        }}
      >
        Chargement&hellip;
      </p>
      <style>{`
        .route-fallback-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--ds-orange-100, #F9DCC8);
          border-top-color: var(--ds-orange, #E8601C);
          border-radius: 50%;
          animation: rfs-spin 0.8s linear infinite;
        }
        @keyframes rfs-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-fallback-spinner {
            animation: none;
            border-top-color: var(--ds-orange, #E8601C);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
