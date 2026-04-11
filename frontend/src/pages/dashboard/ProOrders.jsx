import { useState, useEffect } from 'react';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  PENDING: { label: 'En attente', bg: '#fef3c7', color: '#d97706' },
  IN_PROGRESS: { label: 'En cours', bg: '#dbeafe', color: '#2563eb' },
  REVIEW: { label: 'En révision', bg: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' },
  REVISION: { label: 'À corriger', bg: '#fef3c7', color: '#d97706' },
  COMPLETED: { label: 'Terminée', bg: '#d1fae5', color: '#059669' },
  CANCELLED: { label: 'Annulée', bg: '#fee2e2', color: '#dc2626' },
};

const ProOrders = () => {
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [uploading, setUploading] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await servicesService.getOrders();
      setOrders(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => {
    if (filter === 'active') return ['PENDING', 'IN_PROGRESS', 'REVIEW', 'REVISION'].includes(o.status);
    if (filter === 'completed') return o.status === 'COMPLETED';
    return true;
  });

  const handleDeliver = async (orderId, file) => {
    if (!file) return;
    setUploading(orderId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await servicesService.deliverOrder(orderId, fd);
      toast.success('Livrable envoyé !');
      fetchOrders();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setUploading(null); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await servicesService.updateOrderStatus(orderId, { status: newStatus });
      toast.success('Statut mis à jour.');
      fetchOrders();
    } catch (err) { toast.error(handleApiError(err)); }
  };

  const activeCount = orders.filter(o => ['PENDING', 'IN_PROGRESS', 'REVIEW', 'REVISION'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const fmtPrice = (v) => Math.round(parseFloat(v) || 0).toLocaleString('fr-FR');

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title"><i className="fas fa-tasks" style={{ color: 'var(--color-primary)' }} /> Commandes de service</h1>
        <p className="author-space__subtitle">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="ob-toolbar">
        {[
          { key: 'active', label: `En cours (${activeCount})` },
          { key: 'completed', label: `Terminées (${completedCount})` },
          { key: 'all', label: `Toutes (${orders.length})` },
        ].map(f => (
          <button key={f.key} className={`dashboard-btn ${filter === f.key ? 'dashboard-btn--primary' : ''}`} onClick={() => setFilter(f.key)} style={{ fontSize: '0.8rem' }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-tasks" /></div>
            <h3>Aucune commande {filter === 'active' ? 'en cours' : ''}</h3>
            <p>Les commandes apparaîtront ici quand un client accepte votre devis.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || { label: order.status_display, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
            const canDeliver = ['IN_PROGRESS', 'REVISION'].includes(order.status);
            const canStart = order.status === 'PENDING';
            return (
              <div key={order.id} className="as-card">
                <div className="as-card__body" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-heading)' }}>{order.request_title || `Commande #${order.id}`}</strong>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span><i className="fas fa-user" style={{ width: 14 }} /> Client : {order.client_name}</span>
                        <span><i className="fas fa-coins" style={{ width: 14 }} /> {fmtPrice(order.amount)} F (commission : {fmtPrice(order.platform_fee)} F)</span>
                        {order.deadline && <span><i className="fas fa-calendar" style={{ width: 14 }} /> Deadline : {new Date(order.deadline).toLocaleDateString('fr-FR')}</span>}
                        {order.has_deliverable && (
                          <span style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => servicesService.downloadDeliverable(order.id, order.deliverable_filename).catch(() => toast.error('Erreur téléchargement.'))}>
                            <i className="fas fa-download" style={{ width: 14 }} /> {order.deliverable_filename || 'Livrable envoyé'}
                          </span>
                        )}
                        {order.last_revision_reason && order.status === 'REVISION' && (
                          <span style={{ color: '#f59e0b' }}><i className="fas fa-exclamation-triangle" style={{ width: 14 }} /> Révision demandée</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      {canStart && (
                        <button className="as-cta" onClick={() => handleStatusChange(order.id, 'IN_PROGRESS')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                          <i className="fas fa-play" /> Commencer
                        </button>
                      )}
                      {canDeliver && (
                        <label className="as-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                          {uploading === order.id ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-upload" /> Livrer</>}
                          <input type="file" style={{ display: 'none' }} onChange={e => handleDeliver(order.id, e.target.files[0])} disabled={uploading === order.id} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProOrders;
