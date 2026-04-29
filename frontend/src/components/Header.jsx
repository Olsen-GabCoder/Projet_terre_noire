import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import NotificationCenter from './NotificationCenter';
import BrandLogo from './BrandLogo';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import CurrencyToggle from './CurrencyToggle';
import '../styles/Header.css';
import '../styles/HeaderFooterOverride.css';

const Header = () => {
  const { t, i18n } = useTranslation();
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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('frollot-theme') || 'auto';
    }
    return 'auto';
  });

  const mobileMenuRef = useRef(null);
  const burgerButtonRef = useRef(null);
  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);

  const progressBarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (progressBarRef.current) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBarRef.current.style.width = `${progress}%`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') {
      // Mode auto : détecter prefers-color-scheme et écouter les changements
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      localStorage.removeItem('frollot-theme');
      const onChange = (e) => root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('frollot-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    const currentPath = location.pathname;
    const allPaths = [
      { path: '/', label: t('nav.home') },
      { path: '/catalog', label: t('nav.catalog') },
      { path: '/authors', label: t('nav.authors') },
      { path: '/feed', label: t('nav.feed') },
      { path: '/clubs', label: t('nav.clubs') },
      { path: '/services', label: t('nav.services') },
      { path: '/about', label: t('nav.about') },
      { path: '/contact', label: t('nav.contact') },
    ];

    const active = allPaths.find(item => item.path === currentPath);
    if (active) {
      setActiveItem(active.label);
    }
  }, [location.pathname]);

  const { listening, supported: speechSupported, startListening, stopListening } = useSpeechRecognition({
    lang: i18n.language === 'en' ? 'en-US' : 'fr-FR',
    onResult: (text) => {
      setSearchQuery(text);
      navigate(`/search?q=${encodeURIComponent(text)}`);
      setMobileMenuOpen(false);
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
      setSearchFocused(false);
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

  const cycleTheme = () => {
    setTheme(prev => prev === 'auto' ? 'dark' : prev === 'dark' ? 'light' : 'auto');
  };

  const themeIcon = theme === 'dark' ? 'fas fa-moon' : theme === 'light' ? 'fas fa-sun' : 'fas fa-circle-half-stroke';
  const themeLabel = theme === 'dark' ? t('header.themeDark') : theme === 'light' ? t('header.themeLight') : t('header.themeAuto');

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    { path: '/', label: t('nav.home'), icon: 'fas fa-home' },
    { path: '/catalog', label: t('nav.catalog'), icon: 'fas fa-book' },
    { path: '/authors', label: t('nav.authors'), icon: 'fas fa-user-pen' },
    ...(isAuthenticated ? [
      { path: '/feed', label: t('nav.feed'), icon: 'fas fa-rss' },
      { path: '/clubs', label: t('nav.clubs'), icon: 'fas fa-users' },
    ] : [
      { path: '/clubs', label: t('nav.clubs'), icon: 'fas fa-users' },
    ]),
    { path: '/services', label: t('nav.services'), icon: 'fas fa-briefcase' },
    { path: '/about', label: t('nav.about'), icon: 'fas fa-info-circle' },
    { path: '/contact', label: t('nav.contact'), icon: 'fas fa-envelope' },
  ];




  const renderMobileMenuOverlay = () => (
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
            <BrandLogo size="lg" />
          </div>
          <button 
            className="mobile-menu-close" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t('header.menuClose')}
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
                <h4>{t('header.greeting', { name: '' })}<span className="user-highlight">{user?.first_name || user?.username || t('common.user')}</span></h4>
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
                placeholder={t('header.searchPlaceholderMobile')}
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
                  aria-label={t('header.clearSearch')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              {speechSupported && (
                <button
                  type="button"
                  className={`mobile-search-mic ${listening ? 'mobile-search-mic--active' : ''}`}
                  onClick={listening ? stopListening : startListening}
                  aria-label={listening ? 'Arrêter' : 'Recherche vocale'}
                >
                  <i className={`fas fa-${listening ? 'stop-circle' : 'microphone'}`} />
                </button>
              )}
              <button type="submit" className="mobile-search-btn" aria-label={t('common.search')}>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            {searchQuery && (
              <div className="search-hint">
                <i className="fas fa-lightbulb"></i>
                <span>{t('header.searchHint')}</span>
              </div>
            )}
          </form>

          <div className="mobile-nav-section">
            <h4 className="mobile-nav-title">{t('header.mainNav')}</h4>
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
            <h4 className="quick-actions-title">{t('header.quickActions')}</h4>
            <div className="quick-actions-grid">
              <button className="quick-action" onClick={cycleTheme}>
                <div className="quick-action-icon theme">
                  <i className={themeIcon}></i>
                </div>
                <span>{themeLabel}</span>
              </button>
              <button className="quick-action" onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}>
                <div className="quick-action-icon lang">
                  <i className="fas fa-globe"></i>
                </div>
                <span>{i18n.language === 'fr' ? 'English' : 'Français'}</span>
              </button>
              <Link to="/submit-manuscript" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon submit">
                  <i className="fas fa-file-upload"></i>
                </div>
                <span>{t('header.submitManuscript')}</span>
              </Link>
              <Link to="/wishlist" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon wishlist">
                  <i className="fas fa-heart"></i>
                  {getWishlistCount() > 0 && (
                    <span className="quick-cart-count">{getWishlistCount()}</span>
                  )}
                </div>
                <span>{t('header.wishlist')}</span>
              </Link>
              <Link to="/cart" className="quick-action" onClick={() => setMobileMenuOpen(false)}>
                <div className="quick-action-icon cart">
                  <i className="fas fa-shopping-cart"></i>
                  {getTotalItems() > 0 && (
                    <span className="quick-cart-count">{getTotalItems()}</span>
                  )}
                </div>
                <span>{t('header.myCart')}</span>
              </Link>
            </div>
          </div>

          <div className="mobile-user-actions">
            {isAuthenticated ? (
              <>
                <div className="user-actions-section">
                  {isAdmin && (
                    <>
                      <Link to="/admin-dashboard" className="mobile-action-link mobile-action-link--admin" onClick={() => setMobileMenuOpen(false)}>
                        <div className="action-icon action-icon--admin"><i className="fas fa-shield-halved"></i></div>
                        <div className="action-content"><span>{t('header.administration')}</span><small>{t('header.adminSubtitle')}</small></div>
                        <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <div className="mobile-divider"></div>
                    </>
                  )}
                  <h4 className="user-actions-title">{t('footer.accountTitle')}</h4>
                  <Link to="/dashboard" className="mobile-action-link" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon"><i className="fas fa-tachometer-alt"></i></div>
                    <div className="action-content"><span>{t('header.dashboard', 'Mon tableau de bord')}</span><small>{t('header.dashboardSubtitle', 'Vue d\'ensemble de vos activités')}</small></div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                  <Link to="/dashboard/orders" className="mobile-action-link" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon"><i className="fas fa-box"></i></div>
                    <div className="action-content"><span>{t('common.myOrders')}</span><small>{t('header.ordersSubtitle')}</small></div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                  <Link to="/dashboard/settings" className="mobile-action-link" onClick={() => setMobileMenuOpen(false)}>
                    <div className="action-icon"><i className="fas fa-cog"></i></div>
                    <div className="action-content"><span>{t('common.settings')}</span><small>{t('header.settingsSubtitle')}</small></div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                </div>
                <div className="mobile-divider"></div>
                <button onClick={handleLogout} className="mobile-action-link logout">
                  <div className="action-icon"><i className="fas fa-sign-out-alt"></i></div>
                  <div className="action-content"><span>{t('common.logout')}</span></div>
                  <i className="fas fa-arrow-right-from-bracket"></i>
                </button>
              </>
            ) : (
              <>
                <h4 className="auth-title">{t('header.authTitle')}</h4>
                <div className="auth-buttons-mobile">
                  <Link to="/login" className="mobile-login-btn" onClick={() => setMobileMenuOpen(false)}>
                    <i className="fas fa-sign-in-alt"></i>
                    <div className="btn-text">
                      <span>{t('header.loginBtn')}</span>
                      <small>{t('header.loginSubtitle')}</small>
                    </div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                  <Link to="/register" className="mobile-register-btn" onClick={() => setMobileMenuOpen(false)}>
                    <i className="fas fa-user-plus"></i>
                    <div className="btn-text">
                      <span>{t('header.registerBtn')}</span>
                      <small>{t('header.registerSubtitle')}</small>
                    </div>
                    <i className="fas fa-chevron-right"></i>
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="mobile-menu-footer">
            <div className="footer-links">
              <Link to="/terms" onClick={() => setMobileMenuOpen(false)}>{t('header.terms')}</Link>
              <span className="divider">•</span>
              <Link to="/privacy" onClick={() => setMobileMenuOpen(false)}>{t('header.privacy')}</Link>
              <span className="divider">•</span>
              <Link to="/cookies" onClick={() => setMobileMenuOpen(false)}>{t('header.cookies')}</Link>
            </div>
            <div className="footer-copyright">
              <i className="far fa-copyright"></i>
              <span>{new Date().getFullYear()} Frollot</span>
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
          <Link to="/" className="brand-modern" onClick={closeAllMenus} aria-label={`${t('common.frollot')} - ${t('nav.home')}`}>
            <BrandLogo />
          </Link>

          <div className="header-right-mobile">
            <div className="header-mobile-actions">
              <Link to="/wishlist" className="header-mobile-cart" onClick={closeAllMenus} aria-label={t('header.wishlist')}>
                <i className="far fa-heart"></i>
                {getWishlistCount() > 0 && (
                  <span className="header-mobile-cart-badge">{getWishlistCount()}</span>
                )}
              </Link>
              <Link to="/cart" className="header-mobile-cart" onClick={closeAllMenus} aria-label={t('header.myCart')}>
                <i className="fas fa-shopping-cart"></i>
                {getTotalItems() > 0 && (
                  <span className="header-mobile-cart-badge">{getTotalItems()}</span>
                )}
              </Link>
              {isAuthenticated && <NotificationCenter mobile />}
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
                  >
                    <span className="nav-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="nav-actions">
              <form onSubmit={handleSearch} className={`search-expand ${searchFocused ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="search-expand__trigger"
                  onClick={() => { setSearchFocused(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                  aria-label={t('common.search')}
                >
                  <i className="fas fa-search"></i>
                </button>
                <div className="search-expand__field">
                  <input
                    type="text"
                    className="search-expand__input"
                    placeholder={t('header.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
                    aria-label={t('common.search')}
                    ref={searchRef}
                  />
                  {searchQuery && (
                    <button type="button" className="search-expand__clear" onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }} aria-label={t('common.close')}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                  {speechSupported && (
                    <button
                      type="button"
                      className={`search-expand__mic ${listening ? 'search-expand__mic--active' : ''}`}
                      onClick={listening ? stopListening : startListening}
                      aria-label={listening ? 'Arrêter' : 'Recherche vocale'}
                    >
                      <i className={`fas fa-${listening ? 'stop-circle' : 'microphone'}`} />
                    </button>
                  )}
                  <button type="submit" className="search-expand__submit" aria-label={t('common.search')}>
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </form>

              <CurrencyToggle />
              <button className="theme-toggle" onClick={cycleTheme} aria-label={t('header.themeLabel', { theme: themeLabel })} title={t('header.themeLabel', { theme: themeLabel })}>
                <i className={themeIcon}></i>
              </button>
              <button
                className="lang-toggle"
                onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
                aria-label={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
                title={i18n.language === 'fr' ? 'English' : 'Français'}
              >
                <span className="lang-toggle__flag">{i18n.language === 'fr' ? 'FR' : 'EN'}</span>
              </button>
              <Link to="/wishlist" className="cart-link wishlist-link" onClick={closeAllMenus} aria-label={t('header.wishlist')}>
                <div className="cart-icon-wrapper">
                  <i className="far fa-heart"></i>
                  {getWishlistCount() > 0 && (
                    <span className="cart-badge">{getWishlistCount()}</span>
                  )}
                </div>
                <span className="cart-text sr-only">Liste</span>
              </Link>
              <Link to="/cart" className="cart-link" onClick={closeAllMenus} aria-label={t('header.cartLabel', { count: getTotalItems(), plural: getTotalItems() > 1 ? 's' : '' })}>
                <div className="cart-icon-wrapper">
                  <i className="fas fa-shopping-cart"></i>
                  <div className="cart-pulse"></div>
                  {getTotalItems() > 0 && (
                    <span className="cart-badge">{getTotalItems()}</span>
                  )}
                </div>
                <span className="cart-text sr-only">Panier</span>
              </Link>

              <button className="mobile-search-trigger" onClick={() => setSearchFocused(true)} aria-label={t('header.openSearch')}>
                <i className="fas fa-search"></i>
              </button>

              {isAuthenticated && <NotificationCenter />}

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
                            <strong>{user?.first_name || user?.username || t('common.user')}</strong>
                            <small className="text-muted">{user?.email || ''}</small>
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <Link to="/admin-dashboard" className="dropdown-item dropdown-item--admin" onClick={closeAllMenus}>
                          <div className="dropdown-icon dropdown-icon--admin"><i className="fas fa-shield-halved"></i></div>
                          <div className="dropdown-content"><span>{t('header.administration')}</span><small>{t('header.adminSubtitle')}</small></div>
                          <i className="fas fa-external-link-alt"></i>
                        </Link>
                      )}

                      <div className="dropdown-divider"></div>

                      <Link to="/dashboard" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon"><i className="fas fa-tachometer-alt"></i></div>
                        <div className="dropdown-content"><span>{t('header.dashboard', 'Mon tableau de bord')}</span><small>{t('header.dashboardSubtitle', 'Vue d\'ensemble de vos activités')}</small></div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <Link to="/dashboard/orders" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon"><i className="fas fa-box"></i></div>
                        <div className="dropdown-content"><span>{t('common.myOrders')}</span><small>{t('header.ordersSubtitle')}</small></div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <Link to="/notifications" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon"><i className="fas fa-bell"></i></div>
                        <div className="dropdown-content"><span>{t('notifications.title', 'Notifications')}</span><small>{t('notifications.subtitle', 'Vos alertes et mises à jour')}</small></div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>
                      <Link to="/dashboard/settings" className="dropdown-item" onClick={closeAllMenus}>
                        <div className="dropdown-icon"><i className="fas fa-cog"></i></div>
                        <div className="dropdown-content"><span>{t('common.settings')}</span><small>{t('header.settingsSubtitle')}</small></div>
                        <i className="fas fa-chevron-right"></i>
                      </Link>

                      <div className="dropdown-divider"></div>

                      <button onClick={handleLogout} className="dropdown-item logout-btn">
                        <div className="dropdown-icon"><i className="fas fa-sign-out-alt"></i></div>
                        <div className="dropdown-content"><span>{t('common.logout')}</span></div>
                        <i className="fas fa-arrow-right-from-bracket"></i>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="login-link" onClick={closeAllMenus}>
                    <i className="fas fa-sign-in-alt"></i>
                    <span>{t('common.login')}</span>
                  </Link>
                  <Link to="/register" className="btn-register" onClick={closeAllMenus}>
                    <i className="fas fa-user-plus"></i>
                    <span>{t('common.register')}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="scroll-progress">
          <div className="scroll-progress-bar" ref={progressBarRef}></div>
        </div>
      </nav>

      {mobileMenuOpen && createPortal(
        renderMobileMenuOverlay(),
        document.body
      )}
    </>
  );
};

export default Header;