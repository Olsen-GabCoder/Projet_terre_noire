import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', bg: '#f1f5f9', color: '#475569' },
  SUBMITTED: { label: 'Envoyée', bg: '#fef3c7', color: '#d97706' },
  QUOTED: { label: 'Devis reçu', bg: '#dbeafe', color: '#2563eb' },
  ACCEPTED: { label: 'Acceptée', bg: '#d1fae5', color: '#059669' },
  IN_PROGRESS: { label: 'En cours', bg: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' },
  REVIEW: { label: 'En révision', bg: '#e0e7ff', color: '#4338ca' },
  REVISION: { label: 'À corriger', bg: '#fef3c7', color: '#d97706' },
  COMPLETED: { label: 'Terminée', bg: '#d1fae5', color: '#059669' },
  CANCELLED: { label: 'Annulée', bg: '#fee2e2', color: '#dc2626' },
};

const MyServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForm, setReviewForm] = useState(null); // { orderId, rating, comment }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, ordRes] = await Promise.all([
          servicesService.getRequests({ role: 'client' }).catch(() => ({ data: [] })),
          servicesService.getOrders().catch(() => ({ data: [] })),
        ]);
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.results || []);
        setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.results || []);
      } catch (err) { setError(handleApiError(err)); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleQuoteRespond = async (quoteId, accept) => {
    try {
      await servicesService.respondToQuote(quoteId, { accept });
      toast.success(accept ? 'Devis accepté ! Commande créée.' : 'Devis refusé.');
      // Reload
      const [reqRes, ordRes] = await Promise.all([
        servicesService.getRequests({ role: 'client' }),
        servicesService.getOrders(),
      ]);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.results || []);
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.results || []);
    } catch (err) { toast.error(handleApiError(err)); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm) return;
    setSubmitting(true);
    try {
      await servicesService.createProviderReview({
        service_order: reviewForm.orderId,
        rating: parseInt(reviewForm.rating),
        comment: reviewForm.comment,
      });
      toast.success('Avis publié !');
      setReviewForm(null);
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSubmitting(false); }
  };

  const fmtPrice = (v) => Math.round(parseFloat(v) || 0).toLocaleString('fr-FR');

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-concierge-bell" style={{ color: 'var(--color-primary)' }} /> Mes demandes de services</h1>
          <p className="author-space__subtitle">{requests.length} demande{requests.length !== 1 ? 's' : ''} · {orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/services" className="as-cta">
          <i className="fas fa-store" /> Trouver un prestataire
        </Link>
      </div>

      {/* Demandes avec devis en attente */}
      {requests.filter(r => r.status === 'QUOTED').length > 0 && (
        <div className="as-alert">
          <i className="fas fa-bell" />
          <span>{requests.filter(r => r.status === 'QUOTED').length} devis en attente de réponse.</span>
        </div>
      )}

      {/* Demandes */}
      {requests.length > 0 && (
        <div className="as-card" style={{ marginBottom: '1.5rem' }}>
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-inbox" /> Mes demandes</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>Demande</th><th>Prestataire</th><th>Budget</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] || { label: req.status_display, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-heading)', display: 'block' }}>{req.title}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{req.provider_name}</td>
                      <td style={{ fontSize: '0.85rem' }}>{req.budget_min ? `${fmtPrice(req.budget_min)} — ${fmtPrice(req.budget_max)} F` : '—'}</td>
                      <td><span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span></td>
                      <td>
                        {req.status === 'QUOTED' && req.quotes_count > 0 && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="as-cta" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => handleQuoteRespond(req.pending_quote_id, true)} disabled={!req.pending_quote_id}>
                              Accepter
                            </button>
                            <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }} onClick={() => handleQuoteRespond(req.pending_quote_id, false)} disabled={!req.pending_quote_id}>
                              Refuser
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commandes de service */}
      {orders.length > 0 && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-tasks" /> Commandes de service</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>Service</th><th>Prestataire</th><th>Montant</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || { label: order.status_display, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
                  const isReviewOpen = reviewForm?.orderId === order.id;
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-heading)', display: 'block' }}>{order.request_title || `#${order.id}`}</strong>
                        {order.deadline && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>Deadline : {new Date(order.deadline).toLocaleDateString('fr-FR')}</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{order.provider_name}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmtPrice(order.amount)} F</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {order.has_deliverable && <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted-ui)', marginTop: 2 }}><i className="fas fa-file" /> Livrable reçu</div>}
                      </td>
                      <td>
                        {/* Valider la livraison */}
                        {order.status === 'REVIEW' && (
                          <button className="as-cta" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            onClick={async () => { try { await servicesService.updateOrderStatus(order.id, { status: 'COMPLETED' }); toast.success('Commande terminée !'); window.location.reload(); } catch (err) { toast.error(handleApiError(err)); } }}>
                            <i className="fas fa-check" /> Valider
                          </button>
                        )}
                        {/* Laisser un avis */}
                        {order.status === 'COMPLETED' && !isReviewOpen && (
                          <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }}
                            onClick={() => setReviewForm({ orderId: order.id, rating: '5', comment: '' })}>
                            <i className="fas fa-star" /> Laisser un avis
                          </button>
                        )}
                        {isReviewOpen && (
                          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 180 }}>
                            <select value={reviewForm.rating} onChange={e => setReviewForm(f => ({ ...f, rating: e.target.value }))} style={{ padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid var(--color-border-card)', fontSize: '0.8rem' }}>
                              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
                            </select>
                            <textarea rows={2} value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Commentaire..." style={{ padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid var(--color-border-card)', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical' }} />
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button type="submit" className="as-cta" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} disabled={submitting}>
                                {submitting ? '...' : 'Publier'}
                              </button>
                              <button type="button" className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={() => setReviewForm(null)}>
                                Annuler
                              </button>
                            </div>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {requests.length === 0 && orders.length === 0 && (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-concierge-bell" /></div>
            <h3>Aucune demande de service</h3>
            <p>Trouvez un prestataire sur la marketplace et envoyez-lui une demande.</p>
            <Link to="/services" className="as-cta" style={{ marginTop: '1rem' }}>
              <i className="fas fa-store" /> Parcourir la marketplace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyServiceRequests;
