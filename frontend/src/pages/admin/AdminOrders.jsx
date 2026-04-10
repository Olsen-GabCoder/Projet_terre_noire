import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminOrders.css';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetchOrders();
  }, [location.key]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/', { params: { page_size: 50 } });
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    } finally {
      setLoading(false);
    }
  };

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
