import React from 'react';

function formatFCFA(n) {
  return n.toLocaleString('fr-FR').replace(/,/g, ' ');
}

export default function TnPrice({ amount, oldAmount, size = 'md' }) {
  const fs = size === 'lg' ? 32 : size === 'sm' ? 16 : 22;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
      <span className="tn-price" style={{ fontSize: fs, lineHeight: 1 }}>
        {formatFCFA(amount)}
        <span className="tn-price__currency">FCFA</span>
      </span>
      {oldAmount ? (
        <span className="tn-price__strike" style={{ fontSize: fs * 0.55 }}>
          {formatFCFA(oldAmount)} FCFA
        </span>
      ) : null}
    </span>
  );
}
