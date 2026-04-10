import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';
import '../../styles/AuthorSpace.css';
import { useTranslation } from 'react-i18next';

const ProDashboard = () => {
  const [requests, setRequests] = useState([]);
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, ordRes, walRes, listRes] = await Promise.all([
          servicesService.getRequests({ role: 'provider' }).catch(() => ({ data: [] })),
          servicesService.getOrders().catch(() => ({ data: [] })),
          servicesService.getWallet().catch(() => ({ data: null })),
          servicesService.getMyListings().catch(() => ({ data: [] })),
        ]);
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.results || []);
        setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.results || []);
        setWallet(walRes.data);
        setListings(Array.isArray(listRes.data) ? listRes.data : listRes.data?.results || []);
      } catch (err) { setError(handleApiError(err)); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const pendingRequests = requests.filter(r => ['SUBMITTED', 'QUOTED'].includes(r.status));
  const activeOrders = orders.filter(o => ['IN_PROGRESS', 'REVIEW', 'REVISION'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const fmtPrice = (v) => Math.round(parseFloat(v) || 0).toLocaleString('fr-FR');

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title">Espace professionnel</h1>
        <p className="author-space__subtitle">Gérez vos services, demandes et revenus.</p>
      </div>

      <div className="as-stats">
        <Link to="/dashboard/services/requests" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-inbox" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{pendingRequests.length}</div>
            <div className="as-stat__label">Demandes en attente</div>
          </div>
          {pendingRequests.length > 0 && <span className="as-stat__badge as-stat__badge--warn">{pendingRequests.length} à traiter</span>}
        </Link>

        <Link to="/dashboard/services/orders" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}><i className="fas fa-tasks" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{activeOrders.length}</div>
            <div className="as-stat__label">Commandes en cours</div>
          </div>
        </Link>

        <Link to="/dashboard/services/orders" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-check-circle" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{completedOrders.length}</div>
            <div className="as-stat__label">Terminées</div>
          </div>
        </Link>

        <Link to="/dashboard/services/wallet" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}><i className="fas fa-wallet" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{wallet ? `${fmtPrice(wallet.balance)} F` : '—'}</div>
            <div className="as-stat__label">Solde</div>
          </div>
          {wallet && parseFloat(wallet.total_earned) > 0 && <span className="as-stat__badge">{fmtPrice(wallet.total_earned)} F gagnés</span>}
        </Link>

        <Link to="/dashboard/services/listings" className="as-stat">
          <div className="as-stat__icon" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #7c3aed)' }}><i className="fas fa-tags" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{listings.length}</div>
            <div className="as-stat__label">Offres publiées</div>
          </div>
        </Link>
      </div>

      {pendingRequests.length > 0 && (
        <div className="as-alert">
          <i className="fas fa-bell" />
          <span>{pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente de devis. <Link to="/dashboard/services/requests">Répondre →</Link></span>
        </div>
      )}

      <div className="as-shortcuts">
        <Link to="/dashboard/services/requests" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-inbox" /></div>
          <span className="as-shortcut__label">Demandes reçues</span>
          <span className="as-shortcut__desc">Répondre avec un devis</span>
        </Link>
        <Link to="/dashboard/services/orders" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}><i className="fas fa-tasks" /></div>
          <span className="as-shortcut__label">Mes commandes</span>
          <span className="as-shortcut__desc">Livrer et suivre</span>
        </Link>
        <Link to="/dashboard/services/listings" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #7c3aed)' }}><i className="fas fa-plus" /></div>
          <span className="as-shortcut__label">Gérer mes offres</span>
          <span className="as-shortcut__desc">Créer ou modifier</span>
        </Link>
        <Link to="/services" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-store" /></div>
          <span className="as-shortcut__label">Marketplace</span>
          <span className="as-shortcut__desc">Voir toutes les offres</span>
        </Link>
      </div>
    </div>
  );
};

export default ProDashboard;
