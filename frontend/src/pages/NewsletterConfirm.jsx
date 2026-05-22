import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

const KNOWN_STATUSES = ['success', 'expired', 'invalid'];

const STATES = {
  loading: {
    icon: 'fas fa-spinner fa-spin',
    color: 'var(--tn-orange, #E8601C)',
    title: 'Confirmation en cours...',
    message: 'Veuillez patienter.',
  },
  success: {
    icon: 'fas fa-check-circle',
    color: 'var(--tn-success, #16a34a)',
    title: 'Inscription confirmee !',
    message: 'Merci ! Vous recevrez desormais nos actualites, nouveautes et offres exclusives.',
  },
  expired: {
    icon: 'fas fa-clock',
    color: 'var(--tn-orange, #E8601C)',
    title: 'Lien expire',
    message: 'Ce lien de confirmation a expire (72h). Veuillez vous reinscrire via le formulaire en bas de page.',
  },
  invalid: {
    icon: 'fas fa-times-circle',
    color: 'var(--tn-error, #dc2626)',
    title: 'Lien invalide',
    message: 'Ce lien de confirmation est invalide ou a deja ete utilise.',
  },
};

const NewsletterConfirm = () => {
  const { status: param } = useParams();
  const [result, setResult] = useState(KNOWN_STATUSES.includes(param) ? param : 'loading');

  useEffect(() => {
    if (KNOWN_STATUSES.includes(param)) return;
    const confirm = async () => {
      try {
        const res = await api.get(`/newsletter/confirm/${param}/`);
        setResult(res.data?.result || 'success');
      } catch {
        setResult('invalid');
      }
    };
    confirm();
  }, [param]);

  const state = STATES[result] || STATES.invalid;

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--tn-cream, #F4F1EA)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, background: 'var(--ds-white)', borderRadius: 16, padding: '48px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <i className={state.icon} style={{ fontSize: 56, color: state.color, marginBottom: 20, display: 'block' }} />
        <h1 style={{ fontFamily: 'var(--tn-serif, Georgia, serif)', fontSize: 26, fontWeight: 700, color: 'var(--tn-gray-900, #1a1a1a)', marginBottom: 12 }}>
          {state.title}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--tn-gray-600, #555)', lineHeight: 1.6, marginBottom: 28 }}>
          {state.message}
        </p>
        {result !== 'loading' && (
          <Link to="/" className="tn-btn tn-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: 14 }}>
            <i className="fas fa-home" /> Retour a l'accueil
          </Link>
        )}
      </div>
    </div>
  );
};

export default NewsletterConfirm;
