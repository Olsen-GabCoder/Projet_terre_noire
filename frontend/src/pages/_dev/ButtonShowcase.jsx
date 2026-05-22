/**
 * ButtonShowcase — Dev-only visual validation page for TnButton
 * Route: /dev/buttons (gated by import.meta.env.DEV)
 */
import React, { useState } from 'react';
import TnButton from '../../components/ui/TnButton';

const VARIANTS = ['primary', 'secondary', 'dark', 'outline', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

function Section({ title, dark, children }) {
  return (
    <div style={{
      marginBottom: 40,
      padding: 24,
      borderRadius: 12,
      background: dark ? 'var(--ds-black, #0A0A0A)' : 'var(--ds-white, #fff)',
      border: dark ? 'none' : '1px solid var(--ds-gray-200, #E5E2DA)',
    }}>
      <h3 style={{
        fontFamily: 'var(--ds-sans, sans-serif)',
        fontSize: 13, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: dark ? 'var(--ds-gray-400, #9A9A9A)' : 'var(--ds-gray-500, #6B6B6B)',
        margin: '0 0 16px',
      }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export default function ButtonShowcase() {
  const [clickLog, setClickLog] = useState([]);
  const log = (msg) => setClickLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 10));

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'var(--ds-sans, sans-serif)',
    }}>
      <h1 style={{
        fontFamily: 'var(--ds-serif, Georgia, serif)',
        fontSize: 28, marginBottom: 8,
      }}>TnButton Showcase</h1>
      <p style={{ color: 'var(--ds-gray-500, #6B6B6B)', fontSize: 14, marginBottom: 32 }}>
        Composant React wrapper pour les classes .tn-btn elevees (Vague 2 P2.1).
        Testez hover, active (maintenez le clic), focus (Tab), disabled et loading.
      </p>

      {/* All variants × default */}
      <Section title="Toutes les variantes (taille medium)">
        {VARIANTS.map(v => (
          <TnButton key={v} variant={v} onClick={() => log(`click: ${v}`)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </TnButton>
        ))}
      </Section>

      {/* Outline-light on dark */}
      <Section title="Outline-light (fond sombre)" dark>
        <TnButton variant="outline-light" size="sm" onClick={() => log('click: outline-light sm')}>Small</TnButton>
        <TnButton variant="outline-light" onClick={() => log('click: outline-light')}>Medium</TnButton>
        <TnButton variant="outline-light" size="lg" onClick={() => log('click: outline-light lg')}>Large</TnButton>
      </Section>

      {/* Sizes for primary */}
      <Section title="Tailles (primary)">
        {SIZES.map(s => (
          <TnButton key={s} variant="primary" size={s} onClick={() => log(`click: primary ${s}`)}>
            {s.toUpperCase()}
          </TnButton>
        ))}
      </Section>

      {/* With icons */}
      <Section title="Avec icones">
        <TnButton variant="primary" leftIcon={<i className="fas fa-cart-plus" />} onClick={() => log('click: icon left')}>
          Ajouter au panier
        </TnButton>
        <TnButton variant="outline" rightIcon={<i className="fas fa-arrow-right" />} onClick={() => log('click: icon right')}>
          Voir le catalogue
        </TnButton>
        <TnButton variant="danger" leftIcon={<i className="fas fa-trash" />} onClick={() => log('click: danger icon')}>
          Supprimer
        </TnButton>
        <TnButton variant="secondary" leftIcon={<i className="fas fa-arrow-left" />} onClick={() => log('click: back')}>
          Retour
        </TnButton>
      </Section>

      {/* Disabled */}
      <Section title="Disabled">
        {VARIANTS.map(v => (
          <TnButton key={v} variant={v} disabled onClick={() => log('BUG: disabled click fired!')}>
            {v}
          </TnButton>
        ))}
      </Section>

      {/* Loading */}
      <Section title="Loading">
        {VARIANTS.map(v => (
          <TnButton key={v} variant={v} loading onClick={() => log('BUG: loading click fired!')}>
            {v}...
          </TnButton>
        ))}
      </Section>

      {/* Block */}
      <Section title="Block (full width)">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TnButton variant="primary" size="lg" block leftIcon={<i className="fas fa-paper-plane" />} onClick={() => log('click: block primary')}>
            Finaliser la commande
          </TnButton>
          <TnButton variant="secondary" block onClick={() => log('click: block secondary')}>
            Continuer mes achats
          </TnButton>
          <TnButton variant="danger" block disabled>
            Action indisponible
          </TnButton>
        </div>
      </Section>

      {/* Interactive state test */}
      <Section title="Test interactif — cliquez pour verifier onClick">
        <TnButton variant="primary" onClick={() => log('click: test normal')}>
          Normal (doit logger)
        </TnButton>
        <TnButton variant="primary" disabled onClick={() => log('BUG: disabled clicked!')}>
          Disabled (ne doit PAS logger)
        </TnButton>
        <TnButton variant="primary" loading onClick={() => log('BUG: loading clicked!')}>
          Loading (ne doit PAS logger)
        </TnButton>
      </Section>

      {/* Click log */}
      {clickLog.length > 0 && (
        <div style={{
          marginTop: 24, padding: 16, background: 'var(--ds-black, #0A0A0A)',
          borderRadius: 8, fontFamily: 'var(--ds-mono, monospace)', fontSize: 12,
          color: 'var(--ds-cream, #FAFAF5)', maxHeight: 200, overflowY: 'auto',
        }}>
          <div style={{ color: 'var(--ds-gray-400, #9A9A9A)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>
            Click Log
          </div>
          {clickLog.map((entry, i) => (
            <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
