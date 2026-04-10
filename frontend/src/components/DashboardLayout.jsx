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

/* ── Helper : sous-menus contextuels par type d'organisation ── */
const ORG_SUB_LINKS = {
  MAISON_EDITION: (id, t) => [
    { to: `/dashboard/organizations/${id}`, icon: 'fas fa-chart-line', label: t('dashboard.overview', "Vue d'ensemble"), end: true },
    { to: `/dashboard/organizations/${id}/books`, icon: 'fas fa-book', label: t('dashboard.books', 'Livres') },
    { to: `/dashboard/organizations/${id}/manuscripts`, icon: 'fas fa-inbox', label: t('dashboard.manuscripts', 'Manuscrits') },
    { to: `/dashboard/organizations/${id}/projects`, icon: 'fas fa-project-diagram', label: t('dashboard.editorialProjects.title', 'Projets éditoriaux') },
    { to: `/dashboard/organizations/${id}/print-requests`, icon: 'fas fa-print', label: t('dashboard.printRequests', 'Impression') },
    { to: `/dashboard/organizations/${id}/settings`, icon: 'fas fa-cog', label: t('dashboard.settings', 'Paramètres') },
  ],
  LIBRAIRIE: (id, t) => [
    { to: `/dashboard/organizations/${id}`, icon: 'fas fa-chart-line', label: t('dashboard.overview', "Vue d'ensemble"), end: true },
    { to: `/dashboard/organizations/${id}/books`, icon: 'fas fa-book', label: t('dashboard.catalog', 'Catalogue') },
    { to: `/dashboard/organizations/${id}/settings`, icon: 'fas fa-cog', label: t('dashboard.settings', 'Paramètres') },
  ],
  BIBLIOTHEQUE: (id, t) => [
    { to: `/dashboard/organizations/${id}`, icon: 'fas fa-chart-line', label: t('dashboard.overview', "Vue d'ensemble"), end: true },
    { to: `/dashboard/organizations/${id}/settings`, icon: 'fas fa-cog', label: t('dashboard.settings', 'Paramètres') },
  ],
  IMPRIMERIE: (id, t) => [
    { to: `/dashboard/organizations/${id}`, icon: 'fas fa-chart-line', label: t('dashboard.overview', "Vue d'ensemble"), end: true },
    { to: `/dashboard/organizations/${id}/print-requests`, icon: 'fas fa-print', label: t('dashboard.printRequests', 'Demandes') },
    { to: `/dashboard/organizations/${id}/settings`, icon: 'fas fa-cog', label: t('dashboard.settings', 'Paramètres') },
  ],
};

const DashboardLayout = () => {
  const { t } = useTranslation();
  const { user, isAdmin, organizationMemberships } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const [expandedOrg, setExpandedOrg] = useState(null);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Auto-expand l'organisation active d'après l'URL
  useEffect(() => {
    const match = location.pathname.match(/\/dashboard\/organizations\/(\d+)/);
    if (match) setExpandedOrg(Number(match[1]));
  }, [location.pathname]);

  // Fetch dashboard counts
  useEffect(() => {
    api.get('/users/dashboard-counts/')
      .then(res => setCounts(prev => ({ ...prev, ...res.data })))
      .catch(() => {});
    api.get('/services/quotes/', { params: { role: 'client' } })
      .then(res => {
        const quotes = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCounts(prev => ({ ...prev, pending_quotes: quotes.filter(q => q.status === 'SENT').length }));
      })
      .catch(() => {});
  }, [location.pathname]);

  const isProfessional = user?.profile_types?.some(
    (pt) => ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR'].includes(pt)
  );
  const isAuthor = user?.profile_types?.includes('AUTEUR');
  const isDeliveryAgent = user?.profile_types?.includes('LIVREUR');
  const isVendor = organizationMemberships.some(
    (m) => ['MAISON_EDITION', 'LIBRAIRIE'].includes(m.organization_type)
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'COMMERCIAL'].includes(m.role)
  );

  const toggleOrg = (orgId) => {
    setExpandedOrg(prev => prev === orgId ? null : orgId);
  };

  return (
    <div className={`dashboard ${sidebarOpen ? 'dashboard--sidebar-open' : ''}`}>
      <button className="dashboard__fab" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
        <i className="fas fa-bars" />
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

        {/* ═══════════ MON ESPACE ═══════════ */}
        <nav className="dashboard__nav">
          <h3 className="dashboard__section-title">{t('dashboard.mySpace', 'Mon espace')}</h3>

          {/* Actions quotidiennes */}
          <NavLink to="/dashboard" end className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-home" /> {t('dashboard.overview', "Vue d'ensemble")}
          </NavLink>
          <NavLink to="/dashboard/orders" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-box" /> {t('dashboard.myOrders', 'Mes commandes')}
            <Badge count={counts.pending_orders} accent />
          </NavLink>
          <NavLink to="/dashboard/wishlist" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-heart" /> {t('dashboard.wishlist', 'Liste de souhaits')}
          </NavLink>

          {/* Activites editoriales */}
          <NavLink to="/dashboard/my-manuscripts" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-file-alt" /> {t('dashboard.mySubmissions', 'Mes soumissions')}
            <Badge count={counts.manuscripts} />
          </NavLink>
          <NavLink to="/dashboard/my-quotes" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-file-invoice" /> {t('dashboard.myQuotes', 'Mes devis')}
            <Badge count={counts.pending_quotes} accent />
          </NavLink>
          <NavLink to="/dashboard/my-service-requests" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-concierge-bell" /> {t('dashboard.myRequests', 'Mes demandes pro')}
            <Badge count={counts.my_service_requests} />
          </NavLink>
          <NavLink to="/dashboard/my-loans" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-book-reader" /> {t('dashboard.myLoans', 'Mes prêts')}
            <Badge count={counts.active_loans} />
          </NavLink>

          {/* Vie sociale */}
          <div className="dashboard__sub-title">{t('dashboard.social', 'Vie sociale')}</div>
          <NavLink to="/dashboard/lists" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-bookmark" /> {t('dashboard.myLists', 'Mes listes')}
          </NavLink>
          <NavLink to="/dashboard/clubs" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-users" /> {t('dashboard.myClubs', 'Mes clubs')}
          </NavLink>

          {/* Gestion du compte */}
          <div className="dashboard__sub-title">{t('dashboard.account', 'Mon compte')}</div>
          <NavLink to="/dashboard/profile" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-user" /> {t('dashboard.myProfile', 'Mon profil')}
          </NavLink>
          <NavLink to="/dashboard/security" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-shield-alt" /> {t('dashboard.security', 'Sécurité')}
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-cog" /> {t('dashboard.settingsLabel', 'Réglages')}
          </NavLink>
          <NavLink to="/dashboard/invitations" className={({ isActive }) => `dashboard__nav-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-envelope-open-text" /> {t('dashboard.invitations', 'Invitations')}
            <Badge count={counts.invitations} accent />
          </NavLink>
        </nav>

        {/* ═══════════ ESPACE AUTEUR ═══════════ */}
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

        {/* ═══════════ MES ORGANISATIONS ═══════════ */}
        {organizationMemberships.length > 0 && (
          <div className="dashboard__orgs-section">
            <h3 className="dashboard__orgs-title">{t('dashboard.myOrgs', 'Mes organisations')}</h3>
            {organizationMemberships.map((m) => {
              const isExpanded = expandedOrg === m.organization_id;
              const subLinks = (ORG_SUB_LINKS[m.organization_type] || ORG_SUB_LINKS.MAISON_EDITION)(m.organization_id, t);
              return (
                <div key={m.organization_id} className="dashboard__org-group">
                  <button
                    className={`dashboard__nav-link dashboard__nav-link--org ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleOrg(m.organization_id)}
                    type="button"
                  >
                    <i className="fas fa-building" /> {m.organization_name}
                    <span className="dashboard__nav-badge">{m.role}</span>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} dashboard__org-chevron`} />
                  </button>
                  {isExpanded && (
                    <div className="dashboard__org-sub">
                      {subLinks.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          end={link.end || false}
                          className={({ isActive }) => `dashboard__nav-link dashboard__nav-link--sub ${isActive ? 'active' : ''}`}
                        >
                          <i className={link.icon} /> {link.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════ SERVICES PRO ═══════════ */}
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
          </div>
        )}

        {/* ═══════════ ESPACE LIVREUR ═══════════ */}
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

        {/* ═══════════ ESPACE VENDEUR ═══════════ */}
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

        {/* ═══════════ ADMINISTRATION ═══════════ */}
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
