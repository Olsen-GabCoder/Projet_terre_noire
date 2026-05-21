import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Admin.css';

const LOGO_SRC = '/images/logo_terre_noire.png';

const NAV_ITEMS = [
  { path: '/admin-dashboard', icon: 'fas fa-chart-line', idx: '01', label: 'Tableau de bord', exact: true },
  { path: '/admin-dashboard/books', icon: 'fas fa-book', idx: '02', label: 'Catalogue' },
  { path: '/admin-dashboard/authors', icon: 'fas fa-feather', idx: '03', label: 'Auteurs' },
  { path: '/admin-dashboard/orders', icon: 'fas fa-bag-shopping', idx: '04', label: 'Commandes' },
  { path: '/admin-dashboard/manuscripts', icon: 'fas fa-pen-to-square', idx: '05', label: 'Manuscrits' },
  { path: '/admin-dashboard/users', icon: 'fas fa-users', idx: '06', label: 'Utilisateurs' },
  { path: '/admin-dashboard/newsletter', icon: 'fas fa-envelope', idx: '07', label: 'Newsletter' },
  { path: '/admin-dashboard/coupons', icon: 'fas fa-ticket', idx: '08', label: 'Coupons' },
  { path: '/admin-dashboard/contact', icon: 'fas fa-message', idx: '09', label: 'Contact' },
  { path: '/admin-dashboard/config', icon: 'fas fa-cog', idx: '10', label: 'Configuration' },
];

const AdminLayout = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fermer le drawer a chaque changement de route
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Bloquer le scroll body quand drawer ouvert
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  if (!isAdmin && user) {
    return (
      <div className="adm-forbidden">
        <div className="adm-forbidden__icon"><i className="fas fa-lock" /></div>
        <div className="adm-forbidden__label">Erreur &middot; 403</div>
        <h1 className="adm-forbidden__title">Acces <em>refuse</em></h1>
        <p className="adm-forbidden__msg">Vous n&apos;avez pas les droits pour acceder a cette section.</p>
        <Link to="/" className="tn-btn tn-btn--primary">Retour a l&apos;accueil</Link>
      </div>
    );
  }

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const userInitial = (user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'A').toUpperCase();
  const currentItem = NAV_ITEMS.find(n => isActive(n));
  const currentLabel = currentItem?.label || 'Admin';

  return (
    <div className="adm-layout">
      {/* ══════════ DESKTOP SIDEBAR ══════════ */}
      <aside className="adm-sidebar">
        <div className="tn-motif-bg adm-sidebar__motif" />

        <div className="adm-sidebar__brand-wrap">
          <Link to="/" className="adm-sidebar__brand">
            <img src={LOGO_SRC} alt="Terre Noire" className="adm-sidebar__logo" />
            <div>
              <span className="adm-sidebar__brand-name">TERRE NOIRE</span>
              <span className="adm-sidebar__brand-sub">Admin &middot; v1.0</span>
            </div>
          </Link>
        </div>


        <nav className="adm-sidebar__nav">
          <div className="adm-sidebar__nav-label">Principal</div>
          {NAV_ITEMS.slice(0, 5).map(item => (
            <Link key={item.path} to={item.path} className={`adm-sidebar__nav-item ${isActive(item) ? 'active' : ''}`}>
              <i className={item.icon} />
              <span className="adm-sidebar__nav-item-label">{item.label}</span>
              <span className="adm-sidebar__nav-idx">{item.idx}</span>
            </Link>
          ))}
          <div className="adm-sidebar__nav-label">Systeme</div>
          {NAV_ITEMS.slice(5).map(item => (
            <Link key={item.path} to={item.path} className={`adm-sidebar__nav-item ${isActive(item) ? 'active' : ''}`}>
              <i className={item.icon} />
              <span className="adm-sidebar__nav-item-label">{item.label}</span>
              <span className="adm-sidebar__nav-idx">{item.idx}</span>
            </Link>
          ))}
        </nav>

        <div className="adm-sidebar__bottom">
          <Link to="/" className="adm-sidebar__back-link">
            <i className="fas fa-arrow-left" /> Retour au site public
          </Link>
          {user && (
            <div className="adm-sidebar__user-card">
              <div className="adm-sidebar__user-avatar">{userInitial}</div>
              <div className="adm-sidebar__user-info">
                <div className="adm-sidebar__user-name">{user.first_name || user.username}</div>
                <div className="adm-sidebar__user-role">Administrateur</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════ MOBILE TOP BAR ══════════ */}
      <div className="adm-mob-bar">
        <button className="adm-mob-bar__menu" onClick={() => setDrawerOpen(true)} aria-label="Menu">
          <i className="fas fa-bars" />
        </button>
        <div className="adm-mob-bar__center">
          <span className="adm-mob-bar__brand">Admin</span>
          <span className="adm-mob-bar__sep">&middot;</span>
          <span className="adm-mob-bar__page">{currentLabel}</span>
        </div>
        <div className="adm-mob-bar__avatar">{userInitial}</div>
      </div>

      {/* ══════════ MOBILE DRAWER ══════════ */}
      {drawerOpen && (
        <div className="adm-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <nav className="adm-drawer" onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="adm-drawer__header">
              <img src={LOGO_SRC} alt="Terre Noire" className="adm-drawer__logo" />
              <div>
                <div className="adm-drawer__brand-name">TERRE NOIRE</div>
                <div className="adm-drawer__brand-sub">Administration</div>
              </div>
              <button className="adm-drawer__close" onClick={() => setDrawerOpen(false)} aria-label="Fermer">
                <i className="fas fa-times" />
              </button>
            </div>

            {/* User */}
            {user && (
              <div className="adm-drawer__user">
                <div className="adm-drawer__user-avatar">{userInitial}</div>
                <div>
                  <div className="adm-drawer__user-name">{user.first_name || user.username}</div>
                  <div className="adm-drawer__user-email">{user.email || 'Administrateur'}</div>
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="adm-drawer__nav">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`adm-drawer__link ${isActive(item) ? 'active' : ''}`}
                >
                  <i className={item.icon} />
                  <span>{item.label}</span>
                  {isActive(item) && <i className="fas fa-chevron-right adm-drawer__link-chevron" />}
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="adm-drawer__footer">
              <Link to="/" className="adm-drawer__back">
                <i className="fas fa-arrow-left" /> Retour au site
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

export const AdminTopbar = ({ breadcrumb = [], title, subtitle, actions }) => (
  <header className="adm-topbar">
    <div className="adm-topbar__left">
      <div className="adm-topbar__breadcrumb">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="adm-topbar__breadcrumb-sep">/</span>}
            <span className={i === breadcrumb.length - 1 ? 'adm-topbar__breadcrumb-active' : ''}>{b}</span>
          </React.Fragment>
        ))}
      </div>
      <h1 className="adm-topbar__title">{title}</h1>
      {subtitle && <p className="adm-topbar__subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="adm-topbar__actions">{actions}</div>}
  </header>
);
