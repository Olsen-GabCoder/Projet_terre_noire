import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminOrders.css';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { humanizeDescription, humanizeActorRole } from '../../utils/orderEventLabels';

const STATUS_OPTIONS = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'PARTIAL', 'CANCELLED'];
const STATUS_LABELS_MAP = {
  PENDING: 'En attente', PAID: 'Payé', SHIPPED: 'Expédié',
  DELIVERED: 'Livré', PARTIAL: 'Partiel', CANCELLED: 'Annulé',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const location = useLocation();

  // C2 — Filtres
  const [filters, setFilters] = useState({ status: '', search: '', date_from: '', date_to: '', vendor: '' });
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, [location.key, filters]);

  useEffect(() => {
    api.get('/organizations/', { params: { type: 'MAISON_EDITION,LIBRAIRIE' } })
      .then(res => setVendors(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => {});
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page_size: 50 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.vendor) params.vendor = filters.vendor;
      const res = await api.get('/orders/', { params });
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.vendor) params.set('vendor', filters.vendor);
    window.open(`/api/orders/export/?${params.toString()}`, '_blank');
  };

  const resetFilters = () => setFilters({ status: '', search: '', date_from: '', date_to: '', vendor: '' });

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.patch(`/orders/${orderId}/`, { status: newStatus });
      const updatedOrder = res.data;
      // Mise à jour immédiate de la liste et du modal
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder } : o))
      );
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, ...updatedOrder } : prev
      );
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusConfig = (status) => {
    const s = (status || '').toUpperCase();
    const configs = {
      PENDING: { label: 'En attente', class: 'order-status-badge--pending' },
      PAID: { label: 'Payé', class: 'order-status-badge--paid' },
      SHIPPED: { label: 'Expédié', class: 'order-status-badge--shipped' },
      DELIVERED: { label: 'Livré', class: 'order-status-badge--paid' },
      PARTIAL: { label: 'Partiel', class: 'order-status-badge--shipped' },
      ATTEMPTED: { label: 'Tentative échouée', class: 'order-status-badge--pending' },
      CANCELLED: { label: 'Annulé', class: 'order-status-badge--cancelled' },
    };
    return configs[s] || { label: status || '—', class: 'order-status-badge--pending' };
  };

  const formatPrice = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="admin-orders-loading">
        Chargement...
      </div>
    );
  }

  return (
    <div className="admin-orders-page">
      <section className="admin-orders-hero">
        <div className="admin-orders-hero__orb admin-orders-hero__orb--1" />
        <div className="admin-orders-hero__orb admin-orders-hero__orb--2" />
        <div className="admin-orders-hero__grid-bg" />
        <div className="admin-orders-hero__inner">
          <div className="admin-orders-hero__line" />
          <h1 className="admin-orders-hero__title">Gestion des Commandes</h1>
          <p className="admin-orders-hero__sub">
            Consultez et gérez les commandes de vos clients. Mettez à jour les statuts de livraison.
          </p>
          <Link to="/admin-dashboard" className="admin-orders-hero__back">
            <i className="fas fa-arrow-left" />
            Retour
          </Link>
        </div>
      </section>

      <div className="admin-orders-hero-fade" />

      <section className="admin-orders-content">
        <div className="admin-orders-inner">
          {/* Stats rapides */}
          <div className="admin-orders-stats">
            <div className="admin-orders-stat">
              <span className="admin-orders-stat__value">{orders.length}</span>
              <span className="admin-orders-stat__label">Commande{orders.length > 1 ? 's' : ''}</span>
            </div>
            <div className="admin-orders-stat admin-orders-stat--highlight">
              <span className="admin-orders-stat__value">
                {formatPrice(orders.reduce((s, o) => s + Number(o.total_amount || 0), 0))}
              </span>
              <span className="admin-orders-stat__label">Total FCFA</span>
            </div>
            <div className="admin-orders-stat">
              <span className="admin-orders-stat__value">
                {orders.filter((o) => (o.status || '').toUpperCase() === 'PENDING').length}
              </span>
              <span className="admin-orders-stat__label">En attente</span>
            </div>
          </div>

          {/* C2 — Barre de filtres */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <input
              type="text"
              placeholder="Rechercher (n°, nom, email, ville)..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ flex: '1 1 200px', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem' }}
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem' }}
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS_MAP[s]}</option>)}
            </select>
            <select
              value={filters.vendor}
              onChange={(e) => setFilters(f => ({ ...f, vendor: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem' }}
            >
              <option value="">Tous les vendeurs</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))} style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
            <input type="date" value={filters.date_to} onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))} style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
            <button onClick={resetFilters} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer' }}>
              <i className="fas fa-times" /> Réinitialiser
            </button>
            <button onClick={handleExportCSV} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-download" /> Export CSV
            </button>
          </div>

          {/* Vue tableau — desktop */}
          <div className="admin-orders-table admin-orders-table--desktop">
            {orders.length === 0 ? (
              <div className="admin-orders-empty">
                <i className="fas fa-inbox" />
                <p>Aucune commande pour le moment</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Ville</th>
                    <th>Date</th>
                    <th>Sous-total</th>
                    <th>Livraison</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const subtotal = Number(order.subtotal ?? order.total_amount ?? 0);
                    const shipping = Number(order.shipping_cost ?? 0);
                    const total = Number(order.total_amount ?? 0);
                    return (
                      <tr key={order.id}>
                        <td className="admin-orders-td-id"><strong>#{order.id}</strong></td>
                        <td>
                          <div className="order-client-name">{order.user?.full_name || order.user?.username || 'N/A'}</div>
                          <div className="order-client-email">{order.user?.email}</div>
                        </td>
                        <td>{order.shipping_city || '—'}</td>
                        <td>{new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>{formatPrice(subtotal)}</td>
                        <td>{shipping === 0 ? 'Gratuit' : formatPrice(shipping)}</td>
                        <td className="admin-orders-td-total"><strong>{formatPrice(total)}</strong></td>
                        <td>
                          <span className={`order-status-badge ${statusConfig.class}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn-view"
                          >
                            <i className="fas fa-eye" /> Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Vue cartes — mobile ultra premium */}
          <div className="admin-orders-mobile">
            {orders.length === 0 ? (
              <div className="admin-orders-empty admin-orders-empty--mobile">
                <i className="fas fa-inbox" />
                <p>Aucune commande pour le moment</p>
              </div>
            ) : (
              orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const subtotal = Number(order.subtotal ?? order.total_amount ?? 0);
                const shipping = Number(order.shipping_cost ?? 0);
                const total = Number(order.total_amount ?? 0);
                const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
                return (
                  <article key={order.id} className="admin-orders-mobile-card">
                    <div className="admin-orders-mobile-card__accent" />
                    <header className="admin-orders-mobile-card__header">
                      <div className="admin-orders-mobile-card__id-wrap">
                        <span className="admin-orders-mobile-card__id">Commande #{order.id}</span>
                        <span className="admin-orders-mobile-card__items">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
                      </div>
                      <span className={`order-status-badge ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                    </header>
                    <div className="admin-orders-mobile-card__body">
                      {(order.items || []).length > 0 && (
                        <div className="admin-orders-mobile-card__covers">
                          {(order.items || []).map((item) => (
                            <img
                              key={item.id}
                              src={item.book?.cover_image || '/images/default-book-cover.svg'}
                              alt={item.book?.title}
                              className="admin-orders-mobile-card__cover"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.target.src = '/images/default-book-cover.svg'; }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="admin-orders-mobile-card__infos">
                        <div className="admin-orders-mobile-card__info-row">
                          <span className="admin-orders-mobile-card__info-label">Client</span>
                          <span className="admin-orders-mobile-card__info-value">{order.user?.full_name || order.user?.username || 'N/A'}</span>
                        </div>
                        <div className="admin-orders-mobile-card__info-row">
                          <span className="admin-orders-mobile-card__info-label">Ville</span>
                          <span className="admin-orders-mobile-card__info-value">{order.shipping_city || '—'}</span>
                        </div>
                        <div className="admin-orders-mobile-card__info-row">
                          <span className="admin-orders-mobile-card__info-label">Date</span>
                          <span className="admin-orders-mobile-card__info-value">{new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="admin-orders-mobile-card__totals-box">
                      {order.subtotal != null && (
                        <div className="admin-orders-mobile-card__total-row">
                          <span>Sous-total</span>
                          <span>{formatPrice(subtotal)} FCFA</span>
                        </div>
                      )}
                      {order.shipping_cost != null && (
                        <div className="admin-orders-mobile-card__total-row">
                          <span>Livraison</span>
                          <span>{shipping === 0 ? 'Gratuit' : `${formatPrice(shipping)} FCFA`}</span>
                        </div>
                      )}
                      <div className="admin-orders-mobile-card__total-row admin-orders-mobile-card__total-row--main">
                        <span>Total</span>
                        <span>{formatPrice(total)} FCFA</span>
                      </div>
                    </div>
                    <footer className="admin-orders-mobile-card__footer">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="admin-orders-mobile-card__btn-view"
                      >
                        <i className="fas fa-arrow-right" />
                        Voir le détail
                      </button>
                    </footer>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Modal détail commande */}
      {selectedOrder && (
        <div
          className="admin-orders-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="admin-orders-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-orders-modal__header">
              <h2>Commande #{selectedOrder.id}</h2>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="admin-orders-modal__close"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="admin-orders-modal__body">
              <div className="admin-orders-modal__section">
                <h3>Informations client</h3>
                <p><strong>Nom :</strong> {selectedOrder.user?.full_name || 'N/A'}</p>
                <p><strong>Email :</strong> {selectedOrder.user?.email || 'N/A'}</p>
                <p><strong>Téléphone :</strong> {selectedOrder.user?.phone_number || selectedOrder.shipping_phone || 'N/A'}</p>
                <p><strong>Adresse :</strong> {selectedOrder.shipping_address || 'N/A'}</p>
              </div>
              <div className="admin-orders-modal__section">
                <h3>Articles</h3>
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={item.id || idx} className="admin-orders-modal__item">
                    <img
                      src={item.book?.cover_image || '/images/default-book-cover.svg'}
                      alt={item.book?.title}
                      className="admin-orders-modal__item-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.src = '/images/default-book-cover.svg'; }}
                    />
                    <div className="admin-orders-modal__item-info">
                      <strong>{item.book?.title || item.book_title}</strong>
                      <small>Quantité : {item.quantity} × {formatPrice(item.price)} FCFA</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-orders-modal__section">
                <h3>Montant total</h3>
                <p className="admin-orders-modal__total">{formatPrice(selectedOrder.total_amount)} FCFA</p>
              </div>

              {/* C2 — SubOrders */}
              {selectedOrder.sub_orders && selectedOrder.sub_orders.length > 0 && (
                <div className="admin-orders-modal__section">
                  <h3>Sous-commandes</h3>
                  {selectedOrder.sub_orders.map((so) => (
                    <div key={so.id} style={{ padding: '0.75rem', marginBottom: '0.5rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '0.85rem' }}>#{so.id} — {so.vendor_name}</strong>
                        <span className={`order-status-badge ${getStatusConfig(so.status).class}`} style={{ fontSize: '0.7rem' }}>
                          {so.status_display}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatPrice(so.subtotal)} FCFA
                        {so.delivery_agent_name && <> · Livreur : {so.delivery_agent_name}</>}
                        {so.attempt_count > 0 && <> · {so.attempt_count} tentative(s)</>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* C3 — Historique */}
              {selectedOrder.events && selectedOrder.events.length > 0 && (
                <div className="admin-orders-modal__section">
                  <h3>Historique</h3>
                  <div style={{ maxHeight: 200, overflowY: 'auto', paddingLeft: '0.75rem', borderLeft: '2px solid #e2e8f0' }}>
                    {selectedOrder.events.map((evt) => (
                      <div key={evt.id} style={{ padding: '0.35rem 0 0.35rem 0.5rem', fontSize: '0.75rem', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ fontWeight: 500, color: '#334155' }}>{humanizeDescription(evt)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {evt.actor_name} ({humanizeActorRole(evt.actor_role)}) · {new Date(evt.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-orders-modal__section">
                <h3>Changer le statut</h3>
                <div className="admin-orders-modal__status-actions">
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'PENDING')}
                    className="admin-orders-modal__status-btn pending"
                  >
                    En attente
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'PAID')}
                    className="admin-orders-modal__status-btn paid"
                  >
                    Payé
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'SHIPPED')}
                    className="admin-orders-modal__status-btn shipped"
                  >
                    Expédié
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'CANCELLED')}
                    className="admin-orders-modal__status-btn cancelled"
                  >
                    Annulé
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
