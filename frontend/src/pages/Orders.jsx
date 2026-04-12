import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useReveal } from '../hooks/useReveal';
import '../styles/Orders.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Orders = ({ embedded = false }) => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  useEffect(() => {
    if (!embedded && !user) {
      navigate('/login');
      return;
    }
    loadOrders();
  }, [user, navigate, location.key, embedded]);

  const loadOrders = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getOrders({ page_size: 10, page });
      setOrders(response.results || response);
      setPagination({
        count: response.count || 0,
        next: response.next || null,
        previous: response.previous || null,
      });
      setCurrentPage(page);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('401');
      } else {
        setError(t('pages.orders.errorLoad', 'Erreur lors du chargement de vos commandes.'));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    setDownloadingId(orderId);
    try {
      await orderService.downloadInvoice(orderId);
    } catch (err) {
      console.error(err);
      setError(t('pages.orders.errorInvoice', 'Erreur lors du téléchargement de la facture.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'CANCELLED' } : o
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t('pages.orders.errorCancel', "Impossible d'annuler la commande."));
    } finally {
      setCancellingId(null);
    }
  };

  const formatPrice = (price) => {
    return Math.round(parseFloat(price)).toLocaleString('fr-FR') + ' FCFA';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { label: t('pages.orders.statusPending', 'En attente'), class: 'ord-status--pending' },
      PAID: { label: t('pages.orders.statusPaid', 'Payé'), class: 'ord-status--paid' },
      SHIPPED: { label: t('pages.orders.statusShipped', 'Expédié'), class: 'ord-status--shipped' },
      DELIVERED: { label: t('pages.orders.statusDelivered', 'Livré'), class: 'ord-status--delivered' },
      CANCELLED: { label: t('pages.orders.statusCancelled', 'Annulé'), class: 'ord-status--cancelled' },
    };
    return configs[status] || configs.PENDING;
  };

  if (!user) return null;

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="ord-page">
      <SEO title={t('pages.orders.title', 'Mes Commandes')} />
      {!embedded && (
        <PageHero
          title={t('common.myOrders', 'Mes commandes')}
          subtitle={t('pages.orders.heroSub', "Consultez l'historique de vos commandes et suivez leur statut.")}
        >
          {orders.length > 0 && (
            <p className="ord-hero__count">
              <strong>{orders.length}</strong> {t('pages.orders.orderCount', 'commande', { count: orders.length })}{orders.length > 1 ? 's' : ''}
            </p>
          )}
        </PageHero>
      )}

      <div className={`ord-content${embedded ? '' : ' reveal-section'}`} ref={embedded ? undefined : revealRef}>
        <div className="ord-wrap">
          {error && (
            <div className="ord-error">
              <i className="fas fa-exclamation-circle" />{' '}
              {error === '401' ? (
                <>
                  {t('pages.orders.sessionExpired', 'Votre session a expiré, veuillez')}{' '}
                  <Link to="/login">{t('pages.orders.reconnect', 'vous reconnecter')}</Link>.
                </>
              ) : (
                error
              )}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="ord-empty">
              <div className="ord-empty__ico">
                <i className="fas fa-shopping-bag" />
              </div>
              <h2>{t('pages.orders.empty', 'Aucune commande')}</h2>
              <p>{t('pages.orders.emptyDesc', "Vous n'avez pas encore passé de commande.")}</p>
              <Link to="/catalog" className="ord-btn ord-btn--primary">
                <i className="fas fa-book" /> {t('pages.orders.browseCatalog', 'Découvrir le catalogue')}
              </Link>
            </div>
          ) : (
            <div className="ord-list">
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <article key={order.id} className="ord-card">
                    <div className="ord-card__header">
                      <div className="ord-card__info">
                        <h3 className="ord-card__id">{t('pages.orders.orderRef', 'Commande')} #{order.id}</h3>
                        <p className="ord-card__date">
                          <i className="far fa-calendar-alt" />
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className={`ord-status ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="ord-card__items">
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="ord-item">
                          <Link
                            to={`/books/${item.book?.id}`}
                            className="ord-item__cover"
                          >
                            <img
                              src={item.book?.cover_image || '/images/default-book-cover.svg'}
                              alt={item.book?.title}
                                loading="lazy"
                                decoding="async"
                            />
                          </Link>
                          <div className="ord-item__details">
                            <Link to={`/books/${item.book?.id}`} className="ord-item__title">
                              {item.book?.title}
                            </Link>
                            <p className="ord-item__author">
                              {item.book?.author?.full_name || t('pages.orders.unknownAuthor', 'Auteur inconnu')}
                            </p>
                            <span className="ord-item__qty">
                              {t('pages.orders.quantity', 'Quantité')} : {item.quantity}
                            </span>
                            {item.vendor_name && (
                              <span className="ord-item__vendor">
                                <i className="fas fa-store" /> {item.vendor_name}
                              </span>
                            )}
                          </div>
                          <div className="ord-item__price">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.sub_orders && order.sub_orders.length > 0 && (
                      <div className="ord-suborders">
                        <h4 className="ord-suborders__title">
                          <i className="fas fa-truck" /> Suivi par vendeur
                        </h4>
                        {order.sub_orders.map((sub) => (
                          <div key={sub.id} className="ord-suborder">
                            <div className="ord-suborder__header">
                              <span className="ord-suborder__vendor">
                                <i className="fas fa-store" /> {sub.vendor_name}
                              </span>
                              <span className={`ord-status ord-status--sm ${getStatusConfig(sub.status).class}`}>
                                {sub.status_display}
                              </span>
                            </div>
                            <div className="ord-suborder__meta">
                              <span>{formatPrice(sub.subtotal)}</span>
                              {sub.delivery_agent_name && (
                                <span className="ord-suborder__agent">
                                  <i className="fas fa-motorcycle" /> {sub.delivery_agent_name}
                                </span>
                              )}
                              {sub.delivered_at && (
                                <span className="ord-suborder__delivered">
                                  <i className="fas fa-check-circle" /> Livré le {formatDate(sub.delivered_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="ord-card__footer">
                      <div className="ord-card__shipping">
                        <p>
                          <strong>{t('pages.orders.delivery', 'Livraison')} :</strong>{' '}
                          {order.shipping_address}, {order.shipping_city}
                        </p>
                        <p>
                          <strong>{t('pages.orders.phone', 'Téléphone')} :</strong> {order.shipping_phone}
                        </p>
                      </div>
                      <div className="ord-card__total">
                        <span>{t('pages.orders.total', 'Total')}</span>
                        <strong>{formatPrice(order.total_amount)}</strong>
                      </div>
                    </div>

                    <div className="ord-card__actions">
                      <button
                        type="button"
                        className="ord-btn ord-btn--outline"
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                      >
                        {downloadingId === order.id ? (
                          <><i className="fas fa-spinner fa-spin" /> {t('pages.orders.downloading', 'Téléchargement…')}</>
                        ) : (
                          <><i className="fas fa-file-pdf" /> {t('pages.orders.downloadInvoice', 'Télécharger la facture')}</>
                        )}
                      </button>
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          className="ord-btn ord-btn--danger"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingId === order.id}
                        >
                          {cancellingId === order.id ? (
                            <><i className="fas fa-spinner fa-spin" /> {t('pages.orders.cancelling', 'Annulation…')}</>
                          ) : (
                            <><i className="fas fa-times" /> {t('pages.orders.cancelOrder', 'Annuler la commande')}</>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {orders.length > 0 && (pagination.next || pagination.previous) && (
            <nav className="cat-pag" aria-label={t('pages.orders.pagination', 'Pagination')} style={{ marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => { loadOrders(currentPage - 1); window.scrollTo(0, 0); }}
                disabled={!pagination.previous}
                className="cat-pag__btn"
              >
                <i className="fas fa-chevron-left" />
                <span>{t('common.previous')}</span>
              </button>
              <span style={{ margin: '0 1rem' }}>
                {currentPage} / {Math.ceil(pagination.count / 10)}
              </span>
              <button
                type="button"
                onClick={() => { loadOrders(currentPage + 1); window.scrollTo(0, 0); }}
                disabled={!pagination.next}
                className="cat-pag__btn"
              >
                <span>{t('common.next')}</span>
                <i className="fas fa-chevron-right" />
              </button>
            </nav>
          )}
        </div>
      </div>
      <div className="ord-footer-fade" />
    </div>
  );
};

export default Orders;
