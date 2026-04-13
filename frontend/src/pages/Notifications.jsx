import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import notificationService from '../services/notificationService';
import SEO from '../components/SEO';
import '../styles/NotificationCenter.css';

const TYPE_ICONS = {
  ORDER_CREATED: 'fas fa-shopping-bag',
  ORDER_PAID: 'fas fa-credit-card',
  PAYMENT_FAILED: 'fas fa-times-circle',
  SUBORDER_STATUS: 'fas fa-exchange-alt',
  ORDER_DELIVERED: 'fas fa-check-circle',
  DELIVERY_ATTEMPTED: 'fas fa-exclamation-triangle',
  ORG_INVITATION: 'fas fa-envelope-open-text',
  MANUSCRIPT_STATUS: 'fas fa-file-alt',
};

const formatAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'Hier';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  const fetchNotifications = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: 20 };
      if (filter === 'unread') params.is_read = false;
      const { data } = await notificationService.getAll(params);
      setNotifications(data.results || []);
      setPagination({ count: data.count, next: data.next, previous: data.previous });
      setPage(p);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchNotifications(1); }, [fetchNotifications]);

  const handleClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch { /* silencieux */ }
    }
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silencieux */ }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setPagination(prev => ({ ...prev, count: prev.count - 1 }));
    } catch { /* silencieux */ }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalPages = Math.ceil(pagination.count / 20);

  return (
    <div className="ntf-page">
      <SEO title={t('notifications.title', 'Notifications')} />

      {/* ── Hero ── */}
      <section className="ntf-hero">
        <div className="ntf-hero__grid-bg" />
        <div className="ntf-hero__orb ntf-hero__orb--1" />
        <div className="ntf-hero__orb ntf-hero__orb--2" />
        <div className="ntf-hero__inner">
          <div className="ntf-hero__line" />
          <h1 className="ntf-hero__title">{t('notifications.title', 'Notifications')}</h1>
          <p className="ntf-hero__sub">{t('notifications.subtitle', 'Vos alertes et mises à jour')}</p>
        </div>
      </section>
      <div className="ntf-hero-fade" />

      {/* ── Content ── */}
      <div className="ntf-content">
        <div className="ntf-wrap">

          {/* Toolbar */}
          <div className="ntf-toolbar">
            <button
              className={`ntf-tab ${filter === 'all' ? 'ntf-tab--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              {t('notifications.all', 'Toutes')}
              <span className="ntf-tab__count">{pagination.count}</span>
            </button>
            <button
              className={`ntf-tab ${filter === 'unread' ? 'ntf-tab--active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              {t('notifications.unread', 'Non lues')}
            </button>

            <div className="ntf-toolbar__spacer" />

            {unreadCount > 0 && (
              <button className="ntf-mark-all-btn" onClick={handleMarkAllAsRead}>
                <i className="fas fa-check-double" />
                {t('notifications.markAllAsRead', 'Tout marquer comme lu')}
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="ntf-loading">
              <div className="ntf-spinner" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="ntf-empty">
              <div className="ntf-empty__icon">
                <i className="fas fa-bell-slash" />
              </div>
              <h2>{t('notifications.empty', 'Aucune notification')}</h2>
              <p>{t('notifications.emptyDesc', "Vous n'avez aucune notification pour le moment.")}</p>
              <Link to="/" className="ntf-empty__cta">
                <i className="fas fa-home" />
                {t('common.backToHome', "Retour à l'accueil")}
              </Link>
            </div>
          ) : (
            <div className="ntf-list">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`ntf-card ${notif.is_read ? '' : 'ntf-card--unread'}`}
                  onClick={() => handleClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(notif)}
                >
                  <div className={`ntf-card__icon ntf-card__icon--${notif.notification_type}`}>
                    <i className={TYPE_ICONS[notif.notification_type] || 'fas fa-bell'} />
                  </div>

                  <div className="ntf-card__body">
                    <p className="ntf-card__title">{notif.title}</p>
                    {notif.message && (
                      <p className="ntf-card__message">
                        {notif.message.length > 120 ? notif.message.slice(0, 120) + '…' : notif.message}
                      </p>
                    )}
                    <div className="ntf-card__meta">
                      <span className="ntf-card__time">
                        <i className="far fa-clock" />
                        {formatAgo(notif.created_at)}
                      </span>
                      <span className="ntf-card__type-label">
                        {t(`notifications.types.${notif.notification_type}`, notif.notification_type_display)}
                      </span>
                    </div>
                  </div>

                  <button
                    className="ntf-card__delete"
                    onClick={(e) => handleDelete(e, notif.id)}
                    title={t('notifications.delete', 'Supprimer')}
                    aria-label={t('notifications.delete', 'Supprimer')}
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="ntf-pagination">
              <button
                className="ntf-pag-btn"
                disabled={!pagination.previous}
                onClick={() => fetchNotifications(page - 1)}
              >
                <i className="fas fa-chevron-left" />
                {t('common.previous', 'Précédent')}
              </button>
              <span className="ntf-pag-info">{page} / {totalPages}</span>
              <button
                className="ntf-pag-btn"
                disabled={!pagination.next}
                onClick={() => fetchNotifications(page + 1)}
              >
                {t('common.next', 'Suivant')}
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="ntf-footer-fade" />
    </div>
  );
};

export default Notifications;
