/**
 * InputShowcase — Dev-only visual validation for TnInput, TnTextarea, TnSelect
 * Route: /dev/inputs (gated by import.meta.env.DEV)
 */
import React, { useState } from 'react';
import TnInput from '../../components/ui/TnInput';
import TnTextarea from '../../components/ui/TnTextarea';
import TnSelect from '../../components/ui/TnSelect';

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

export default function InputShowcase() {
  const [form, setForm] = useState({ name: '', email: '', bio: '', category: '' });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px', fontFamily: 'var(--ds-sans)' }}>
      <h1 style={{ fontFamily: 'var(--ds-serif, Georgia)', fontSize: 28, marginBottom: 8 }}>
        TnInput Showcase
      </h1>
      <p style={{ color: 'var(--ds-gray-500)', fontSize: 14, marginBottom: 32 }}>
        Composants TnInput, TnTextarea, TnSelect. Testez focus, error, disabled, icons.
      </p>

      {/* Default states */}
      <Section title="TnInput — Etats par defaut">
        <TnInput label="Nom complet" name="name" placeholder="Ex: Aicha Mbadinga" value={form.name} onChange={set('name')} />
        <TnInput label="Email" name="email" type="email" required placeholder="email@exemple.com"
          value={form.email} onChange={set('email')} leftIcon={<i className="fas fa-envelope" />} />
        <TnInput label="Mot de passe" name="password" type="password" required
          rightIcon={<i className="fas fa-eye" />} helper="Minimum 8 caracteres" />
      </Section>

      {/* Error states */}
      <Section title="TnInput — Etats erreur">
        <TnInput label="Email" name="email-err" type="email" value="invalid"
          error="Adresse email invalide" leftIcon={<i className="fas fa-envelope" />} />
        <TnInput label="Mot de passe" name="pass-err" type="password"
          error="Le mot de passe doit contenir au moins 8 caracteres" />
      </Section>

      {/* Disabled / readonly */}
      <Section title="TnInput — Disabled et Readonly">
        <TnInput label="Email (disabled)" name="dis" value="user@terrenoire.ga" disabled />
        <TnInput label="Reference (readonly)" name="ro" value="TNE-2025-0042" readOnly />
      </Section>

      {/* Sizes */}
      <Section title="TnInput — Tailles">
        <TnInput label="Small" size="sm" placeholder="Petit input" />
        <TnInput label="Medium (defaut)" placeholder="Input standard" />
        <TnInput label="Large" size="lg" placeholder="Grand input" />
      </Section>

      {/* Dark variant */}
      <Section title="TnInput — Dark (fond sombre)" dark>
        <TnInput label="Newsletter" name="nl" variant="dark" type="email"
          placeholder="Votre email..." leftIcon={<i className="fas fa-envelope" />} />
      </Section>

      {/* Textarea */}
      <Section title="TnTextarea">
        <TnTextarea label="Biographie" name="bio" rows={4} placeholder="Racontez votre histoire..."
          value={form.bio} onChange={set('bio')} />
        <TnTextarea label="Notes (auto-resize)" name="notes" autoResize rows={2}
          placeholder="Ce champ grandit automatiquement..." />
        <TnTextarea label="Avec erreur" name="bio-err" rows={3}
          error="Ce champ est obligatoire" />
      </Section>

      {/* Select */}
      <Section title="TnSelect">
        <TnSelect label="Categorie" name="cat" required placeholder="Choisir une categorie..."
          options={[
            { value: 'roman', label: 'Roman' },
            { value: 'poesie', label: 'Poesie' },
            { value: 'essai', label: 'Essai' },
            { value: 'theatre', label: 'Theatre' },
          ]}
          value={form.category} onChange={set('category')} />
        <TnSelect label="Format" name="fmt"
          options={[
            { value: 'pdf', label: 'PDF' },
            { value: 'epub', label: 'EPUB' },
            { value: 'print', label: 'Imprime' },
          ]} />
        <TnSelect label="Avec erreur" name="sel-err" placeholder="Choisir..."
          options={[]} error="Veuillez selectionner une option" />
      </Section>

      {/* Complete form */}
      <Section title="Formulaire complet">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <TnInput label="Prenom" name="fn" required placeholder="Prenom" />
          <TnInput label="Nom" name="ln" required placeholder="Nom" />
        </div>
        <TnInput label="Email" name="em" type="email" required placeholder="email@exemple.com"
          leftIcon={<i className="fas fa-envelope" />} />
        <TnInput label="Telephone" name="tel" type="tel" placeholder="+241 XX XX XX XX"
          leftIcon={<i className="fas fa-phone" />} helper="Optionnel" />
        <TnSelect label="Sujet" name="subject" required placeholder="Choisir un sujet..."
          options={[
            { value: 'info', label: 'Demande d\'information' },
            { value: 'partenariat', label: 'Proposition de partenariat' },
            { value: 'manuscrit', label: 'Soumission de manuscrit' },
          ]} />
        <TnTextarea label="Message" name="msg" rows={5} required
          placeholder="Votre message..." />
      </Section>
    </div>
  );
}
