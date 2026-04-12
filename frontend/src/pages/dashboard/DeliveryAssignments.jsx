import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';

const STATUS_CONFIG_BASE = {
  PENDING: { key: 'pending', bg: '#fef3c7', color: '#d97706' },
  CONFIRMED: { key: 'confirmed', bg: '#dbeafe', color: '#2563eb' },
  PREPARING: { key: 'preparing', bg: '#dbeafe', color: '#2563eb' },
  READY: { key: 'ready', bg: '#d1fae5', color: '#059669' },
  SHIPPED: { key: 'shipped', bg: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' },
  DELIVERED: { key: 'delivered', bg: '#d1fae5', color: '#059669' },
  CANCELLED: { key: 'cancelled', bg: '#fee2e2', color: '#dc2626' },
};

const DeliveryAssignments = () => {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active'); // active | delivered | all
  const [updating, setUpdating] = useState(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await marketplaceService.getMyDeliveries();
      setAssignments(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const handleStatusUpdate = async (subOrderId, newStatus) => {
    setUpdating(subOrderId);
    try {
      await marketplaceService.updateDeliveryStatus(subOrderId, { status: newStatus });
      toast.success(newStatus === 'SHIPPED' ? t('dashboard.deliveryAssignments.markedShipped') : t('dashboard.deliveryAssignments.deliveryConfirmed'));
      fetchAssignments();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setUpdating(null); }
  };

  const filtered = assignments.filter(a => {
    if (filter === 'active') return !['DELIVERED', 'CANCELLED'].includes(a.status);
    if (filter === 'delivered') return a.status === 'DELIVERED';
    return true;
  });

  const activeCount = assignments.filter(a => !['DELIVERED', 'CANCELLED'].includes(a.status)).length;
  const deliveredCount = assignments.filter(a => a.status === 'DELIVERED').length;

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title"><i className="fas fa-truck" style={{ color: 'var(--color-primary)' }} /> {t('dashboard.deliveryAssignments.title')}</h1>
        <p className="author-space__subtitle">{t('dashboard.deliveryAssignments.subtitle', { count: assignments.length })}</p>
      </div>

      {/* Filtres */}
      <div className="ob-toolbar">
        {[
          { key: 'active', label: `${t('dashboard.deliveryAssignments.filterActive')} (${activeCount})` },
          { key: 'delivered', label: `${t('dashboard.deliveryAssignments.filterDelivered')} (${deliveredCount})` },
          { key: 'all', label: `${t('dashboard.deliveryAssignments.filterAll')} (${assignments.length})` },
        ].map(f => (
          <button
            key={f.key}
            className={`dashboard-btn ${filter === f.key ? 'dashboard-btn--primary' : ''}`}
            onClick={() => setFilter(f.key)}
            style={{ fontSize: '0.8rem' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-truck" /></div>
            <h3>{filter === 'active' ? t('dashboard.deliveryAssignments.noActive') : filter === 'delivered' ? t('dashboard.deliveryAssignments.noDelivered') : t('dashboard.deliveryAssignments.noDeliveries')}</h3>
            <p>{t('dashboard.deliveryAssignments.emptyDesc')}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(sub => {
            const cfgBase = STATUS_CONFIG_BASE[sub.status];
            const cfg = cfgBase ? { label: t(`dashboard.deliveryAssignments.status_${cfgBase.key}`), bg: cfgBase.bg, color: cfgBase.color } : { label: sub.status, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
            const canShip = ['READY', 'CONFIRMED', 'PREPARING'].includes(sub.status);
            const canDeliver = sub.status === 'SHIPPED';
            return (
              <div key={sub.id} className="as-card">
                <div className="as-card__body" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Infos commande */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-heading)' }}>
                          {t('dashboard.deliveryAssignments.order')} #{sub.order}
                        </span>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span><i className="fas fa-store" style={{ width: 14, marginRight: 4 }} /> {sub.vendor_name || `Vendeur #${sub.vendor}`}</span>
                        {sub.client_full_name && <span><i className="fas fa-user" style={{ width: 14, marginRight: 4 }} /> {sub.client_full_name}</span>}
                        {sub.shipping_address && <span><i className="fas fa-map-marker-alt" style={{ width: 14, marginRight: 4 }} /> {sub.shipping_address}, {sub.shipping_city}</span>}
                        {sub.client_phone && <span><i className="fas fa-phone" style={{ width: 14, marginRight: 4 }} /> <a href={`tel:${sub.client_phone}`} style={{ color: 'var(--color-primary)' }}>{sub.client_phone}</a></span>}
                        <span><i className="fas fa-coins" style={{ width: 14, marginRight: 4 }} /> {Math.round(parseFloat(sub.subtotal || 0)).toLocaleString('fr-FR')} F · {t('dashboard.deliveryAssignments.deliveryFee')} : {Math.round(parseFloat(sub.delivery_fee || 0)).toLocaleString('fr-FR')} F</span>
                        {sub.delivered_at && <span><i className="fas fa-check" style={{ width: 14, marginRight: 4 }} /> {t('dashboard.deliveryAssignments.deliveredOn')} {new Date(sub.delivered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {canShip && (
                        <button
                          className="as-cta"
                          onClick={() => handleStatusUpdate(sub.id, 'SHIPPED')}
                          disabled={updating === sub.id}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        >
                          {updating === sub.id ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-truck" /> {t('dashboard.deliveryAssignments.ship')}</>}
                        </button>
                      )}
                      {canDeliver && (
                        <button
                          className="as-cta"
                          onClick={() => handleStatusUpdate(sub.id, 'DELIVERED')}
                          disabled={updating === sub.id}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                          {updating === sub.id ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check-circle" /> {t('dashboard.deliveryAssignments.confirmDelivery')}</>}
                        </button>
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

export default DeliveryAssignments;
