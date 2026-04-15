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
  const [revisionModal, setRevisionModal] = useState(null); // { orderId, reason }
  const [downloading, setDownloading] = useState(null);
  const [couponInputId, setCouponInputId] = useState(null);
  const [couponCode, setCouponCode] = useState('');

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
      const payload = { accept };
      if (accept && couponCode.trim()) payload.coupon_code = couponCode.trim();
      await servicesService.respondToQuote(quoteId, payload);
      setCouponInputId(null);
      setCouponCode('');
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

  const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const refreshOrders = async () => {
    const [reqRes, ordRes] = await Promise.all([
      servicesService.getRequests({ role: 'client' }).catch(() => ({ data: [] })),
      servicesService.getOrders().catch(() => ({ data: [] })),
    ]);
    setRequests(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.results || []);
    setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.results || []);
  };

  const handleDownloadDeliverable = async (order) => {
    setDownloading(order.id);
    try {
      await servicesService.downloadDeliverable(order.id, order.deliverable_filename);
    } catch (err) { toast.error('Erreur lors du téléchargement.'); }
    finally { setDownloading(null); }
  };

  const handleRequestRevision = async () => {
    if (!revisionModal || revisionModal.reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      await servicesService.requestRevision(revisionModal.orderId, { reason: revisionModal.reason.trim() });
      toast.success('Demande de révision envoyée au prestataire.');
      setRevisionModal(null);
      await refreshOrders();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSubmitting(false); }
  };

  const handleValidateOrder = async (orderId) => {
    try {
      await servicesService.updateOrderStatus(orderId, { status: 'COMPLETED' });
      toast.success('Commande terminée !');
      await refreshOrders();
    } catch (err) { toast.error(handleApiError(err)); }
  };

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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {couponInputId === req.pending_quote_id ? (
                              <>
                                <input
                                  type="text"
                                  value={couponCode}
                                  onChange={(e) => setCouponCode(e.target.value)}
                                  placeholder={t('services.quoteRespond.couponCodePlaceholder')}
                                  style={{ padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid var(--color-border-card)', fontSize: '0.78rem', width: 180 }}
                                />
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button className="as-cta" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => handleQuoteRespond(req.pending_quote_id, true)} disabled={!req.pending_quote_id}>
                                    Accepter
                                  </button>
                                  <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }} onClick={() => { setCouponInputId(null); setCouponCode(''); }}>
                                    Annuler
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="as-cta" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => setCouponInputId(req.pending_quote_id)} disabled={!req.pending_quote_id}>
                                  Accepter
                                </button>
                                <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }} onClick={() => handleQuoteRespond(req.pending_quote_id, false)} disabled={!req.pending_quote_id}>
                                  Refuser
                                </button>
                              </div>
                            )}
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
                        {/* Télécharger le livrable */}
                        {order.has_deliverable && (
                          <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', marginBottom: 4 }}
                            onClick={() => handleDownloadDeliverable(order)} disabled={downloading === order.id}>
                            {downloading === order.id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-download" />}
                            {' '}{order.deliverable_filename || 'Livrable'} {order.deliverable_size ? `(${fmtSize(order.deliverable_size)})` : ''}
                          </button>
                        )}
                        {/* Valider ou demander une révision */}
                        {order.status === 'REVIEW' && (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button className="as-cta" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                              onClick={() => handleValidateOrder(order.id)}>
                              <i className="fas fa-check" /> Valider
                            </button>
                            {order.revision_count < order.max_revision_rounds ? (
                              <button className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }}
                                onClick={() => setRevisionModal({ orderId: order.id, reason: '' })}>
                                <i className="fas fa-redo" /> Révision ({order.revision_count}/{order.max_revision_rounds})
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted-ui)', maxWidth: 160 }}>
                                Révisions épuisées ({order.revision_count}/{order.max_revision_rounds}). Validez ou contactez le prestataire.
                              </span>
                            )}
                          </div>
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
      {/* ══ Modal de demande de révision ══ */}
      {revisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fef3c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <i className="fas fa-redo" style={{ fontSize: '1.5rem', color: '#f59e0b' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Demander une révision</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Décrivez les modifications souhaitées. Le prestataire recevra votre demande par email.
            </p>
            <textarea
              rows={4}
              value={revisionModal.reason}
              onChange={(e) => setRevisionModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="Détaillez ce qui doit être modifié..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-card)', fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '0.5rem' }}
              maxLength={2000}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: revisionModal.reason.trim().length < 10 ? 'var(--color-error)' : 'var(--color-text-muted-ui)' }}>
                {revisionModal.reason.trim().length}/2 000 caractères (min. 10)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="dashboard-btn" onClick={() => setRevisionModal(null)}>Annuler</button>
              <button className="dashboard-btn" onClick={handleRequestRevision} disabled={submitting || revisionModal.reason.trim().length < 10}
                style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                {submitting ? <><i className="fas fa-spinner fa-spin" /> Envoi...</> : <><i className="fas fa-redo" /> Envoyer la demande</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyServiceRequests;
