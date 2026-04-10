import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';

const VendorDashboard = () => {
  const [wallet, setWallet] = useState(null);
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, listingsRes, ordersRes] = await Promise.all([
          marketplaceService.getWallet().catch(() => ({ data: null })),
          marketplaceService.getMyListings().catch(() => ({ data: [] })),
          marketplaceService.getVendorOrders().catch(() => ({ data: [] })),
        ]);
        setWallet(walletRes.data);
        setListings(Array.isArray(listingsRes.data) ? listingsRes.data : []);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-home__header">
        <h1>{t('vendor.dashboard.title')}</h1>
        <p className="dashboard-home__subtitle">{t('vendor.dashboard.subtitle')}</p>
      </div>

      <div className="dashboard-home__grid">
        {/* Stats */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-chart-line" /> {t('vendor.dashboard.overview')}</h2></div>
          <div className="dashboard-card__body">
            <div className="org-dashboard__stats">
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">{listings.length}</span>
                <span className="org-dashboard__stat-label">{t('vendor.dashboard.activeListings')}</span>
              </div>
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">{pendingOrders.length}</span>
                <span className="org-dashboard__stat-label">{t('vendor.dashboard.pendingOrders')}</span>
              </div>
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">
                  {wallet ? `${parseInt(wallet.balance).toLocaleString()} F` : '—'}
                </span>
                <span className="org-dashboard__stat-label">{t('vendor.dashboard.balance')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Raccourcis */}
        <div className="dashboard-card">
          <div className="dashboard-card__header"><h2><i className="fas fa-bolt" /> {t('vendor.dashboard.quickActions')}</h2></div>
          <div className="dashboard-card__body dashboard-home__shortcuts">
            <Link to="/vendor/listings" className="dashboard-shortcut">
              <i className="fas fa-tags" /> {t('vendor.dashboard.myListings')}
            </Link>
            <Link to="/vendor/orders" className="dashboard-shortcut">
              <i className="fas fa-box" /> {t('vendor.dashboard.orders')}
            </Link>
            <Link to="/vendor/wallet" className="dashboard-shortcut">
              <i className="fas fa-wallet" /> {t('vendor.dashboard.wallet')}
            </Link>
            <Link to="/catalog" className="dashboard-shortcut">
              <i className="fas fa-book" /> {t('vendor.dashboard.catalog')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
