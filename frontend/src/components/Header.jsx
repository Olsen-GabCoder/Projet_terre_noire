import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/Header.css';

// Logo : placer le fichier logo_terre_noire.png dans public/images/
const LOGO_SRC = '/images/logo_terre_noire.png';

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { getTotalItems } = useCart();
  const { getWishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeItem, setActiveItem] = useState('');
  
  const mobileMenuRef = useRef(null);
  const burgerButtonRef = useRef(null);
  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const navItems = [
      { path: '/', label: 'Accueil' },
      { path: '/catalog', label: 'Catalogue' },
      { path: '/authors', label: 'Auteurs' },
      { path: '/about', label: 'À propos' },
      { path: '/contact', label: 'Contact' },
    ];
    
    const active = navItems.find(item => item.path === currentPath);
    if (active) {
      setActiveItem(active.label);
    }
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
      if (searchRef.current) {
        searchRef.current.blur();
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleUserDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUserDropdownOpen(!userDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeAllMenus = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && 
          userDropdownRef.current && 
          !userDropdownRef.current.contains(event.target) &&
          !event.target.closest('.user-trigger')) {
        setUserDropdownOpen(false);
      }
      
      if (mobileMenuOpen && 
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target) &&
          burgerButtonRef.current &&
          !burgerButtonRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen, mobileMenuOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeAllMenus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { path: '/', label: 'Accueil', icon: 'fas fa-home' },
    { path: '/catalog', label: 'Catalogue', icon: 'fas fa-book' },
    { path: '/authors', label: 'Auteurs', icon: 'fas fa-user-pen' },
    { path: '/about', label: 'À propos', icon: 'fas fa-info-circle' },
    { path: '/contact', label: 'Contact', icon: 'fas fa-envelope' },
  ];

  const MobileMenuOverlay = () => (
    <div 
      ref={mobileMenuRef}
      className="mobile-menu-overlay"
      onClick={(e) => {
        if (e.target.classList.contains('mobile-menu-overlay')) {
          setMobileMenuOpen(false);
        }
      }}
    >
      <div className="mobile-menu-container">
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <div className="brand-logo brand-logo--mobile">
              <img
                src={LOGO_SRC}
                alt="Terre Noire Éditions"
                className="brand-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.classList.add('show');
                }}
              />
              <span className="brand-logo-fallback" aria-hidden="true">
                <i className="fas fa-book-open"></i>
              </span>
            </div>
            <span className="mobile-logo-name">Terre Noire Éditions</span>
          </div>
          <button 
            className="mobile-menu-close" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="mobile-menu-content">
          {isAuthenticated && (
            <div className="mobile-user-info">
              <div className="header-avatar header-avatar--mobile">
                <div className="header-avatar-inner">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="" className="header-avatar-img" />
                  ) : (
                    <span className="header-avatar-initials">
                      {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="header-avatar-dot" aria-hidden="true" />
              </div>
              <div className="mobile-user-details">
                <h4>Bonjour, <span className="user-highlight">{user?.first_name || user?.username || 'Utilisateur'}</span></h4>
                <p>{user?.email || ''}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSearch} className="mobile-search-form">
            <div className={`mobile-search-wrapper ${searchFocused ? 'focused' : ''}`}>
              <i className="fas fa-search"></i>
              <input
                ref={searchRef}
                type="text"
                className="mobile-search-input"
                placeholder="Rechercher un livre, auteur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Effacer la recherche"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              <button type="submit" className="mobile-search-btn" aria-label="Rechercher">
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            {searchQuery && (
              <div className="search-hint">
                <i className="fas fa-lightbulb"></i>
                <span>Appuyez sur Entrée pour rechercher</span>
              </div>
            )}
          </form>

          <div className="mobile-nav-section">
            <h4 className="mobile-nav-title">Navigation principale</h4>
            <ul className="mobile-nav-list">
              {navItems.map((item) => (
                <li className="mobile-nav-item" key={item.path}>
                  <Link
                    to={item.path}
                    className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="nav-link-inner">
                      <div className="nav-icon-wrapper">
                        <i className={item.icon}></i>
                      </div>
                      <span>{item.label}</span>
                    </div>
                    {activeItem === item.label && (
                      <div className="active-indicator"></div>
                    )}
                    <i className="fas fa-chevron-right nav-chevron"></i>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mobile-quick-actions">
            <h4 className="quick-actions-title">Actions rapides</h4>
            <div className="quick-actions-grid">
              <Link to="/submit-manuscript" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon submit">
                  <i className="fas fa-file-upload"></i>
                </div>
                <span>Soumettre un manuscrit</span>
              </Link>
              <Link to="/wishlist" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon wishlist">
                  <i className="fas fa-heart"></i>
                  {getWishlistCount() > 0 && (
                    <span className="quick-cart-count">{getWishlistCount()}</span>
                  )}
                </div>
                <span>Liste d&apos;envie</span>
              </Link>
              <Link to="/cart" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon cart">
                  <i className="fas fa-shopping-cart"></i>
                  {getTotalItems() > 0 && (
                    <span className="quick-cart-count">{getTotalItems()}</span>
                  )}
                </div>
                <span>Mon panier</span>
              </Link>
            </div>
          </div>

          <div className="mobile-user-actions">
            {isAuthenticated ? (
              <>
                <div className="user-actions-section">
                  <h4 className="user-actions-title">Mon compte</h4>
                  {isAdmin && (
                    <>
                      <h4 className="mobile-nav-title admin-section-title">Administration</h4>
                      <Link to="/admin-dashboard/books" className="mobile-action-link admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon"><i className="fas fa-book"></i></div>
                        <div className="action-content"><span>Livres</span><small>Catalogue et éditions</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <Link to="/admin-dashboard/authors" className="mobile-action-link admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon"><i className="fas fa-user-pen"></i></div>
                        <div className="action-content"><span>Auteurs</span><small>Gérer les auteurs</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <Link to="/admin-dashboard/orders" className="mobile-action-link admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon"><i className="fas fa-shopping-cart"></i></div>
                        <div className="action-content"><span>Commandes</span><small>Suivi des commandes</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <Link to="/admin-dashboard/manuscripts" className="mobile-action-link admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon"><i className="fas fa-file-lines"></i></div>
                        <div className="action-content"><span>Manuscrits</span><small>Soumissions et suivi</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <Link to="/admin-dashboard/users" className="mobile-action-link admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon"><i className="fas fa-users"></i></div>
                        <div className="action-content"><span>Utilisateurs</span><small>Comptes et rôles</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                    </>
                  )}
                  <Link to="/profile" className="mobile-action-link profile" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon">
                      <i className="fas fa-user-cog"></i>
                    </div>
                    <div className="action-content">
                      <span>Mon profil</span>
                      <small>Gérer vos informations</small>
                    </div>
                    <i className="fas fa-external-link-alt"></i>
                  </Link>
                  <Link to="/orders" className="mobile-action-link orders" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon">
                      <i className="fas fa-box"></i>
                    </div>
                    <div className="action-content">
                      <span>Mes commandes</span>
                      <small>Suivi et historique</small>
                    </div>
                    <i className="fas fa-external-link-alt"></i>
                  </Link>
                  <Link to="/wishlist" className="mobile-action-link wishlist" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon">
                      <i className="fas fa-heart"></i>
                    </div>
                    <div className="action-content">
                      <span>Ma liste d'envies</span>
                      <small>Livres sauvegardés</small>
                    </div>
                    <i className="fas fa-external-link-alt"></i>
                  </Link>
                </div>
                <div className="mobile-divider"></div>
                <button onClick={handleLogout} className="mobile-action-link logout">
                  <div className="action-icon">
                    <i className="fas fa-sign-out-alt"></i>
                  </div>
                  <div className="action-content">
                    <span>Déconnexion</span>
                    <small>Se déconnecter du compte</small>
                  </div>
                  <i className="fas fa-arrow-right-from-bracket"></i>
                </button>
              </>
            ) : (
              <>
                <h4 className="auth-title">Connexion à votre compte</h4>
                <div className="auth-buttons-mobile">
                  <Link to="/login" className="mobile-login-btn" onClick={() => setMobileMenuOpen(false)}>
                    <i className="fas fa-sign-in-alt"></i>
                    <div className="btn-text">
                      <span>Se connecter</span>
                      <small>Accéder à votre compte</small>
                    </div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                  <Link to="/register" className="mobile-register-btn" onClick={() => setMobileMenuOpen(false)}>
                    <i className="fas fa-user-plus"></i>
                    <div className="btn-text">
                      <span>S'inscrire</span>
                      <small>Créer un nouveau compte</small>
                    </div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="mobile-menu-footer">
            <div className="footer-links">
              <Link to="/terms" onClick={() => setMobileMenuOpen(false)}>Conditions</Link>
              <span className="divider">•</span>
              <Link to="/privacy" onClick={() => setMobileMenuOpen(false)}>Confidentialité</Link>
              <span className="divider">•</span>
              <Link to="/cookies" onClick={() => setMobileMenuOpen(false)}>Cookies</Link>
            </div>
            <div className="footer-copyright">
              <i className="far fa-copyright"></i>
              <span>{new Date().getFullYear()} Maison d'Édition</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className={`navbar-modern ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <Link to="/" className="brand-modern" onClick={closeAllMenus} aria-label="Terre Noire Éditions - Accueil">
            <div className="brand-logo">
              <img
                src={LOGO_SRC}
                alt="Terre Noire Éditions"
                className="brand-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.classList.add('show');
                }}
              />
              <span className="brand-logo-fallback" aria-hidden="true">
                <i className="fas fa-book-open"></i>
              </span>
            </div>
            <span className="brand-name brand-name--long">Terre Noire Éditions</span>
            <span className="brand-name brand-name--short" aria-hidden="true">T. Noire</span>
          </Link>

          <div className="header-right-mobile">
            <div className="header-mobile-actions">
              <Link to="/wishlist" className="header-mobile-cart" onClick={closeAllMenus} aria-label="Liste d'envie">
                <i className="far fa-heart"></i>
                {getWishlistCount() > 0 && (
                  <span className="header-mobile-cart-badge">{getWishlistCount()}</span>
                )}
              </Link>
              <Link to="/cart" className="header-mobile-cart" onClick={closeAllMenus} aria-label="Panier">
                <i className="fas fa-shopping-cart"></i>
                {getTotalItems() > 0 && (
                  <span className="header-mobile-cart-badge">{getTotalItems()}</span>
                )}
              </Link>
            </div>
            <button 
              ref={burgerButtonRef}
              className={`mobile-menu-button ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Menu mobile"
            aria-expanded={mobileMenuOpen}
          >
              <span className="toggler-icon"></span>
              <span className="toggler-icon"></span>
              <span className="toggler-icon"></span>
            </button>
          </div>

          <div className="navbar-content">
            <ul className="nav-modern">
              {navItems.map((item) => (
                <li className="nav-item" key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={closeAllMenus}
                    onMouseEnter={() => setActiveItem(item.label)}
                    onMouseLeave={() => {
                      const currentPath = location.pathname;
                      const navItem = navItems.find(item => item.path === currentPath);
                      setActiveItem(navItem?.label || '');
                    }}
                  >
                    <div className="nav-link-inner">
                      <div className="nav-icon">
                        <i className={item.icon}></i>
                      </div>
                      <span className="nav-label">{item.label}</span>
                    </div>
                    {activeItem === item.label && (
                      <div className="nav-highlight"></div>
                    )}
                    {location.pathname === item.path && (
                      <div className="nav-active-indicator"></div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <form onSubmit={handleSearch} className="search-form-modern">
              <div className={`search-wrapper ${searchFocused ? 'focused' : ''}`}>
                <div className="search-icon-wrapper">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher un livre, un auteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  aria-label="Rechercher"
                  ref={searchRef}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Effacer la recherche"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
                <div className="search-divider"></div>
                <button type="submit" className="search-btn" aria-label="Lancer la recherche">
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </form>

            <div className="nav-actions">
              <Link to="/wishlist" className="cart-link wishlist-link" onClick={closeAllMenus} aria-label="Liste d'envie">
                <div className="cart-icon-wrapper">
                  <i className="far fa-heart"></i>
                  {getWishlistCount() > 0 && (
                    <span className="cart-badge">{getWishlistCount()}</span>
                  )}
                </div>
                <span className="cart-text">Liste</span>
              </Link>
              <Link to="/cart" className="cart-link" onClick={closeAllMenus} aria-label={`Panier (${getTotalItems()} article${getTotalItems() > 1 ? 's' : ''})`}>
                <div className="cart-icon-wrapper">
                  <i className="fas fa-shopping-cart"></i>
                  <div className="cart-pulse"></div>
                  {getTotalItems() > 0 && (
                    <span className="cart-badge">{getTotalItems()}</span>
                  )}
                </div>
                <span className="cart-text">Panier</span>
              </Link>

              <button className="mobile-search-trigger" onClick={() => setSearchFocused(true)} aria-label="Ouvrir la recherche">
                <i className="fas fa-search"></i>
              </button>

              {isAuthenticated ? (
                <div className="user-dropdown-container" ref={userDropdownRef}>
                  <button 
                    className="user-trigger account-link"
                    onClick={toggleUserDropdown}
                    aria-expanded={userDropdownOpen}
                    aria-label="Menu compte"
                  >
                    <div className="header-avatar">
                      <div className="header-avatar-inner">
                        {user?.profile_image ? (
                          <img src={user.profile_image} alt="" className="header-avatar-img" />
                        ) : (
                          <span className="header-avatar-initials">
                            {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="header-avatar-dot" title="Connecté" aria-hidden="true" />
                    </div>
                    <span className="account-name">{user?.first_name || 'Mon compte'}</span>
                    <i className={`fas fa-chevron-${userDropdownOpen ? 'up' : 'down'}`}></i>
                  </button>

                  {userDropdownOpen && (
                    <div className="dropdown-menu-modern">
                      <div className="dropdown-header">
                        <div className="user-info">
                          <div className="header-avatar header-avatar--large">
                            <div className="header-avatar-inner">
                              {user?.profile_image ? (
                                <img src={user.profile_image} alt="" className="header-avatar-img" />
                              ) : (
                                <span className="header-avatar-initials">
                                  {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="header-avatar-dot" aria-hidden="true" />
                          </div>
                          <div className="user-details">
                            <strong>{user?.first_name || user?.username || 'Utilisateur'}</strong>
                            <small className="text-muted">{user?.email || ''}</small>
                          </div>
                        </div>
                      </div>
                      <div className="dropdown-divider"></div>
                      {isAdmin && (
                        <>
                          <div className="dropdown-section-label">Administration</div>
                          <Link to="/admin-dashboard/books" className="dropdown-item admin-item" onClick={closeAllMenus}>
                            <div className="dropdown-icon"><i className="fas fa-book"></i></div>
                            <div className="dropdown-content"><span>Livres</span><small>Catalogue et éditions</small></div>
                            <i className="fas fa-chevron-right"></i>
                          </Link>
                          <Link to="/admin-dashboard/authors" className="dropdown-item admin-item" onClick={closeAllMenus}>
                            <div className="dropdown-icon"><i className="fas fa-user-pen"></i></div>
                            <div className="dropdown-content"><span>Auteurs</span><small>Gérer les auteurs</small></div>
                            <i className="fas fa-chevron-right"></i>
                          </Link>
                          <Link to="/admin-dashboard/orders" className="dropdown-item admin-item" onClick={closeAllMenus}>
                            <div className="dropdown-icon"><i className="fas fa-shopping-cart"></i></div>
                            <div className="dropdown-content"><span>Commandes</span><small>Suivi des commandes</small></div>
                            <i className="fas fa-chevron-right"></i>
                          </Link>
                          <Link to="/admin-dashboard/manuscripts" className="dropdown-item admin-item" onClick={closeAllMenus}>
                            <div className="dropdown-icon"><i className="fas fa-file-lines"></i></div>
                            <div className="dropdown-content"><span>Manuscrits</span><small>Soumissions et suivi</small></div>
                            <i className="fas fa-chevron-right"></i>
                          </Link>
                          <Link to="/admin-dashboard/users" className="dropdown-item admin-item" onClick={closeAllMenus}>
                            <div className="dropdown-icon"><i className="fas fa-users"></i></div>
                            <div className="dropdown-content"><span>Utilisateurs</span><small>Comptes et rôles</small></div>
                            <i className="fas fa-chevron-right"></i>
                          </Link>
                          <div className="dropdown-divider"></div>
                        </>
                      )}
                      <Link to="/profile" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon">
                          <i className="fas fa-user-edit"></i>
                        </div>
                        <div className="dropdown-content">
                          <span>Mon profil</span>
                          <small>Gérer vos informations</small>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <Link to="/orders" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon">
                          <i className="fas fa-box"></i>
                        </div>
                        <div className="dropdown-content">
                          <span>Mes commandes</span>
                          <small>Suivi et historique</small>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <Link to="/wishlist" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon">
                          <i className="fas fa-heart"></i>
                        </div>
                        <div className="dropdown-content">
                          <span>Ma liste d'envies</span>
                          <small>Livres sauvegardés</small>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <div className="dropdown-divider"></div>
                      <Link to="/settings" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon">
                          <i className="fas fa-cog"></i>
                        </div>
                        <div className="dropdown-content">
                          <span>Paramètres</span>
                          <small>Préférences du compte</small>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} className="dropdown-item logout-btn">
                        <div className="dropdown-icon">
                          <i className="fas fa-sign-out-alt"></i>
                        </div>
                        <div className="dropdown-content">
                          <span>Déconnexion</span>
                          <small>Se déconnecter du compte</small>
                        </div>
                        <i className="fas fa-arrow-right-from-bracket"></i>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="login-link" onClick={closeAllMenus}>
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Connexion</span>
                  </Link>
                  <Link to="/register" className="btn-register" onClick={closeAllMenus}>
                    <i className="fas fa-user-plus"></i>
                    <span>Inscription</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="scroll-progress">
          <div className="scroll-progress-bar"></div>
        </div>
      </nav>

      {mobileMenuOpen && createPortal(
        <MobileMenuOverlay />,
        document.body
      )}
    </>
  );
};

export default Header;