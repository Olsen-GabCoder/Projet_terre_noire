import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();

  const STATUS_OPTIONS = [
    { value: 'CONFIRMED', label: t('vendor.orders.statusConfirm') },
    { value: 'PREPARING', label: t('vendor.orders.statusPreparing') },
    { value: 'READY', label: t('vendor.orders.statusReady') },
    { value: 'SHIPPED', label: t('vendor.orders.statusShipped') },
    { value: 'DELIVERED', label: t('vendor.orders.statusDelivered') },
    { value: 'CANCELLED', label: t('vendor.orders.statusCancel') },
  ];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await marketplaceService.getVendorOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      await marketplaceService.updateSubOrderStatus(id, { status: newStatus });
      fetchOrders();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="vendor-orders">
      <div className="dashboard-home__header">
        <h1>{t('vendor.orders.title')}</h1>
        <p className="dashboard-home__subtitle">{t('vendor.orders.subtitle')}</p>
      </div>

      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}

      {orders.length === 0 ? (
        <p className="text-muted">{t('vendor.orders.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((so) => (
            <div key={so.id} className="dashboard-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <strong>{t('vendor.orders.subOrder', { id: so.id })}</strong>
                  <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
                    ({t('vendor.orders.order', { id: so.order })})
                  </span>
                </div>
                <span className={`my-profiles__badge ${so.status === 'DELIVERED' ? 'my-profiles__badge--active' : ''}`}>
                  {so.status_display}
                </span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <strong>{t('vendor.orders.amount')}</strong> {parseInt(so.subtotal).toLocaleString()} FCFA
              </div>

              {so.items && so.items.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
                  {so.items.map((item) => (
                    <li key={item.id} style={{ padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                      {item.book_title} x{item.quantity} — {parseInt(item.price).toLocaleString()} F
                    </li>
                  ))}
                </ul>
              )}

              {/* Coordonnées client */}
              {so.client_full_name && (
                <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span><i className="fas fa-user" style={{ width: 16, marginRight: 4 }} /> {so.client_full_name}</span>
                  {so.shipping_address && <span><i className="fas fa-map-marker-alt" style={{ width: 16, marginRight: 4 }} /> {so.shipping_address}, {so.shipping_city}</span>}
                  {so.client_phone && <span><i className="fas fa-phone" style={{ width: 16, marginRight: 4 }} /> <a href={`tel:${so.client_phone}`}>{so.client_phone}</a></span>}
                  {so.client_email && <span><i className="fas fa-envelope" style={{ width: 16, marginRight: 4 }} /> <a href={`mailto:${so.client_email}`}>{so.client_email}</a></span>}
                </div>
              )}

              {so.delivery_agent_name && (
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <i className="fas fa-truck" /> {t('vendor.orders.deliveryAgent')} {so.delivery_agent_name}
                </div>
              )}

              {so.status !== 'DELIVERED' && so.status !== 'CANCELLED' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.filter((s) => s.value !== so.status).map((s) => (
                    <button
                      key={s.value}
                      className={`dashboard-btn ${s.value === 'CANCELLED' ? '' : 'dashboard-btn--primary'}`}
                      onClick={() => updateStatus(so.id, s.value)}
                      disabled={updating === so.id}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
