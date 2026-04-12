import { useState, useEffect } from 'react';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const SUCCESS_MESSAGES = {
  CONFIRMED: 'Commande confirmée ! Le client a été notifié.',
  PREPARING: 'Commande passée en préparation.',
  READY: 'Commande marquée comme prête. Le livreur sera notifié.',
  SHIPPED: 'Commande expédiée.',
  DELIVERED: 'Commande livrée !',
  CANCELLED: 'Commande annulée.',
};

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();

  // Transitions valides par statut actuel (machine à états A1, vue vendeur)
  const NEXT_ACTIONS = {
    PENDING:   [
      { value: 'CONFIRMED', label: 'Confirmer la commande', primary: true },
      { value: 'CANCELLED', label: 'Refuser' },
    ],
    CONFIRMED: [
      { value: 'PREPARING', label: 'Passer en préparation', primary: true },
      { value: 'CANCELLED', label: 'Annuler' },
    ],
    PREPARING: [
      { value: 'READY', label: 'Marquer comme prête', primary: true },
      { value: 'CANCELLED', label: 'Annuler' },
    ],
    READY: [],  // Le vendeur attend le livreur — aucune action
    SHIPPED: [],  // Le livreur gère
    DELIVERED: [],
    CANCELLED: [],
  };
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
      toast.success(SUCCESS_MESSAGES[newStatus] || 'Statut mis à jour.');
      fetchOrders();
    } catch (err) {
      const msg = err.response?.data?.message || handleApiError(err);
      toast.error(msg);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                <div>
                  <strong>{t('vendor.orders.subOrder', { id: so.id })}</strong>
                  <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
                    ({t('vendor.orders.order', { id: so.order })})
                  </span>
                  {so.vendor_name && (
                    <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                      <i className="fas fa-building" style={{ marginRight: 3 }} />{so.vendor_name}
                    </span>
                  )}
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

              {(NEXT_ACTIONS[so.status] || []).length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {NEXT_ACTIONS[so.status].map((action) => (
                    <button
                      key={action.value}
                      className={`dashboard-btn ${action.primary ? 'dashboard-btn--primary' : ''}`}
                      onClick={() => updateStatus(so.id, action.value)}
                      disabled={updating === so.id}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {so.status === 'READY' && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  En attente du livreur pour la prise en charge.
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
