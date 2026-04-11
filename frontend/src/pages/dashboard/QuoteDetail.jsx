import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import quoteService from '../../services/quoteService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/OrgBooks.css';

const STATUS_CONFIG = {
  DRAFT: { color: '#94a3b8', bg: '#f1f5f9', label: 'Brouillon', icon: 'fas fa-pencil-alt' },
  SENT: { color: '#2563eb', bg: '#dbeafe', label: 'Envoyé', icon: 'fas fa-paper-plane' },
  ACCEPTED: { color: '#059669', bg: '#d1fae5', label: 'Accepté', icon: 'fas fa-check-circle' },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'Refusé', icon: 'fas fa-times-circle' },
  REVISION_REQUESTED: { color: '#8b5cf6', bg: '#ede9fe', label: 'Révision demandée', icon: 'fas fa-sync-alt' },
  SUPERSEDED: { color: '#94a3b8', bg: '#f1f5f9', label: 'Remplacé par une révision', icon: 'fas fa-history' },
  EXPIRED: { color: '#d97706', bg: '#fef3c7', label: 'Expiré', icon: 'fas fa-clock' },
  CANCELLED: { color: '#6b7280', bg: '#f3f4f6', label: 'Annulé', icon: 'fas fa-ban' },
};

const UNIT_LABELS = {
  PAGE: 'page', MOT: 'mot', EXEMPLAIRE: 'ex.', FORFAIT: 'forfait',
  HEURE: 'h', JOUR: 'j', FEUILLE: 'feuille', PLANCHE: 'planche', CARACTERE: 'car.',
};

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  useEffect(() => {
    quoteService.getQuote(id)
      .then(res => setQuote(res.data))
      .catch(err => setError(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const formatPrice = (v) => Math.round(parseFloat(v || 0)).toLocaleString('fr-FR');
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const isProvider = quote && (quote.created_by === user?.id);
  const isClient = quote && (quote.client === user?.id);

  const handleSend = async () => {
    setActing(true);
    try {
      const res = await quoteService.sendQuote(id);
      setQuote(res.data);
      toast.success('Devis envoyé au client !');
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setActing(false); }
  };

  const handleRespond = async (action, reason = '') => {
    setActing(true);
    try {
      const res = await quoteService.respondToQuote(id, { action, reason });
      setQuote(res.data);
      setShowRejectModal(false);
      setShowRevisionModal(false);
      setShowAcceptModal(false);
      const messages = { accept: 'Devis accepté !', reject: 'Devis refusé.', revision: 'Demande de révision envoyée.' };
      toast.success(messages[action] || 'Action effectuée.');
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setActing(false); }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!quote) return null;

  const cfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="author-space">
      {/* Bandeau SUPERSEDED */}
      {quote.status === 'SUPERSEDED' && quote.replaced_by && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '12px 16px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#475569' }}>
          <span><i className="fas fa-history" style={{ marginRight: 8 }} />Ce devis a été remplacé par une version révisée.</span>
          <Link to={`/dashboard/services/quotes/${quote.replaced_by.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(91,94,234,0.06)', textDecoration: 'none', border: '1px solid rgba(91,94,234,0.12)' }}>
            <i className="fas fa-external-link-alt" /> Voir la nouvelle version ({quote.replaced_by.reference})
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '4px 10px', borderRadius: 6, background: 'var(--color-bg-section-alt)', fontWeight: 700 }}>{quote.reference}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
              <i className={cfg.icon} /> {cfg.label}
            </span>
          </div>
          <h1 className="author-space__title">{quote.title}</h1>
          <p className="author-space__subtitle">
            Créé le {formatDate(quote.created_at)}
            {quote.sent_at && <> · Envoyé le {formatDate(quote.sent_at)}</>}
            {quote.accepted_at && <> · Accepté le {formatDate(quote.accepted_at)}</>}
            {quote.valid_until && <> · Valide jusqu'au {formatDate(quote.valid_until)}</>}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isProvider && quote.status === 'DRAFT' && (
            <button className="dashboard-btn dashboard-btn--primary" onClick={handleSend} disabled={acting}>
              <i className="fas fa-paper-plane" /> Envoyer au client
            </button>
          )}
          {isProvider && quote.status === 'REVISION_REQUESTED' && (
            <Link
              to={`/dashboard/services/quotes/create?source=${quote.id}${quote.manuscript ? `&manuscript=${quote.manuscript}` : ''}${quote.provider_organization ? `&organization=${quote.provider_organization}` : ''}`}
              className="dashboard-btn"
              style={{ background: '#7c3aed', color: '#fff', border: 'none', textDecoration: 'none' }}
            >
              <i className="fas fa-edit" /> Réviser ce devis
            </Link>
          )}
          {isClient && quote.status === 'SENT' && (
            <>
              <button className="dashboard-btn" onClick={() => setShowAcceptModal(true)} disabled={acting} style={{ background: '#059669', color: '#fff', border: 'none' }}>
                <i className="fas fa-check" /> Accepter le devis
              </button>
              <button className="dashboard-btn" onClick={() => setShowRevisionModal(true)} disabled={acting} style={{ border: '1px solid var(--color-border-card)' }}>
                <i className="fas fa-sync-alt" /> Demander une révision
              </button>
              <button className="dashboard-btn" onClick={() => setShowRejectModal(true)} disabled={acting} style={{ color: 'var(--color-text-muted-ui)', border: '1px solid var(--color-border-card)', fontSize: '0.82rem' }}>
                <i className="fas fa-times" /> Refuser
              </button>
            </>
          )}
          {isClient && quote.status === 'REVISION_REQUESTED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#ede9fe', color: '#8b5cf6', fontWeight: 600, fontSize: '0.85rem' }}>
              <i className="fas fa-sync-alt" /> Révision demandée — en attente de l'éditeur
            </span>
          )}
          {isClient && quote.status === 'ACCEPTED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#d1fae5', color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
              <i className="fas fa-check-circle" /> Devis accepté le {formatDate(quote.accepted_at)}
            </span>
          )}
          {isClient && quote.status === 'REJECTED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>
              <i className="fas fa-times-circle" /> Devis refusé le {formatDate(quote.rejected_at)}
            </span>
          )}
          {isClient && quote.status === 'EXPIRED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fef3c7', color: '#d97706', fontWeight: 600, fontSize: '0.85rem' }}>
              <i className="fas fa-clock" /> Devis expiré
            </span>
          )}
        </div>
      </div>

      {/* Parties */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="as-card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: '0.5rem' }}>Émetteur</p>
          <p style={{ fontWeight: 600 }}>{quote.provider_organization_name || '—'}</p>
        </div>
        <div className="as-card" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: '0.5rem' }}>Client</p>
          <p style={{ fontWeight: 600 }}>{quote.client_display || quote.client_name || quote.client_email || '—'}</p>
        </div>
      </div>

      {/* Modèle éditorial + droits d'auteur */}
      {(quote.publishing_model_display || (quote.royalty_terms && quote.royalty_terms.length > 0)) && (
        <div className="as-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          {quote.publishing_model_display && (
            <div style={{ marginBottom: quote.royalty_terms?.length ? '1rem' : 0 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: '0.5rem' }}>Modèle éditorial</p>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{quote.publishing_model_display}</p>
            </div>
          )}
          {quote.royalty_terms && quote.royalty_terms.length > 0 && (
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: '0.5rem' }}>Grille de droits d'auteur</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {quote.royalty_terms.map((tier, i) => (
                  <div key={i} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--color-bg-section-alt)', border: '1px solid var(--color-border-card)', minWidth: 140 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>{tier.rate}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)' }}>
                      {tier.above ? `Au-delà de ${tier.above} ex.` : tier.up_to ? `Jusqu'à ${tier.up_to} ex.` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DQE TABLE */}
      <div className="as-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-section-alt)', borderBottom: '2px solid var(--color-border-card)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>N°</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>Désignation</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>Unité</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>Qté</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>P.U. (FCFA)</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted-ui)' }}>Total (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {quote.lots?.map((lot, li) => {
              let itemNum = 0;
              return (
                <React.Fragment key={lot.id}>
                  {/* Lot header */}
                  <tr style={{ background: 'rgba(var(--color-primary-rgb, 99,102,241), 0.04)' }}>
                    <td colSpan={6} style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                      LOT {li + 1} — {lot.name}
                    </td>
                  </tr>
                  {/* Items */}
                  {lot.items?.map((item) => {
                    itemNum++;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-card)' }}>
                        <td style={{ padding: '8px 14px', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem' }}>{li + 1}.{itemNum}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <div style={{ fontWeight: 500 }}>{item.designation}</div>
                          {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginTop: 2 }}>{item.description}</div>}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--color-text-muted-ui)' }}>{UNIT_LABELS[item.unit] || item.unit}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>{parseFloat(item.quantity).toLocaleString('fr-FR')}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>{formatPrice(item.unit_price)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>{formatPrice(item.total)}</td>
                      </tr>
                    );
                  })}
                  {/* Lot subtotal */}
                  <tr style={{ borderBottom: '2px solid var(--color-border-card)' }}>
                    <td colSpan={5} style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, fontSize: '0.82rem' }}>Sous-total Lot {li + 1}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>{formatPrice(lot.subtotal)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Grand totals */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '2px solid var(--color-primary)', background: 'var(--color-bg-section-alt)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: 400, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sous-total HT</span>
              <strong>{formatPrice(quote.subtotal)} FCFA</strong>
            </div>
            {parseFloat(quote.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Remise {quote.discount_type === 'PERCENT' ? `(${quote.discount_value}%)` : ''}</span>
                <strong>-{formatPrice(quote.discount_amount)} FCFA</strong>
              </div>
            )}
            {parseFloat(quote.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sous-total après remise</span>
                <strong>{formatPrice(quote.subtotal_after_discount)} FCFA</strong>
              </div>
            )}
            {parseFloat(quote.tax_rate) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TVA ({quote.tax_rate}%)</span>
                <strong>{formatPrice(quote.tax_amount)} FCFA</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--color-text-heading)', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>TOTAL TTC</span>
              <span>{formatPrice(quote.total_ttc)} FCFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="as-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}><i className="fas fa-cog" /> Conditions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted-ui)' }}>Délai de livraison</span>
            <p style={{ fontWeight: 600, marginTop: 2 }}>{quote.delivery_days} jours ouvrés</p>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted-ui)' }}>Validité</span>
            <p style={{ fontWeight: 600, marginTop: 2 }}>{quote.validity_days} jours</p>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted-ui)' }}>Révisions incluses</span>
            <p style={{ fontWeight: 600, marginTop: 2 }}>{quote.revision_rounds}</p>
          </div>
        </div>

        {/* Payment schedule */}
        {quote.payment_schedule && quote.payment_schedule.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted-ui)' }}>Échéancier de paiement</span>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {quote.payment_schedule.map((m, i) => (
                <div key={i} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--color-bg-section-alt)', border: '1px solid var(--color-border-card)', minWidth: 120 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{m.percent}% — {formatPrice(m.amount)} FCFA</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {quote.notes && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted-ui)' }}>Notes</span>
            <p style={{ marginTop: 4, whiteSpace: 'pre-wrap', color: 'var(--color-text-body)' }}>{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Revision reason */}
      {quote.status === 'REVISION_REQUESTED' && quote.rejection_reason && (
        <div className="as-card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #8b5cf6', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#8b5cf6', marginBottom: '0.25rem' }}><i className="fas fa-sync-alt" /> Motif de la demande de révision</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{quote.rejection_reason}</p>
        </div>
      )}

      {/* Rejection reason */}
      {quote.status === 'REJECTED' && quote.rejection_reason && (
        <div className="as-card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #dc2626' }}>
          <p style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.25rem' }}><i className="fas fa-times-circle" /> Motif du refus</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{quote.rejection_reason}</p>
        </div>
      )}

      {/* Accept confirmation modal */}
      {showAcceptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#d1fae5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '1.5rem', color: '#059669' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Accepter ce devis ?</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              En acceptant ce devis, vous confirmez votre accord sur l'ensemble des prestations, montants et conditions décrits. L'éditeur sera notifié et le projet éditorial pourra démarrer.
            </p>
            <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--color-bg-section-alt)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Montant total TTC</span><strong>{formatPrice(quote.total_ttc)} FCFA</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Délai</span><strong>{quote.delivery_days} jours ouvrés</strong></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="dashboard-btn" onClick={() => setShowAcceptModal(false)}>Annuler</button>
              <button className="dashboard-btn" onClick={() => handleRespond('accept')} disabled={acting} style={{ background: '#059669', color: '#fff', border: 'none' }}>
                {acting ? <><i className="fas fa-spinner fa-spin" /> Validation...</> : <><i className="fas fa-check" /> Confirmer l'acceptation</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision modal */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}><i className="fas fa-sync-alt" style={{ color: '#8b5cf6' }} /> Demander une révision</h3>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Expliquez ce que vous souhaitez modifier. L'éditeur recevra votre demande et pourra vous envoyer un devis révisé.
            </p>
            <textarea value={revisionReason} onChange={e => setRevisionReason(e.target.value)} placeholder="Ex: Le nombre de pages estimé est incorrect, j'aimerais un tirage initial de 300 exemplaires au lieu de 500..." rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-card)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="dashboard-btn" onClick={() => { setShowRevisionModal(false); setRevisionReason(''); }}>Annuler</button>
              <button className="dashboard-btn" onClick={() => handleRespond('revision', revisionReason)} disabled={acting || !revisionReason.trim()} style={{ background: '#8b5cf6', color: '#fff', border: 'none', opacity: !revisionReason.trim() ? 0.5 : 1 }}>
                {acting ? <><i className="fas fa-spinner fa-spin" /> Envoi...</> : <><i className="fas fa-paper-plane" /> Envoyer la demande</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}><i className="fas fa-times-circle" style={{ color: '#dc2626' }} /> Refuser ce devis</h3>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Cette action est définitive. Vous pouvez indiquer un motif (optionnel).
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Motif du refus (optionnel)..." rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-card)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="dashboard-btn" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Annuler</button>
              <button className="dashboard-btn dashboard-btn--danger" onClick={() => handleRespond('reject', rejectReason)} disabled={acting}>
                {acting ? 'Envoi...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;
