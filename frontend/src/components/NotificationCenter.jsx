import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import notificationService from '../services/notificationService';
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
    day: 'numeric', month: 'short',
  });
};

const NotificationCenter = ({ mobile = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const portalDropdownRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationService.getUnreadCount();
      setUnreadCount(data.count);
    } catch {
      // Silencieux
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationService.getAll({ page_size: 8 });
      setNotifications(data.results || []);
      setUnreadCount(data.results?.filter(n => !n.is_read).length ?? 0);
    } catch {
      // Silencieux
    }
  }, []);

  // Polling 60s + pause visibilitychange
  useEffect(() => {
    fetchUnreadCount();

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchUnreadCount, 60000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchUnreadCount();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchUnreadCount]);

  // Fermer au clic extérieur (gère aussi le dropdown en portal)
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inBell = dropdownRef.current && dropdownRef.current.contains(e.target);
      const inPortal = portalDropdownRef.current && portalDropdownRef.current.contains(e.target);
      if (!inBell && !inPortal) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) fetchNotifications();
    setIsOpen(!isOpen);
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* silencieux */ }
    }
    setIsOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silencieux */ }
  };

  // Mobile variant — bigger touch target, dropdown via portal
  if (mobile) {
    return (
      <div className="notification-center" ref={dropdownRef}>
        <button className="notification-bell-mobile" onClick={toggleDropdown} aria-label={t('notifications.title', 'Notifications')}>
          <i className="fas fa-bell" />
          {unreadCount > 0 && <span className="notification-badge-mobile">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {isOpen && createPortal(
          <div className="notification-portal-overlay" ref={portalDropdownRef}>
            {renderDropdown()}
          </div>,
          document.body
        )}
      </div>
    );
  }

  function renderDropdown() {
    return (
      <div className="notification-dropdown">
        <div className="notification-dropdown__header">
          <h3>{t('notifications.title', 'Notifications')}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button className="notification-dropdown__mark-all" onClick={handleMarkAllAsRead}>
                <i className="fas fa-check-double" style={{ marginRight: 4, fontSize: '0.65rem' }} />
                {t('notifications.markAllAsRead', 'Tout marquer comme lu')}
              </button>
            )}
            {/* Close button on mobile */}
            <button
              className="notification-dropdown__close"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        <div className="notification-dropdown__list">
          {notifications.length === 0 ? (
            <div className="notification-dropdown__empty">
              <div className="notification-dropdown__empty-icon">
                <i className="fas fa-bell-slash" />
              </div>
              <p>{t('notifications.empty', 'Aucune notification')}</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`notification-item ${notif.is_read ? '' : 'notification-item--unread'}`}
                onClick={() => handleNotifClick(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(notif)}
              >
                <div className={`notification-item__icon notification-item__icon--${notif.notification_type}`}>
                  <i className={TYPE_ICONS[notif.notification_type] || 'fas fa-bell'} />
                </div>
                <div className="notification-item__body">
                  <p className="notification-item__title">{notif.title}</p>
                  {notif.message && <p className="notification-item__message">{notif.message}</p>}
                  <span className="notification-item__time">{formatAgo(notif.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <Link to="/notifications" className="notification-dropdown__footer" onClick={() => setIsOpen(false)}>
          {t('notifications.viewAll', 'Voir toutes les notifications')}
          <i className="fas fa-arrow-right" />
        </Link>
      </div>
    );
  }

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className={`notification-bell ${isOpen ? 'notification-bell--active' : ''}`}
        onClick={toggleDropdown}
        aria-label={t('notifications.title', 'Notifications')}
        aria-expanded={isOpen}
      >
        <i className="fas fa-bell" />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && renderDropdown()}
    </div>
  );
};

export default NotificationCenter;
