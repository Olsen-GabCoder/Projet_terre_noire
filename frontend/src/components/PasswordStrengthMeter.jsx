import { useMemo } from 'react';
import '../styles/Auth.css';

const CRITERIA = [
  { key: 'length', label: '8 caractères minimum', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Une majuscule', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Une minuscule', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'Un chiffre', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Un caractère spécial (!@#$...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = [
  { min: 0, label: '', color: '#e5e7eb' },
  { min: 1, label: 'Très faible', color: '#ef4444' },
  { min: 2, label: 'Faible', color: '#f97316' },
  { min: 3, label: 'Moyen', color: '#f59e0b' },
  { min: 4, label: 'Fort', color: '#22c55e' },
  { min: 5, label: 'Très fort', color: '#16a34a' },
];

const PasswordStrengthMeter = ({ password = '' }) => {
  const { score, passed } = useMemo(() => {
    const results = CRITERIA.map((c) => ({ ...c, ok: c.test(password) }));
    return {
      score: results.filter((r) => r.ok).length,
      passed: results,
    };
  }, [password]);

  if (!password) return null;

  const strength = STRENGTH_LABELS[score] || STRENGTH_LABELS[0];
  const percent = (score / CRITERIA.length) * 100;

  return (
    <div className="psm">
      <div className="psm__bar-track">
        <div
          className="psm__bar-fill"
          style={{ width: `${percent}%`, backgroundColor: strength.color }}
        />
      </div>
      <div className="psm__info">
        <span className="psm__label" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      <ul className="psm__criteria">
        {passed.map((c) => (
          <li key={c.key} className={`psm__criterion ${c.ok ? 'psm__criterion--ok' : ''}`}>
            <i className={c.ok ? 'fas fa-check-circle' : 'far fa-circle'} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
