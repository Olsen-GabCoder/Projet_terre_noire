import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import quoteService from '../../services/quoteService';
import { handleApiError } from '../../services/api';
import '../../styles/OrgBooks.css';

const STATUS_CONFIG = {
  DRAFT:     { color: '#64748b', bg: 'rgba(100,116,139,0.08)', icon: 'fas fa-pencil-alt', label: 'Brouillon' },
  SENT:      { color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   icon: 'fas fa-paper-plane', label: 'Envoyé' },
  ACCEPTED:  { color: '#059669', bg: 'rgba(5,150,105,0.08)',   icon: 'fas fa-check-circle', label: 'Accepté' },
  REJECTED:  { color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   icon: 'fas fa-times-circle', label: 'Refusé' },
  REVISION_REQUESTED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: 'fas fa-sync-alt', label: 'Révision demandée' },
  SUPERSEDED: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: 'fas fa-history', label: 'Remplacé' },
  EXPIRED:   { color: '#d97706', bg: 'rgba(217,119,6,0.08)',   icon: 'fas fa-clock', label: 'Expiré' },
  CANCELLED: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', icon: 'fas fa-ban', label: 'Annulé' },
};

const Quotes = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isClientView = location.pathname.includes('/my-quotes');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    quoteService.getQuotes({ role: isClientView ? 'client' : 'provider' })
      .then(res => setQuotes(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(err => setError(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [isClientView]);

  const filtered = filter ? quotes.filter(q => q.status === filter) : quotes;
  const formatPrice = (v) => !v ? '—' : Math.round(parseFloat(v)).toLocaleString('fr-FR') + ' FCFA';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // Stats
  const totalAmount = quotes.reduce((s, q) => s + (parseFloat(q.total_ttc) || 0), 0);
  const draftCount = quotes.filter(q => q.status === 'DRAFT').length;
  const sentCount = quotes.filter(q => q.status === 'SENT').length;
  const acceptedCount = quotes.filter(q => q.status === 'ACCEPTED').length;

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
              <i className="fas fa-file-invoice-dollar" />
            </span>
            {isClientView ? t('dashboard.myQuotes', 'Mes devis') : t('dashboard.quotes', 'Devis DQE')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted-ui)', margin: '0.35rem 0 0' }}>
            {isClientView ? 'Consultez et gérez les devis que vous avez reçus.' : 'Créez, envoyez et suivez vos devis quantitatifs.'}
          </p>
        </div>
        {!isClientView && (
          <Link to="/dashboard/services/quotes/create" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.65rem 1.25rem', borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(91,94,234,0.25)',
            transition: 'var(--transition-base)',
          }}>
            <i className="fas fa-plus" /> Nouveau devis
          </Link>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total devis', value: quotes.length, icon: 'fas fa-layer-group', color: 'var(--color-primary)' },
          { label: 'Montant cumulé', value: formatPrice(totalAmount), icon: 'fas fa-coins', color: '#d97706' },
          { label: 'Brouillons', value: draftCount, icon: 'fas fa-pencil-alt', color: '#64748b' },
          { label: isClientView ? 'En attente' : 'Envoyés', value: sentCount, icon: 'fas fa-paper-plane', color: '#2563eb' },
          { label: 'Acceptés', value: acceptedCount, icon: 'fas fa-check-circle', color: '#059669' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '1rem 1.25rem', borderRadius: 12,
            background: 'var(--card-glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--card-glass-border)',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: '0.9rem', flexShrink: 0 }}>
              <i className={stat.icon} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-heading)', lineHeight: 1.2 }}>
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid',
            borderColor: !filter ? 'var(--color-primary)' : 'var(--color-border-card)',
            background: !filter ? 'rgba(91,94,234,0.08)' : 'transparent',
            color: !filter ? 'var(--color-primary)' : 'var(--color-text-muted-ui)',
            fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Tous ({quotes.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = quotes.filter(q => q.status === key).length;
          if (!count) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid',
                borderColor: filter === key ? cfg.color : 'var(--color-border-card)',
                background: filter === key ? cfg.bg : 'transparent',
                color: filter === key ? cfg.color : 'var(--color-text-muted-ui)',
                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <i className={cfg.icon} style={{ fontSize: '0.7rem' }} /> {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      {filtered.length === 0 ? (
        /* ── EMPTY STATE ── */
        <div style={{
          padding: '3.5rem 2rem', textAlign: 'center', borderRadius: 16,
          background: 'var(--card-glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--card-glass-border)',
        }}>
          {/* Illustration */}
          <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 1.25rem', background: 'linear-gradient(135deg, rgba(91,94,234,0.08), rgba(139,92,246,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2rem', color: 'var(--color-primary)', opacity: 0.7 }} />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-heading)', margin: '0 0 0.5rem' }}>
            {filter ? 'Aucun devis avec ce statut' : (isClientView ? 'Aucun devis reçu' : 'Aucun devis créé')}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted-ui)', maxWidth: 420, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            {isClientView
              ? 'Les devis envoyés par vos prestataires et éditeurs apparaîtront ici. Vous pourrez les consulter, les accepter ou les refuser.'
              : 'Créez votre premier devis quantitatif détaillé. Choisissez un modèle prédéfini ou partez de zéro.'
            }
          </p>

          {!isClientView && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard/services/quotes/create" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '0.7rem 1.5rem', borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                color: '#fff', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(91,94,234,0.25)',
              }}>
                <i className="fas fa-plus" /> Créer un devis
              </Link>
            </div>
          )}

          {/* Templates preview */}
          {!isClientView && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-card)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: '0.75rem' }}>
                Modèles disponibles
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Édition complète', 'Correction', 'Mise en page', 'Impression', 'Traduction', 'Illustration', 'Ebook', 'À la carte'].map((name, i) => (
                  <span key={i} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500,
                    background: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)',
                    border: '1px solid var(--color-border-card)',
                  }}>{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── TABLE ── */
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          background: 'var(--card-glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--card-glass-border)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border-card)' }}>
                {['Référence', 'Objet', isClientView ? 'Émetteur' : 'Client', 'Total TTC', 'Statut', 'Date', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: i === 3 ? 'right' : 'left', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', background: 'var(--color-bg-section-alt)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT;
                const detailPath = isClientView ? `/dashboard/my-quotes/${q.id}` : `/dashboard/services/quotes/${q.id}`;
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-card)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,94,234,0.03)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--color-bg-section-alt)' }}>{q.reference}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>{q.title}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted-ui)', fontSize: '0.85rem' }}>{isClientView ? (q.provider_organization_name || '—') : (q.client_display || '—')}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>{formatPrice(q.total_ttc)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 8,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.color}20`,
                      }}>
                        <i className={cfg.icon} style={{ fontSize: '0.68rem' }} /> {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>{formatDate(q.created_at)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <Link to={detailPath} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 14px', borderRadius: 8,
                          fontSize: '0.78rem', fontWeight: 600,
                          color: 'var(--color-primary)', background: 'rgba(91,94,234,0.06)',
                          textDecoration: 'none', border: '1px solid rgba(91,94,234,0.12)',
                          transition: 'var(--transition-base)',
                        }}>
                          <i className="fas fa-eye" /> Voir
                        </Link>
                        {!isClientView && q.status === 'REVISION_REQUESTED' && (
                          <button
                            onClick={() => navigate(`/dashboard/services/quotes/create?source=${q.id}${q.manuscript ? `&manuscript=${q.manuscript}` : ''}${q.provider_organization ? `&organization=${q.provider_organization}` : ''}`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 14px', borderRadius: 8,
                              fontSize: '0.78rem', fontWeight: 600,
                              color: '#7c3aed', background: 'rgba(124,58,237,0.07)',
                              border: '1px solid rgba(124,58,237,0.18)',
                              cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'var(--transition-base)',
                            }}
                          >
                            <i className="fas fa-edit" /> Réviser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Quotes;
