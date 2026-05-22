/**
 * BadgeShowcase — Dev-only visual validation for TnBadge
 * Route: /dev/badges (gated by import.meta.env.DEV)
 */
import React from 'react';
import TnBadge from '../../components/ui/TnBadge';

const VARIANTS = ['promo', 'new', 'success', 'warning', 'danger', 'info', 'neutral'];
const STYLES = ['solid', 'soft', 'outline'];

function Section({ title, dark, children }) {
  return (
    <div style={{
      marginBottom: 40, padding: 24, borderRadius: 12,
      background: dark ? 'var(--ds-black, #0A0A0A)' : 'var(--ds-white, #fff)',
      border: dark ? 'none' : '1px solid var(--ds-gray-200, #E5E2DA)',
    }}>
      <h3 style={{
        fontFamily: 'var(--ds-sans)', fontSize: 13, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: dark ? 'var(--ds-gray-400)' : 'var(--ds-gray-500)',
        margin: '0 0 16px',
      }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export default function BadgeShowcase() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', fontFamily: 'var(--ds-sans)' }}>
      <h1 style={{ fontFamily: 'var(--ds-serif, Georgia)', fontSize: 28, marginBottom: 8 }}>
        TnBadge Showcase
      </h1>
      <p style={{ color: 'var(--ds-gray-500)', fontSize: 14, marginBottom: 32 }}>
        Systeme de badges centralise. 8 variantes x 3 styles x 3 tailles.
      </p>

      {/* Solid */}
      <Section title="Solid (defaut)">
        {VARIANTS.map(v => <TnBadge key={v} variant={v}>{v}</TnBadge>)}
        <TnBadge variant="count" count={3} />
        <TnBadge variant="count" count={12} />
        <TnBadge variant="count" count="99+" />
      </Section>

      {/* Soft */}
      <Section title="Soft">
        {VARIANTS.map(v => <TnBadge key={v} variant={v} badgeStyle="soft">{v}</TnBadge>)}
      </Section>

      {/* Outline */}
      <Section title="Outline">
        {VARIANTS.map(v => <TnBadge key={v} variant={v} badgeStyle="outline">{v}</TnBadge>)}
      </Section>

      {/* Sizes */}
      <Section title="Tailles (promo solid)">
        <TnBadge variant="promo" size="xs">XS -30%</TnBadge>
        <TnBadge variant="promo">SM -30%</TnBadge>
        <TnBadge variant="promo" size="md">MD -30%</TnBadge>
      </Section>

      {/* Count sizes */}
      <Section title="Count sizes">
        <TnBadge variant="count" size="xs" count={5} />
        <TnBadge variant="count" count={12} />
        <TnBadge variant="count" size="md" count={28} />
      </Section>

      {/* Pill vs rounded */}
      <Section title="Forme : rounded vs pill">
        <TnBadge variant="promo">Rounded</TnBadge>
        <TnBadge variant="promo" pill>Pill</TnBadge>
        <TnBadge variant="success" badgeStyle="soft">Rounded</TnBadge>
        <TnBadge variant="success" badgeStyle="soft" pill>Pill</TnBadge>
      </Section>

      {/* With icons */}
      <Section title="Avec icones">
        <TnBadge variant="success" badgeStyle="soft" leftIcon={<i className="fas fa-check" />}>Payee</TnBadge>
        <TnBadge variant="warning" badgeStyle="soft" leftIcon={<i className="fas fa-clock" />}>En attente</TnBadge>
        <TnBadge variant="danger" badgeStyle="soft" leftIcon={<i className="fas fa-ban" />}>Annulee</TnBadge>
        <TnBadge variant="info" leftIcon={<i className="fas fa-file-pdf" />}>PDF</TnBadge>
        <TnBadge variant="new" leftIcon={<i className="fas fa-star" />}>Nouveau</TnBadge>
      </Section>

      {/* Pop animation */}
      <Section title="Animation pop (rafraichir pour revoir)">
        <TnBadge variant="promo" pop>-30%</TnBadge>
        <TnBadge variant="new" pop>Nouveau</TnBadge>
        <TnBadge variant="count" pop count={5} />
        <TnBadge variant="success" badgeStyle="soft" pop leftIcon={<i className="fas fa-check" />}>Payee</TnBadge>
      </Section>

      {/* On dark background */}
      <Section title="Sur fond sombre" dark>
        <TnBadge variant="promo">-30%</TnBadge>
        <TnBadge variant="new">Nouveau</TnBadge>
        <TnBadge variant="count" count={3} />
        <TnBadge variant="success" badgeStyle="soft">Disponible</TnBadge>
        <TnBadge variant="info" badgeStyle="outline">PDF</TnBadge>
      </Section>

      {/* Contextual usage */}
      <Section title="Usage contextuel : ligne status admin">
        {[
          { ref: 'CMD-2025-0042', name: 'Achille Mbemba', status: 'success', label: 'Payee', icon: 'fa-check', amount: '15 000' },
          { ref: 'CMD-2025-0039', name: 'Marie Obiang', status: 'promo', label: 'En attente', icon: 'fa-clock', amount: '8 500' },
          { ref: 'CMD-2025-0037', name: 'Paul Nguema', status: 'danger', label: 'Annulee', icon: 'fa-ban', amount: '22 000' },
        ].map(row => (
          <div key={row.ref} style={{
            width: '100%', padding: '14px 20px', borderRadius: 10,
            border: '1px solid var(--ds-gray-200)', background: 'var(--ds-white)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontFamily: 'var(--ds-mono)', fontSize: 12, color: 'var(--ds-gray-400)' }}>{row.ref}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{row.name}</span>
            <TnBadge variant={row.status} badgeStyle="soft" leftIcon={<i className={`fas ${row.icon}`} />}>{row.label}</TnBadge>
            <span style={{ fontFamily: 'var(--ds-mono)', fontSize: 13, fontWeight: 600 }}>{row.amount} FCFA</span>
          </div>
        ))}
      </Section>

      {/* Matrix table */}
      <Section title="Matrice : variantes x styles">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ds-gray-200)' }}>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-400)' }}>Variante</th>
              {STYLES.map(s => <th key={s} style={{ padding: 10, textAlign: 'center' }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {VARIANTS.map(v => (
              <tr key={v} style={{ borderBottom: '1px solid var(--ds-gray-100)' }}>
                <td style={{ padding: 10 }}>{v}</td>
                {STYLES.map(s => (
                  <td key={s} style={{ padding: 10, textAlign: 'center' }}>
                    <TnBadge variant={v} badgeStyle={s}>{v}</TnBadge>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
