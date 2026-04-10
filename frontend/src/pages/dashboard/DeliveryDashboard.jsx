import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import '../../styles/AuthorSpace.css';

// STATUS_LABELS kept for reference; labels now come from i18n
const STATUS_LABEL_KEYS = {
  PENDING: 'pending', CONFIRMED: 'confirmed', PREPARING: 'preparing',
  READY: 'ready', SHIPPED: 'shipped', DELIVERED: 'delivered', CANCELLED: 'cancelled',
};

const DeliveryDashboard = () => {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, wRes] = await Promise.all([
          marketplaceService.getMyDeliveries(),
          marketplaceService.getDeliveryWallet().catch(() => ({ data: null })),
        ]);
        setAssignments(Array.isArray(aRes.data) ? aRes.data : aRes.data?.results || []);
        setWallet(wRes.data);
      } catch (err) { setError(handleApiError(err)); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const pending = assignments.filter(a => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(a.status));
  const shipped = assignments.filter(a => a.status === 'SHIPPED');
  const delivered = assignments.filter(a => a.status === 'DELIVERED');

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title">{t('dashboard.delivery.title')}</h1>
        <p className="author-space__subtitle">{t('dashboard.delivery.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="as-stats">
        <Link to="/dashboard/delivery/assignments" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-clock" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{pending.length}</div>
            <div className="as-stat__label">{t('dashboard.delivery.pending')}</div>
          </div>
        </Link>

        <Link to="/dashboard/delivery/assignments" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}><i className="fas fa-truck" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{shipped.length}</div>
            <div className="as-stat__label">{t('dashboard.delivery.inProgress')}</div>
          </div>
        </Link>

        <Link to="/dashboard/delivery/assignments" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-check-circle" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{delivered.length}</div>
            <div className="as-stat__label">{t('dashboard.delivery.delivered')}</div>
          </div>
        </Link>

        <Link to="/dashboard/delivery/wallet" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}><i className="fas fa-wallet" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{wallet ? `${Math.round(parseFloat(wallet.balance)).toLocaleString('fr-FR')} F` : '—'}</div>
            <div className="as-stat__label">{t('dashboard.delivery.balance')}</div>
          </div>
          {wallet && parseFloat(wallet.total_earned) > 0 && (
            <span className="as-stat__badge">{t('dashboard.delivery.earned', { amount: Math.round(parseFloat(wallet.total_earned)).toLocaleString('fr-FR') })}</span>
          )}
        </Link>
      </div>

      {/* Livraisons en attente */}
      {pending.length > 0 && (
        <div className="as-alert">
          <i className="fas fa-bell" />
          <span>
            {t('dashboard.delivery.pendingAlert', { count: pending.length })}{' '}
            <Link to="/dashboard/delivery/assignments">{t('dashboard.delivery.view')}</Link>
          </span>
        </div>
      )}

      {/* Accès rapides */}
      <div className="as-shortcuts">
        <Link to="/dashboard/delivery/assignments" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            <i className="fas fa-list" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.delivery.myDeliveries')}</span>
          <span className="as-shortcut__desc">{t('dashboard.delivery.assigned', { count: assignments.length })}</span>
        </Link>

        <Link to="/dashboard/delivery/wallet" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <i className="fas fa-coins" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.delivery.wallet')}</span>
          <span className="as-shortcut__desc">{t('dashboard.delivery.walletDesc')}</span>
        </Link>

        <Link to="/dashboard/delivery/rates" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <i className="fas fa-tags" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.delivery.myRates')}</span>
          <span className="as-shortcut__desc">{t('dashboard.delivery.myRatesDesc')}</span>
        </Link>

        <Link to="/dashboard/delivery/profile" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <i className="fas fa-map-marker-alt" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.delivery.profileZones')}</span>
          <span className="as-shortcut__desc">{t('dashboard.delivery.profileZonesDesc')}</span>
        </Link>
      </div>

      {assignments.length === 0 && (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-truck" /></div>
            <h3>{t('dashboard.delivery.noAssignments')}</h3>
            <p>{t('dashboard.delivery.noAssignmentsDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
