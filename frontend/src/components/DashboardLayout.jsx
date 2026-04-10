import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/Dashboard.css';

const Badge = ({ count, accent }) => {
  if (!count) return null;
  return (
    <span className={`dashboard__nav-badge ${accent ? 'dashboard__nav-badge--accent' : ''}`}>
      {count}
    </span>
  );
};

const DashboardLayout = () => {
  const { t } = useTranslation();
  const { user, isAdmin, organizationMemberships } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Fetch dashboard counts
  useEffect(() => {
    api.get('/users/dashboard-counts/')
      .then(res => setCounts(prev => ({ ...prev, ...res.data })))
      .catch(() => {});
    // Devis reçus en attente de réponse (SENT, côté client)
    api.get('/services/quotes/', { params: { role: 'client' } })
      .then(res => {
        const quotes = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCounts(prev => ({ ...prev, pending_quotes: quotes.filter(q => q.status === 'SENT').length }));
      })
      .catch(() => {});
  }, [location.pathname]);

  const isVendor = organizationMemberships.some(
    (m) => ['MAISON_EDITION', 'LIBRAIRIE'].includes(m.organization_type)
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'].includes(m.role)
  );
  const isPublisher = organizationMemberships.some(
    (m) => m.organization_type === 'MAISON_EDITION'
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'EDITEUR'].includes(m.role)
  );
  const isLibrarian = organizationMemberships.some(
    (m) => m.organization_type === 'BIBLIOTHEQUE'
      && ['PROPRIETAIRE', 'ADMINISTRATEUR'].includes(m.role)
  );
  const libraryOrgs = organizationMemberships.filter(
    (m) => m.organization_type === 'BIBLIOTHEQUE'
      && ['PROPRIETAIRE', 'ADMINISTRATEUR'].includes(m.role)
  );
  const isProfessional = user?.profile_types?.some(
    (t) => ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'].includes(t)
  );
  const isAuthor = user?.profile_types?.includes('AUTEUR');
  const isDeliveryAgent = user?.profile_types?.includes('LIVREUR');

  return (
    <div className={`dashboard ${sidebarOpen ? 'dashboard--sidebar-open' : ''}`}>
      <button className="dashboard__fab" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
        <i className="fas fa-plus" />
      </button>

      {sidebarOpen && <div className="dashboard__overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`dashboard__sidebar ${sidebarOpen ? 'dashboard__sidebar--open' : ''}`}>
        <div className="dashboard__sidebar-header">
          <div>
            <h2 className="dashboard__sidebar-title">{t('dashboard.title', 'Tableau de bord')}</h2>
            <p className="dashboard__sidebar-user">{user?.first_name || user?.username}</p>
          </div>
          <button className="dashboard__sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu">
            <i className="fas fa-times" />
          </button>
        </div>

        <nav className="dashboard__nav">
          <NavLink to="/dashboard" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-home" /> {t('dashboard.overview', "Vue d'ensemble")}
          </NavLink>
          <NavLink to="/dashboard/profiles" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-id-badge" /> {t('dashboard.profiles', 'Mes profils')}
          </NavLink>
          <NavLink to="/dashboard/organizations" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-building" /> {t('dashboard.organizations', 'Organisations')}
          </NavLink>
          <NavLink to="/lists" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-bookmark" /> {t('dashboard.myLists', 'Mes listes')}
          </NavLink>
          <NavLink to="/dashboard/invitations" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-envelope-open-text" /> {t('dashboard.invitations', 'Invitations')}
            <Badge count={counts.invitations} accent />
          </NavLink>
          <NavLink to="/dashboard/my-loans" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-book-reader" /> {t('dashboard.myLoans', 'Mes prêts')}
            <Badge count={counts.active_loans} />
          </NavLink>
          <NavLink to="/dashboard/my-manuscripts" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-file-alt" /> {t('dashboard.mySubmissions', 'Mes soumissions')}
            <Badge count={counts.manuscripts} />
          </NavLink>
          <NavLink to="/dashboard/my-service-requests" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-concierge-bell" /> {t('dashboard.myRequests', 'Mes demandes pro')}
            <Badge count={counts.my_service_requests} />
          </NavLink>
            <NavLink to="/dashboard/my-quotes" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-file-invoice" /> {t('dashboard.myQuotes', 'Mes devis')}
              <Badge count={counts.pending_quotes} accent />
            </NavLink>
          <NavLink to="/dashboard/security" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-shield-alt" /> {t('dashboard.security', 'Sécurité')}
          </NavLink>
        </nav>

        {organizationMemberships.length > 0 && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.myOrgs', 'Mes organisations')}</h3>
            {organizationMemberships.map((m) => (
              <NavLink
                key={m.organization_id}
                to={`/dashboard/organizations/${m.organization_id}`}
                className={({ isActive }) => `dashboard__nav-link dashboard__nav-link--org ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-building" /> {m.organization_name}
                <span className="dashboard__nav-badge">{m.role}</span>
              </NavLink>
            ))}
          </div>
        )}

        {isAuthor && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.authorSpace', 'Espace auteur')}</h3>
            <NavLink to="/dashboard/author" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-chart-line" /> {t('dashboard.overview', "Vue d'ensemble")}
            </NavLink>
            <NavLink to="/dashboard/author/books" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-book" /> {t('dashboard.myBooks', 'Mes livres')}
            </NavLink>
            <NavLink to="/dashboard/author/sales" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-coins" /> {t('dashboard.sales', 'Ventes')}
            </NavLink>
            <NavLink to="/dashboard/author/reviews" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-star" /> {t('dashboard.readerReviews', 'Avis lecteurs')}
            </NavLink>
            <NavLink to="/dashboard/author/manuscripts" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-file-alt" /> {t('dashboard.manuscripts', 'Manuscrits')}
            </NavLink>
            <NavLink to="/dashboard/author/profile" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-id-card" /> {t('dashboard.publicProfile', 'Profil public')}
            </NavLink>
          </div>
        )}

        {isDeliveryAgent && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.deliverySpace', 'Espace livreur')}</h3>
            <NavLink to="/dashboard/delivery" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-chart-line" /> {t('dashboard.overview', "Vue d'ensemble")}
            </NavLink>
            <NavLink to="/dashboard/delivery/assignments" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-truck" /> {t('dashboard.myDeliveries', 'Mes livraisons')}
            </NavLink>
            <NavLink to="/dashboard/delivery/wallet" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-wallet" /> {t('dashboard.wallet', 'Portefeuille')}
            </NavLink>
            <NavLink to="/dashboard/delivery/rates" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-tags" /> {t('dashboard.myRates', 'Mes tarifs')}
            </NavLink>
            <NavLink to="/dashboard/delivery/profile" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-map-marker-alt" /> {t('dashboard.profileZones', 'Profil & zones')}
            </NavLink>
          </div>
        )}

        {isProfessional && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.proServices', 'Services pro')}</h3>
            <NavLink to="/dashboard/services" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-chart-line" /> {t('dashboard.overview', "Vue d'ensemble")}
            </NavLink>
            <NavLink to="/dashboard/services/requests" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-inbox" /> {t('dashboard.receivedRequests', 'Demandes reçues')}
              <Badge count={counts.pro_requests_pending} accent />
            </NavLink>
            <NavLink to="/dashboard/services/orders" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-tasks" /> {t('dashboard.orders', 'Commandes')}
              <Badge count={counts.pro_orders} />
            </NavLink>
            <NavLink to="/dashboard/services/listings" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-tags" /> {t('dashboard.myOffers', 'Mes offres')}
              <Badge count={counts.pro_listings} />
            </NavLink>
            <NavLink to="/dashboard/services/wallet" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-wallet" /> {t('dashboard.wallet', 'Portefeuille')}
            </NavLink>
              <NavLink to="/dashboard/services/quotes" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-file-invoice-dollar" /> {t('dashboard.quotes', 'Devis DQE')}
              </NavLink>
            <NavLink to="/services" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-store" /> {t('dashboard.marketplace', 'Marketplace')}
            </NavLink>
          </div>
        )}

        {isPublisher && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.publishing', 'Édition')}</h3>
            <NavLink to="/dashboard/projects" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-project-diagram" /> {t('dashboard.editorialProjects.title', 'Projets éditoriaux')}
            </NavLink>
            {organizationMemberships
              .filter((m) => m.organization_type === 'MAISON_EDITION' && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'EDITEUR'].includes(m.role))
              .map((m) => (
                <div key={`pub-${m.organization_id}`}>
                  <NavLink to={`/dashboard/organizations/${m.organization_id}/books`} className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fas fa-book" /> {t('dashboard.books', 'Livres')} — {m.organization_name}
                  </NavLink>
                  <NavLink to={`/dashboard/organizations/${m.organization_id}/manuscripts`} className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
                    <i className="fas fa-inbox" /> {t('dashboard.manuscripts', 'Manuscrits')} — {m.organization_name}
                  </NavLink>
                </div>
              ))
            }
          </div>
        )}

        {isLibrarian && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.library', 'Bibliothèque')}</h3>
            {libraryOrgs.map((m) => (
              <NavLink key={`lib-${m.organization_id}`} to={`/dashboard/organizations/${m.organization_id}`} className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-book" /> {m.organization_name}
              </NavLink>
            ))}
          </div>
        )}

        {isVendor && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.vendorSpace', 'Espace vendeur')}</h3>
            <NavLink to="/vendor" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-store" /> {t('dashboard.dashboard', 'Tableau de bord')}
            </NavLink>
            <NavLink to="/vendor/listings" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-tags" /> {t('dashboard.myOffers', 'Mes offres')}
            </NavLink>
            <NavLink to="/vendor/orders" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-box" /> {t('dashboard.orders', 'Commandes')}
            </NavLink>
            <NavLink to="/vendor/wallet" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
              <i className="fas fa-wallet" /> {t('dashboard.wallet', 'Portefeuille')}
            </NavLink>
          </div>
        )}

        {isAdmin && (
          <div className="dashboard__admin-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.admin', 'Administration')}</h3>
            <NavLink to="/admin-dashboard" className="dashboard__nav-link dashboard__nav-link--admin">
              <i className="fas fa-cogs" /> Admin Frollot
            </NavLink>
          </div>
        )}
      </aside>

      <main className="dashboard__main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
