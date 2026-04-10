import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import orderService from '../services/orderService';
import MyProfiles from './dashboard/MyProfiles';
import MyOrganizations from './dashboard/MyOrganizations';
import MyInvitations from './dashboard/MyInvitations';
import SecuritySettings from './dashboard/SecuritySettings';
import '../styles/Profile.css';
import '../styles/Dashboard.css';
import SEO from '../components/SEO';

const TAB_IDS = [
  { id: 'overview', labelKey: 'pages.profile.tabOverview', fallback: "Vue d'ensemble", icon: 'fas fa-grip' },
  { id: 'info', labelKey: 'pages.profile.tabProfile', fallback: 'Profil', icon: 'fas fa-user' },
  { id: 'orders', labelKey: 'common.myOrders', fallback: 'Commandes', icon: 'fas fa-box' },
  { id: 'roles', labelKey: 'pages.profile.tabRoles', fallback: 'Mes rôles', icon: 'fas fa-id-badge' },
  { id: 'organizations', labelKey: 'pages.profile.tabOrganizations', fallback: 'Organisations', icon: 'fas fa-building' },
  { id: 'invitations', labelKey: 'pages.profile.tabInvitations', fallback: 'Invitations', icon: 'fas fa-envelope-open-text' },
  { id: 'security', labelKey: 'pages.profile.tabSecurity', fallback: 'Sécurité', icon: 'fas fa-shield-halved' },
];

const ROLE_CONFIG = {
  LECTEUR: { labelKey: 'pages.profile.roles.reader', icon: 'fas fa-book-reader', color: '#6366f1' },
  AUTEUR: { labelKey: 'pages.profile.roles.author', icon: 'fas fa-pen-fancy', color: '#8b5cf6' },
  EDITEUR: { labelKey: 'pages.profile.roles.editor', icon: 'fas fa-book-open', color: '#1e3a5f' },
  CORRECTEUR: { labelKey: 'pages.profile.roles.proofreader', icon: 'fas fa-spell-check', color: '#ec4899' },
  ILLUSTRATEUR: { labelKey: 'pages.profile.roles.illustrator', icon: 'fas fa-palette', color: '#f59e0b' },
  TRADUCTEUR: { labelKey: 'pages.profile.roles.translator', icon: 'fas fa-language', color: '#10b981' },
  LIVREUR: { labelKey: 'pages.profile.roles.deliverer', icon: 'fas fa-truck', color: '#3b82f6' },
};

const STATUS_CONFIG = {
  PENDING: { labelKey: 'pages.profile.status.pending', color: '#f59e0b', icon: 'fas fa-clock' },
  PAID: { labelKey: 'pages.profile.status.paid', color: '#10b981', icon: 'fas fa-check' },
  SHIPPED: { labelKey: 'pages.profile.status.shipped', color: '#3b82f6', icon: 'fas fa-shipping-fast' },
  DELIVERED: { labelKey: 'pages.profile.status.delivered', color: '#059669', icon: 'fas fa-box-open' },
  CANCELLED: { labelKey: 'pages.profile.status.cancelled', color: '#ef4444', icon: 'fas fa-times' },
  PARTIAL: { labelKey: 'pages.profile.status.partial', color: '#8b5cf6', icon: 'fas fa-boxes-stacked' },
};

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { getWishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    address: '', city: '', country: '', receive_newsletter: false,
  });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [orderFilter, setOrderFilter] = useState('ALL');

  useEffect(() => {
    if (user) setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      email: user.email || '', phone_number: user.phone_number || '',
      address: user.address || '', city: user.city || '',
      country: user.country || '', receive_newsletter: user.receive_newsletter || false,
    });
  }, [user]);

  useEffect(() => { if (user) loadOrders(); }, [user]);
  useEffect(() => { requestAnimationFrame(() => setHeroReady(true)); }, []);
  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const response = await orderService.getOrders();
      setOrders(response.results || response);
    } catch {
      setOrdersError(t('pages.profile.ordersLoadError'));
    } finally { setLoadingOrders(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
    if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: t('pages.profile.imageTooLarge') }); return; }
    setAvatarLoading(true); setMessage({ type: '', text: '' });
    try {
      const fd = new FormData(); fd.append('profile_image', file);
      const result = await updateProfile(fd);
      setMessage(result.success ? { type: 'success', text: t('pages.profile.photoUpdated') } : { type: 'error', text: typeof result.error === 'string' ? result.error : t('pages.profile.error') });
    } catch { setMessage({ type: 'error', text: t('pages.profile.uploadError') }); }
    finally { setAvatarLoading(false); e.target.value = ''; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({
        first_name: formData.first_name, last_name: formData.last_name,
        phone_number: formData.phone_number, address: formData.address,
        city: formData.city, country: formData.country, receive_newsletter: formData.receive_newsletter,
      });
      if (result.success) { setMessage({ type: 'success', text: t('pages.profile.profileUpdated') }); setIsEditing(false); }
      else setMessage({ type: 'error', text: typeof result.error === 'string' ? result.error : t('pages.profile.error') });
    } catch { setMessage({ type: 'error', text: t('pages.profile.genericError') }); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const formatPrice = useCallback((price) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price) + ' FCFA', []);

  const formatDate = useCallback((ds, opts) =>
    new Date(ds).toLocaleDateString('fr-FR', opts || { day: 'numeric', month: 'long', year: 'numeric' }), []);

  // Computed data
  const totalSpent = useMemo(() => orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0), [orders]);
  const paidOrders = useMemo(() => orders.filter(o => o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED'), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'PENDING'), [orders]);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3), [orders]);
  const filteredOrders = useMemo(() => orderFilter === 'ALL' ? orders : orders.filter(o => o.status === orderFilter), [orders, orderFilter]);
  const totalBooks = useMemo(() => orders.reduce((s, o) => s + (o.items?.reduce((si, it) => si + it.quantity, 0) || 0), 0), [orders]);

  const memberSince = user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || t('pages.profile.defaultUser');
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || (user?.username?.charAt(0) || 'U');

  // Profile completion
  const profileFields = [user?.first_name, user?.last_name, user?.phone_number, user?.address, user?.city, user?.profile_image];
  const completedFields = profileFields.filter(Boolean).length;
  const completionPercent = Math.round((completedFields / profileFields.length) * 100);

  if (!user) return null;

  return (
    <div className="profile-page">
      <SEO title={t('common.myProfile', 'Mon Profil')} />
      {/* ═══════════ HERO ═══════════ */}
      <section className="profile-hero">
        <div className="profile-hero-orb profile-hero-orb--1" />
        <div className="profile-hero-orb profile-hero-orb--2" />
        <div className="profile-hero-grid-bg" />
        <div className={`profile-hero-inner ${heroReady ? 'is-ready' : ''}`}>
          <div className="profile-hero-photo-wrap">
            <div className="profile-hero-avatar-wrap">
              <label className={`profile-hero-avatar profile-hero-avatar--editable ${avatarLoading ? 'is-loading' : ''}`} htmlFor="profile-avatar-input">
                {user.profile_image
                  ? <img src={user.profile_image} alt={displayName} className="profile-hero-avatar-img" />
                  : <span className="profile-hero-avatar-initials">{initials.toUpperCase()}</span>}
                <span className="profile-hero-avatar-overlay">
                  {avatarLoading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-camera" /> {t('pages.profile.changePhoto')}</>}
                </span>
              </label>
              <input id="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp"
                className="profile-hero-avatar-input" onChange={handleAvatarChange} disabled={avatarLoading} />
              <span className="profile-hero-status-dot" title={t('pages.profile.connected')} />
            </div>
          </div>
          <h1 className="profile-hero-title">{displayName}</h1>
          <p className="profile-hero-email">{user.email}</p>
          {memberSince && <p className="profile-hero-since">{t('pages.profile.memberSince', { date: memberSince })}</p>}

          {/* Rôles actifs */}
          {user.profile_types?.length > 0 && (
            <div className="profile-hero-roles">
              {user.profile_types.map(type => {
                const cfg = ROLE_CONFIG[type] || { labelKey: type, icon: 'fas fa-user', color: '#6366f1' };
                return (
                  <span key={type} className="profile-hero-role" style={{ '--role-color': cfg.color }}>
                    <i className={cfg.icon} aria-hidden="true" /> {t(cfg.labelKey)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="profile-hero-fade" />
      </section>

      {/* ═══════════ TABS ═══════════ */}
      <nav className="profile-tabs-nav">
        <div className="profile-tabs-inner" role="tablist">
          {TAB_IDS.map(tab => (
            <button key={tab.id} className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
              role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}>
              <i className={tab.icon} />
              <span>{t(tab.labelKey, tab.fallback)}</span>
              {tab.id === 'orders' && orders.length > 0 && <span className="profile-tab-badge">{orders.length}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══════════ BODY ═══════════ */}
      <section className="profile-body">
        <div className="profile-body-inner">
          {message.text && (
            <div className={`profile-msg profile-msg--${message.type}`}>
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
              {message.text}
            </div>
          )}

          {/* ══════ TAB: VUE D'ENSEMBLE ══════ */}
          {activeTab === 'overview' && (
            <div className="profile-tab-content" role="tabpanel">
              {/* Barre de complétion */}
              {completionPercent < 100 && (
                <div className="ov-completion">
                  <div className="ov-completion__text">
                    <i className="fas fa-user-check" />
                    <div>
                      <strong>{t('pages.profile.completeYourProfile')}</strong>
                      <span>{t('pages.profile.completionStatus', { percent: completionPercent, completed: completedFields, total: profileFields.length })}</span>
                    </div>
                  </div>
                  <div className="ov-completion__bar">
                    <div className="ov-completion__fill" style={{ width: `${completionPercent}%` }} />
                  </div>
                  <button className="ov-completion__btn" onClick={() => { setActiveTab('info'); setIsEditing(true); }}>
                    {t('pages.profile.complete')} <i className="fas fa-arrow-right" />
                  </button>
                </div>
              )}

              {/* KPI */}
              <div className="ov-kpi">
                <div className="ov-kpi__card">
                  <div className="ov-kpi__icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}><i className="fas fa-shopping-bag" /></div>
                  <div className="ov-kpi__body">
                    <span className="ov-kpi__value">{orders.length}</span>
                    <span className="ov-kpi__label">{t('pages.profile.kpiOrders')}</span>
                  </div>
                </div>
                <div className="ov-kpi__card">
                  <div className="ov-kpi__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><i className="fas fa-coins" /></div>
                  <div className="ov-kpi__body">
                    <span className="ov-kpi__value">{formatPrice(totalSpent)}</span>
                    <span className="ov-kpi__label">{t('pages.profile.kpiTotalSpent')}</span>
                  </div>
                </div>
                <div className="ov-kpi__card">
                  <div className="ov-kpi__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><i className="fas fa-book" /></div>
                  <div className="ov-kpi__body">
                    <span className="ov-kpi__value">{totalBooks}</span>
                    <span className="ov-kpi__label">{t('pages.profile.kpiBooksOrdered')}</span>
                  </div>
                </div>
                <div className="ov-kpi__card">
                  <div className="ov-kpi__icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}><i className="fas fa-heart" /></div>
                  <div className="ov-kpi__body">
                    <span className="ov-kpi__value">{getWishlistCount()}</span>
                    <span className="ov-kpi__label">{t('pages.profile.kpiWishlist')}</span>
                  </div>
                </div>
              </div>

              {/* 2 colonnes : Commandes récentes + Accès rapides */}
              <div className="ov-grid">
                {/* Commandes récentes */}
                <div className="ov-card">
                  <div className="ov-card__header">
                    <h3><i className="fas fa-clock-rotate-left" /> {t('pages.profile.recentActivity')}</h3>
                    {orders.length > 3 && (
                      <button className="ov-card__link" onClick={() => setActiveTab('orders')}>
                        {t('pages.profile.viewAll')} <i className="fas fa-arrow-right" />
                      </button>
                    )}
                  </div>
                  <div className="ov-card__body">
                    {recentOrders.length === 0 ? (
                      <div className="ov-empty">
                        <i className="fas fa-box-open" />
                        <p>{t('pages.profile.noOrdersYet')}</p>
                        <button className="btn-primary btn-primary--sm" onClick={() => navigate('/catalog')}>{t('pages.profile.exploreCatalog')}</button>
                      </div>
                    ) : recentOrders.map(order => {
                      const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                      const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                      return (
                        <div key={order.id} className="ov-order">
                          <div className="ov-order__status" style={{ background: st.color }}><i className={st.icon} /></div>
                          <div className="ov-order__info">
                            <strong>{t('pages.profile.orderNumber', { id: order.id })}</strong>
                            <span>{formatDate(order.created_at)} — {t('pages.profile.itemCount', { count: itemCount })}</span>
                          </div>
                          <div className="ov-order__amount">{formatPrice(order.total_amount)}</div>
                          <span className="ov-order__badge" style={{ color: st.color, background: st.color + '15' }}>{t(st.labelKey)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Panneau droite : Résumé + Actions */}
                <div className="ov-side">
                  {/* Résumé compte */}
                  <div className="ov-card ov-card--compact">
                    <div className="ov-card__header"><h3><i className="fas fa-chart-pie" /> {t('pages.profile.summary')}</h3></div>
                    <div className="ov-card__body">
                      <div className="ov-summary-row"><span>{t('pages.profile.pendingOrders')}</span><strong className={pendingOrders.length ? 'ov-status--pending' : ''}>{pendingOrders.length}</strong></div>
                      <div className="ov-summary-row"><span>{t('pages.profile.paidOrders')}</span><strong className="ov-status--ok">{paidOrders.length}</strong></div>
                      <div className="ov-summary-row"><span>{t('pages.profile.activeRoles')}</span><strong>{user.profile_types?.length || 1}</strong></div>
                      <div className="ov-summary-row"><span>{t('pages.profile.twoFactorEnabled')}</span><strong>{user.totp_enabled ? <span className="ov-status--ok">{t('pages.profile.yes')}</span> : <span className="ov-status--warn">{t('pages.profile.no')}</span>}</strong></div>
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="ov-card ov-card--compact">
                    <div className="ov-card__header"><h3><i className="fas fa-bolt" /> {t('pages.profile.quickActions')}</h3></div>
                    <div className="ov-card__body ov-actions">
                      <button className="ov-action" onClick={() => navigate('/catalog')}><i className="fas fa-book-open" /> {t('pages.profile.actionCatalog')}</button>
                      <button className="ov-action" onClick={() => navigate('/submit-manuscript')}><i className="fas fa-pen-nib" /> {t('pages.profile.actionSubmitManuscript')}</button>
                      <button className="ov-action" onClick={() => navigate('/wishlist')}><i className="fas fa-heart" /> {t('pages.profile.actionWishlist')}</button>
                      <button className="ov-action" onClick={() => { setActiveTab('security'); }}><i className="fas fa-shield-halved" /> {t('pages.profile.actionSecurity')}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ TAB: PROFIL (infos perso) ══════ */}
          {activeTab === 'info' && (
            <div className="profile-tab-content" role="tabpanel">
              {!isEditing ? (
                <div className="pcard">
                  <div className="pcard__header">
                    <h2 className="pcard__title">{t('pages.profile.personalInfo', 'Informations personnelles')}</h2>
                    <button type="button" className="pcard__edit-btn" onClick={() => setIsEditing(true)}><i className="fas fa-pen" /> {t('pages.profile.edit')}</button>
                  </div>
                  <div className="pcard__section">
                    <div className="pcard__section-label"><i className="fas fa-user" /> {t('pages.profile.identity')}</div>
                    <div className="pcard__fields">
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.firstName')}</span><span className="pcard__field-value">{user.first_name || '—'}</span></div>
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.lastName')}</span><span className="pcard__field-value">{user.last_name || '—'}</span></div>
                      {user.username && <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.username')}</span><span className="pcard__field-value">@{user.username}</span></div>}
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.email')}</span><span className="pcard__field-value pcard__field-value--email">{user.email}</span></div>
                    </div>
                  </div>
                  <div className="pcard__section">
                    <div className="pcard__section-label"><i className="fas fa-phone-alt" /> {t('pages.profile.contact')}</div>
                    <div className="pcard__fields">
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.phone')}</span><span className={`pcard__field-value ${!user.phone_number ? 'pcard__field-value--empty' : ''}`}>{user.phone_number || t('pages.profile.notProvided')}</span></div>
                    </div>
                  </div>
                  <div className="pcard__section">
                    <div className="pcard__section-label"><i className="fas fa-map-marker-alt" /> {t('pages.profile.shippingAddress')}</div>
                    <div className="pcard__fields">
                      <div className="pcard__field pcard__field--wide"><span className="pcard__field-label">{t('pages.profile.address')}</span><span className={`pcard__field-value ${!user.address ? 'pcard__field-value--empty' : ''}`}>{user.address || t('pages.profile.notProvidedFem')}</span></div>
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.city')}</span><span className={`pcard__field-value ${!user.city ? 'pcard__field-value--empty' : ''}`}>{user.city || '—'}</span></div>
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.country')}</span><span className={`pcard__field-value ${!user.country ? 'pcard__field-value--empty' : ''}`}>{user.country || '—'}</span></div>
                    </div>
                  </div>
                  <div className="pcard__section pcard__section--last">
                    <div className="pcard__section-label"><i className="fas fa-sliders-h" /> {t('pages.profile.preferences')}</div>
                    <div className="pcard__fields">
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.newsletter')}</span><span className="pcard__field-value">{user.receive_newsletter ? <span className="pcard__badge pcard__badge--on"><i className="fas fa-check-circle" /> {t('pages.profile.subscribed')}</span> : <span className="pcard__badge pcard__badge--off"><i className="fas fa-times-circle" /> {t('pages.profile.notSubscribed')}</span>}</span></div>
                      <div className="pcard__field"><span className="pcard__field-label">{t('pages.profile.memberSinceLabel')}</span><span className="pcard__field-value">{user.date_joined ? formatDate(user.date_joined) : '—'}</span></div>
                    </div>
                  </div>
                  <div className="pcard__footer">
                    <button type="button" className="btn-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt" /> {t('pages.profile.logout', 'Se déconnecter')}</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="profile-form">
                  <div className="profile-form__header"><h2>{t('pages.profile.editInfo', 'Modifier mes informations')}</h2><button type="button" className="pcard__edit-btn" onClick={() => setIsEditing(false)}><i className="fas fa-times" /> {t('pages.profile.cancel')}</button></div>
                  <div className="form-grid">
                    <div className="form-group"><label htmlFor="first_name">{t('pages.profile.firstName')} *</label><input type="text" id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} required /></div>
                    <div className="form-group"><label htmlFor="last_name">{t('pages.profile.lastName')} *</label><input type="text" id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} required /></div>
                    <div className="form-group"><label htmlFor="email">{t('pages.profile.email')} *</label><input type="email" id="email" name="email" value={formData.email} disabled className="disabled-input" /><small className="form-hint">{t('pages.profile.emailCannotBeChanged')}</small></div>
                    <div className="form-group"><label htmlFor="phone_number">{t('pages.profile.phone')}</label><input type="tel" id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder={t('pages.profile.phonePlaceholder')} /></div>
                    <div className="form-group full-width"><label htmlFor="address">{t('pages.profile.address')}</label><input type="text" id="address" name="address" value={formData.address} onChange={handleChange} placeholder={t('pages.profile.addressPlaceholder')} /></div>
                    <div className="form-group"><label htmlFor="city">{t('pages.profile.city')}</label><input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder={t('pages.profile.cityPlaceholder')} /></div>
                    <div className="form-group"><label htmlFor="country">{t('pages.profile.country')}</label><input type="text" id="country" name="country" value={formData.country} onChange={handleChange} placeholder={t('pages.profile.countryPlaceholder')} /></div>
                  </div>
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label"><input type="checkbox" name="receive_newsletter" checked={formData.receive_newsletter} onChange={handleChange} /><span className="checkbox-custom" />{t('pages.profile.receiveNewsletter')}</label>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? t('pages.profile.saving', 'Enregistrement...') : t('pages.profile.saveChanges', 'Enregistrer les modifications')}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ══════ TAB: COMMANDES ══════ */}
          {activeTab === 'orders' && (
            <div className="profile-tab-content" role="tabpanel">
              {/* Filtres */}
              <div className="orders-filters">
                {[{ key: 'ALL', labelKey: 'pages.profile.status.all', count: orders.length }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, labelKey: v.labelKey, count: orders.filter(o => o.status === k).length }))].filter(f => f.count > 0 || f.key === 'ALL').map(f => (
                  <button key={f.key} className={`orders-filter ${orderFilter === f.key ? 'active' : ''}`} onClick={() => setOrderFilter(f.key)}>
                    {t(f.labelKey)} <span className="orders-filter__count">{f.count}</span>
                  </button>
                ))}
              </div>

              {ordersError && (
                <div className="profile-orders-error">
                  <i className="fas fa-exclamation-circle" aria-hidden="true" /> {ordersError}
                </div>
              )}
              {loadingOrders ? (
                <div className="loading-container"><i className="fas fa-spinner fa-spin" aria-hidden="true" /><p>{t('common.loading')}</p></div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-orders"><i className="fas fa-box-open" aria-hidden="true" /><h3>{t('pages.profile.noOrders')}</h3><p>{orderFilter !== 'ALL' ? t('pages.profile.noOrdersFiltered') : t('pages.profile.noOrdersYet')}</p>
                  {orderFilter === 'ALL' && <button className="btn-primary" onClick={() => navigate('/catalog')}>{t('pages.wishlist.exploreCatalog')}</button>}
                </div>
              ) : (
                <div className="orders-list">
                  {filteredOrders.map(order => {
                    const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                    return (
                      <div key={order.id} className="order-card">
                        <div className="order-header">
                          <div className="order-meta">
                            <span className="order-id">#{order.id}</span>
                            <span className="order-date">{formatDate(order.created_at)}</span>
                          </div>
                          <span className="order-status" style={{ color: st.color, background: st.color + '12', borderColor: st.color + '30' }}>
                            <i className={st.icon} aria-hidden="true" /> {t(st.labelKey)}
                          </span>
                        </div>
                        <div className="order-items">
                          {order.items.map(item => (
                            <div key={item.id} className="order-item">
                              <img src={item.book.cover_image || '/images/default-book-cover.svg'} alt={item.book.title} loading="lazy" />
                              <div className="item-details">
                                <h5>{item.book.title}</h5>
                                <p>{item.book.author?.full_name}</p>
                              </div>
                              <div className="item-meta">
                                <span className="item-qty">x{item.quantity}</span>
                                <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="order-footer">
                          <div className="order-shipping">
                            <i className="fas fa-map-marker-alt" /> {order.shipping_city}
                          </div>
                          <div className="order-total">{formatPrice(order.total_amount)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && <div className="profile-tab-content profile-tab-content--embedded" role="tabpanel"><MyProfiles /></div>}
          {activeTab === 'organizations' && <div className="profile-tab-content profile-tab-content--embedded" role="tabpanel"><MyOrganizations /></div>}
          {activeTab === 'invitations' && <div className="profile-tab-content profile-tab-content--embedded" role="tabpanel"><MyInvitations /></div>}
          {activeTab === 'security' && <div className="profile-tab-content profile-tab-content--embedded" role="tabpanel"><SecuritySettings /></div>}
        </div>
      </section>
    </div>
  );
};

export default Profile;
