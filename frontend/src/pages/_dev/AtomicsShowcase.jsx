/**
 * AtomicsShowcase — Dev-only showcase for Vague 2.5 atomics
 * Route: /dev/atomics-2-5 (gated by import.meta.env.DEV)
 */
import React, { useState } from 'react';
import TnLink from '../../components/ui/TnLink';
import TnPrice from '../../components/ui/TnPrice';
import TnStars from '../../components/ui/TnStars';
import TnDivider from '../../components/ui/TnDivider';

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: 'var(--ds-serif, Georgia)', fontSize: 24, marginBottom: 16 }}>{title}</h2>
      {children}
    </section>
  );
}

function Placeholder({ phase }) {
  return (
    <div style={{
      padding: 24, background: 'var(--ds-gray-100, #F1EEE6)', borderRadius: 8,
      color: 'var(--ds-gray-500, #6B6B6B)', textAlign: 'center',
    }}>
      A venir — {phase}
    </div>
  );
}

function InteractiveStarsDemo() {
  const [rating, setRating] = useState(0);
  return (
    <div>
      <TnStars value={rating} interactive onChange={setRating} size="lg" />
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ds-gray-500)', fontFamily: 'var(--ds-mono)' }}>
        {rating > 0 ? `Votre note : ${rating}/5` : 'Cliquez pour noter'}
      </p>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', marginBottom: 16 }}>{children}</div>;
}

export default function AtomicsShowcase() {
  return (
    <div style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--ds-sans)' }}>
      <h1 style={{ fontFamily: 'var(--ds-serif, Georgia)', fontSize: 32, marginBottom: 8 }}>
        Atomics 2.5 — Showcase
      </h1>
      <p style={{ color: 'var(--ds-gray-500)', marginBottom: 32, fontSize: 14 }}>
        Vague 2.5 — Composants atomiques (4/4 complets)
      </p>

      {/* ═══════════════════ LINKS ═══════════════════ */}
      <Section title="Links (TnLink)">
        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Default — inline dans texte
        </h3>
        <p style={{ marginBottom: 16, fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
          Les ouvrages publies par Terre Noire Editions sont proteges par le{' '}
          <TnLink to="/cgv">droit d'auteur gabonais</TnLink> et les{' '}
          <TnLink to="/privacy">conventions internationales</TnLink>. Pour toute
          question, consultez nos <TnLink to="/contact">conditions generales</TnLink>.
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Muted — discret (footer, mentions)
        </h3>
        <p style={{ marginBottom: 16, color: 'var(--ds-gray-500)' }}>
          <TnLink variant="muted" to="/cgv">CGV</TnLink>{' · '}
          <TnLink variant="muted" to="/privacy">Confidentialite</TnLink>{' · '}
          <TnLink variant="muted" to="/cookies">Cookies</TnLink>{' · '}
          <TnLink variant="muted" to="/terms">CGU</TnLink>
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Strong — CTA texte
        </h3>
        <p style={{ marginBottom: 8 }}>
          <TnLink variant="strong" to="/authors" rightIcon={<i className="fas fa-arrow-right" />}>
            Decouvrir nos auteurs
          </TnLink>
        </p>
        <p style={{ marginBottom: 16 }}>
          Vous n'avez pas de compte ?{' '}
          <TnLink variant="strong" to="/register">Inscrivez-vous ici</TnLink>
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Ghost — navigation
        </h3>
        <Row>
          <TnLink variant="ghost" to="/">Accueil</TnLink>
          <TnLink variant="ghost" to="/catalog">Catalogue</TnLink>
          <TnLink variant="ghost" to="/authors">Auteurs</TnLink>
          <TnLink variant="ghost" to="/contact">Contact</TnLink>
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          External — icone automatique
        </h3>
        <p style={{ marginBottom: 16 }}>
          Suivez-nous sur{' '}
          <TnLink href="https://instagram.com/terrenoire">Instagram</TnLink>,{' '}
          <TnLink href="https://facebook.com/terrenoire">Facebook</TnLink> et{' '}
          <TnLink href="https://linkedin.com/company/terrenoire">LinkedIn</TnLink>.
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Sur fond sombre
        </h3>
        <div style={{
          background: 'var(--ds-black)', color: 'var(--ds-cream)',
          padding: 24, borderRadius: 12, marginBottom: 16,
        }}>
          <p style={{ marginBottom: 8 }}>
            Consultez nos <TnLink onDark to="/cgv">conditions de vente</TnLink> et
            notre <TnLink onDark to="/privacy">politique de confidentialite</TnLink>.
          </p>
          <p>
            <TnLink onDark href="https://facebook.com/terrenoire">Visiter notre page Facebook</TnLink>
          </p>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Avec icones
        </h3>
        <p style={{ marginBottom: 8 }}>
          <TnLink href="#" leftIcon={<i className="fas fa-download" />}>Telecharger le catalogue PDF</TnLink>
        </p>
        <p>
          <TnLink href="#" leftIcon={<i className="fas fa-envelope" />}>Nous contacter</TnLink>
          {'  '}
          <TnLink href="#" leftIcon={<i className="fas fa-phone" />}>+241 074 30 16 39</TnLink>
        </p>
      </Section>

      {/* ═══════════════════ PLACEHOLDERS ═══════════════════ */}
      <Section title="Prices (TnPrice)">
        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '0 0 12px' }}>
          Tailles
        </h3>
        <Row>
          {['xs', 'sm', 'md', 'lg', 'xl'].map(s => (
            <div key={s}>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-400)', marginBottom: 4 }}>{s.toUpperCase()}</div>
              <TnPrice amount={15000} size={s} />
            </div>
          ))}
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Standard (muted)
        </h3>
        <Row>
          <TnPrice amount={15000} variant="muted" />
          <TnPrice amount={8500} variant="muted" size="lg" />
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Promo horizontal
        </h3>
        <Row>
          <TnPrice amount={15000} oldAmount={20000} />
          <TnPrice amount={24500} oldAmount={35000} size="lg" />
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Promo vertical (BookDetail)
        </h3>
        <TnPrice amount={15000} oldAmount={20000} size="lg" layout="vertical" />

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Gratuit
        </h3>
        <Row>
          <TnPrice amount={0} size="md" />
          <TnPrice amount={0} size="lg" />
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Fourchette de prix
        </h3>
        <TnPrice amount={15000} rangeMax={25000} size="md" />

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Inline dans texte
        </h3>
        <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
          Ce livre est disponible au prix de{' '}
          <TnPrice amount={15000} size="xs" /> en format papier.
          La version numerique est proposee a{' '}
          <TnPrice amount={8500} size="xs" />.
        </p>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Usages contextuels
        </h3>
        <Row>
          {/* BookCard sim */}
          <div style={{ background: 'var(--ds-white)', border: '1px solid var(--ds-gray-200)', borderRadius: 14, padding: 20, width: 240 }}>
            <div style={{ height: 100, background: 'var(--ds-gray-100)', borderRadius: 8, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Le Monde s'effondre</div>
            <div style={{ fontSize: 12, color: 'var(--ds-gray-500)', marginBottom: 12 }}>Chinua Achebe</div>
            <TnPrice amount={15000} oldAmount={20000} size="sm" />
          </div>
          {/* Checkout total sim */}
          <div style={{ background: 'var(--ds-white)', border: '1px solid var(--ds-gray-200)', borderRadius: 12, padding: 24, width: 240, textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--ds-gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total</div>
            <TnPrice amount={47500} variant="muted" size="xl" />
          </div>
        </Row>
        {/* BookDetail sim */}
        <div style={{ background: 'var(--ds-white)', border: '1px solid var(--ds-gray-200)', borderTop: '4px solid var(--ds-orange)', borderRadius: 12, padding: 24, maxWidth: 320, marginTop: 16 }}>
          <TnPrice amount={15000} oldAmount={20000} size="lg" layout="vertical" />
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ds-gray-500)' }}>TVA incluse</div>
        </div>
      </Section>

      <Section title="Stars (TnStars)">
        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '0 0 12px' }}>
          Valeurs
        </h3>
        <Row>
          {[0, 1, 2.5, 3.5, 4, 5].map(v => (
            <div key={v}>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-400)', marginBottom: 4 }}>{v}/5</div>
              <TnStars value={v} size="md" />
            </div>
          ))}
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Tailles
        </h3>
        <Row>
          {['xs', 'sm', 'md', 'lg'].map(s => (
            <div key={s}>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-400)', marginBottom: 4 }}>{s.toUpperCase()}</div>
              <TnStars value={4} size={s} />
            </div>
          ))}
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Avec meta
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TnStars value={4.5} count={38} />
          <TnStars value={4.2} showValue showCount count={156} size="md" />
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Compact
        </h3>
        <Row>
          <TnStars value={4.5} variant="compact" />
          <TnStars value={3.8} variant="compact" />
          <TnStars value={5.0} variant="compact" />
        </Row>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Interactif (cliquez pour noter)
        </h3>
        <InteractiveStarsDemo />

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Usages contextuels
        </h3>
        <Row>
          {/* BookCard sim */}
          <div style={{ background: 'var(--ds-white)', border: '1px solid var(--ds-gray-200)', borderRadius: 14, padding: 20, width: 240 }}>
            <div style={{ height: 100, background: 'var(--ds-gray-100)', borderRadius: 8, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Le Monde s'effondre</div>
            <div style={{ fontSize: 12, color: 'var(--ds-gray-500)', marginBottom: 8 }}>Chinua Achebe</div>
            <TnStars value={4.2} size="xs" count={38} />
          </div>
          {/* BookDetail sim */}
          <div style={{ background: 'var(--ds-white)', border: '1px solid var(--ds-gray-200)', borderRadius: 12, padding: 24, width: 300 }}>
            <div style={{ fontFamily: 'var(--ds-serif)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Le Monde s'effondre</div>
            <TnStars value={4.5} size="md" showValue showCount count={38} />
          </div>
        </Row>
      </Section>

      <Section title="Dividers (TnDivider)">
        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '0 0 12px' }}>
          Variants
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
          {['default', 'thick', 'dashed', 'gradient', 'ornament', 'warm'].map(v => (
            <div key={v}>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-400)', marginBottom: 4 }}>{v}</div>
              <TnDivider variant={v} />
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Espacements
        </h3>
        <div style={{ maxWidth: 600, background: 'var(--ds-white)', padding: 24, borderRadius: 12, border: '1px solid var(--ds-gray-200)' }}>
          <p style={{ fontSize: 14, color: 'var(--ds-gray-700)' }}>Contenu avant SM</p>
          <TnDivider variant="default" spacing="sm" />
          <p style={{ fontSize: 14, color: 'var(--ds-gray-700)' }}>Contenu avant MD</p>
          <TnDivider variant="default" spacing="md" />
          <p style={{ fontSize: 14, color: 'var(--ds-gray-700)' }}>Contenu avant LG</p>
          <TnDivider variant="default" spacing="lg" />
          <p style={{ fontSize: 14, color: 'var(--ds-gray-700)' }}>Contenu apres LG</p>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Avec label
        </h3>
        <div style={{ maxWidth: 600 }}>
          <TnDivider variant="default" label="Section" spacing="md" />
          <TnDivider variant="default" label="OU" spacing="md" />
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Sur fond sombre
        </h3>
        <div style={{ background: 'var(--ds-black)', padding: 24, borderRadius: 12, maxWidth: 600, color: 'var(--ds-cream)' }}>
          <p style={{ fontSize: 14, marginBottom: 0 }}>Section sombre</p>
          <TnDivider variant="default" onDark spacing="md" />
          <p style={{ fontSize: 14, marginBottom: 0 }}>Ornement dore</p>
          <TnDivider variant="ornament" onDark spacing="md" />
          <TnDivider variant="default" onDark label="Section" spacing="sm" />
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-gray-500)', margin: '24px 0 12px' }}>
          Usages contextuels
        </h3>
        {/* OU login */}
        <div style={{ background: 'var(--ds-white)', padding: 24, borderRadius: 12, border: '1px solid var(--ds-gray-200)', maxWidth: 400, marginBottom: 20 }}>
          <button style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--ds-black)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Se connecter</button>
          <TnDivider variant="default" label="OU" spacing="md" />
          <button style={{ width: '100%', padding: 12, borderRadius: 8, background: 'white', color: 'var(--ds-gray-900)', border: '1.5px solid var(--ds-gray-200)', fontWeight: 600, cursor: 'pointer' }}>Creer un compte</button>
        </div>
        {/* Scene break editorial */}
        <div style={{ maxWidth: 500, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--ds-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ds-gray-700)', lineHeight: 1.7 }}>
            "Il n'y a pas de plus grande agonie que de porter en soi une histoire inexprimee."
          </p>
          <TnDivider variant="ornament" spacing="lg" />
          <p style={{ fontFamily: 'var(--ds-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ds-gray-700)', lineHeight: 1.7 }}>
            "Ce que nous trouvons change ce que nous cherchons."
          </p>
        </div>
      </Section>
    </div>
  );
}
