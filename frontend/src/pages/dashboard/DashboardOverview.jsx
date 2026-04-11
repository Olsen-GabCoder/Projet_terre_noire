import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../../styles/DashboardOverview.css';

/* ── Helpers ── */
const today = () =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const DashboardOverview = () => {
  const { t } = useTranslation();
  const { user, organizationMemberships } = useAuth();
  const [counts, setCounts] = useState({});
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.first_name || user?.username || '';
  const isAuthor = user?.profile_types?.includes('AUTEUR');
  const isPublisher = organizationMemberships.some(
    (m) => m.organization_type === 'MAISON_EDITION'
      && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'EDITEUR'].includes(m.role)
  );

  /* ── Fetch data ── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = {};
      const pendingActions = [];

      // Parallel lightweight fetches
      const [countsRes, quotesRes, invitationsRes, manuscriptsRes, wishlistRes, ordersRes, clubsRes] =
        await Promise.allSettled([
          api.get('/users/dashboard-counts/'),
          api.get('/services/quotes/', { params: { role: 'client' } }),
          api.get('/organizations/invitations/mine/'),
          api.get('/manuscripts/mine/'),
          api.get('/wishlist/'),
          api.get('/orders/'),
          api.get('/social/clubs/', { params: { joined: true } }),
        ]);

      if (cancelled) return;

      // Dashboard counts
      if (countsRes.status === 'fulfilled') Object.assign(data, countsRes.value.data);

      // Quotes pending (SENT, client side)
      if (quotesRes.status === 'fulfilled') {
        const quotes = Array.isArray(quotesRes.value.data) ? quotesRes.value.data : quotesRes.value.data?.results || [];
        const pendingQuotes = quotes.filter(q => q.status === 'SENT');
        data.pending_quotes = pendingQuotes.length;
        data.total_quotes = quotes.length;
        if (pendingQuotes.length > 0) {
          pendingActions.push({
            id: 'quotes',
            icon: 'fas fa-file-invoice',
            color: '#ef4444',
            title: pendingQuotes.length === 1
              ? t('dashboard.ov.quoteAction', 'Un devis attend votre réponse')
              : t('dashboard.ov.quotesAction', '{{count}} devis attendent votre réponse', { count: pendingQuotes.length }),
            link: '/dashboard/my-quotes',
          });
        }
      }

      // Invitations
      if (invitationsRes.status === 'fulfilled') {
        const invitations = Array.isArray(invitationsRes.value.data)
          ? invitationsRes.value.data
          : invitationsRes.value.data?.results || [];
        const pending = invitations.filter(i => i.status === 'PENDING');
        data.pending_invitations = pending.length;
        if (pending.length > 0) {
          pendingActions.push({
            id: 'invitations',
            icon: 'fas fa-envelope-open-text',
            color: '#8b5cf6',
            title: pending.length === 1
              ? t('dashboard.ov.invitationAction', 'Une invitation vous attend')
              : t('dashboard.ov.invitationsAction', '{{count}} invitations vous attendent', { count: pending.length }),
            link: '/dashboard/invitations',
          });
        }
      }

      // Manuscripts needing attention
      if (manuscriptsRes.status === 'fulfilled') {
        const manuscripts = Array.isArray(manuscriptsRes.value.data)
          ? manuscriptsRes.value.data
          : manuscriptsRes.value.data?.results || [];
        data.total_manuscripts = manuscripts.length;
        const attentionStatuses = ['QUOTE_SENT', 'COUNTER_PROPOSAL', 'ACCEPTED', 'REJECTED'];
        const needsAttention = manuscripts.filter(m => attentionStatuses.includes(m.status));
        if (needsAttention.length > 0) {
          pendingActions.push({
            id: 'manuscripts',
            icon: 'fas fa-file-alt',
            color: '#f59e0b',
            title: needsAttention.length === 1
              ? t('dashboard.ov.manuscriptAction', 'Un manuscrit nécessite votre attention')
              : t('dashboard.ov.manuscriptsAction', '{{count}} manuscrits nécessitent votre attention', { count: needsAttention.length }),
            link: '/dashboard/my-manuscripts',
          });
        }
      }

      // Wishlist count
      if (wishlistRes.status === 'fulfilled') {
        const wl = Array.isArray(wishlistRes.value.data)
          ? wishlistRes.value.data
          : wishlistRes.value.data?.results || [];
        data.wishlist_count = wl.length;
      }

      // Orders
      if (ordersRes.status === 'fulfilled') {
        const orders = Array.isArray(ordersRes.value.data)
          ? ordersRes.value.data
          : ordersRes.value.data?.results || [];
        data.total_orders = orders.length;
        data.pending_orders = orders.filter(o => o.status === 'PENDING').length;
      }

      // Clubs
      if (clubsRes.status === 'fulfilled') {
        const clubs = Array.isArray(clubsRes.value.data)
          ? clubsRes.value.data
          : clubsRes.value.data?.results || [];
        data.clubs_count = clubs.length;
      }

      // Profile incomplete
      const missingProfile = !user.profile_image || !user.first_name || !user.address;
      if (missingProfile) {
        pendingActions.push({
          id: 'profile',
          icon: 'fas fa-user-edit',
          color: '#3b82f6',
          title: t('dashboard.ov.profileAction', 'Complétez votre profil pour une meilleure expérience'),
          link: '/dashboard/settings',
        });
      }

      if (!cancelled) {
        setCounts(data);
        setActions(pendingActions);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, t]);

  /* ── KPIs ── */
  const kpis = useMemo(() => [
    {
      icon: 'fas fa-box', color: '#6366f1', label: t('dashboard.ov.orders', 'Commandes'),
      value: counts.total_orders ?? 0,
      sub: counts.pending_orders ? `${counts.pending_orders} ${t('dashboard.ov.inProgress', 'en cours')}` : null,
      link: '/dashboard/orders',
    },
    {
      icon: 'fas fa-heart', color: '#ec4899', label: t('dashboard.ov.wishlist', 'Liste de souhaits'),
      value: counts.wishlist_count ?? 0, link: '/dashboard/wishlist',
    },
    {
      icon: 'fas fa-file-alt', color: '#f59e0b', label: t('dashboard.ov.submissions', 'Soumissions'),
      value: counts.total_manuscripts ?? counts.manuscripts ?? 0, link: '/dashboard/my-manuscripts',
    },
    {
      icon: 'fas fa-file-invoice', color: '#10b981', label: t('dashboard.ov.quotes', 'Devis reçus'),
      value: counts.total_quotes ?? 0, link: '/dashboard/my-quotes',
    },
    {
      icon: 'fas fa-book-reader', color: '#3b82f6', label: t('dashboard.ov.loans', 'Prêts actifs'),
      value: counts.active_loans ?? 0, link: '/dashboard/my-loans',
    },
    {
      icon: 'fas fa-users', color: '#8b5cf6', label: t('dashboard.ov.clubs', 'Clubs'),
      value: counts.clubs_count ?? 0, link: '/dashboard/clubs',
    },
  ], [counts, t]);

  /* ── Shortcuts ── */
  const shortcuts = useMemo(() => {
    const list = [];

    if (isPublisher) {
      const pubOrg = organizationMemberships.find(
        (m) => m.organization_type === 'MAISON_EDITION' && ['PROPRIETAIRE', 'ADMINISTRATEUR', 'EDITEUR'].includes(m.role)
      );
      list.push(
        { icon: 'fas fa-inbox', label: t('dashboard.ov.seeManuscripts', 'Manuscrits reçus'), to: `/dashboard/organizations/${pubOrg?.organization_id}/manuscripts` },
        { icon: 'fas fa-project-diagram', label: t('dashboard.ov.createProject', 'Créer un projet éditorial'), to: `/dashboard/organizations/${pubOrg?.organization_id}/projects` },
        { icon: 'fas fa-book', label: t('dashboard.ov.manageBooks', 'Gérer mes livres'), to: `/dashboard/organizations/${pubOrg?.organization_id}/books` },
      );
    } else if (isAuthor) {
      list.push(
        { icon: 'fas fa-pen-fancy', label: t('dashboard.ov.submitManuscript', 'Soumettre un manuscrit'), to: '/submit-manuscript' },
        { icon: 'fas fa-book', label: t('dashboard.ov.myBooks', 'Voir mes livres'), to: '/dashboard/author/books' },
        { icon: 'fas fa-id-card', label: t('dashboard.ov.authorProfile', 'Mon profil auteur'), to: '/dashboard/author/profile' },
      );
    } else {
      list.push(
        { icon: 'fas fa-compass', label: t('dashboard.ov.exploreCatalog', 'Découvrir le catalogue'), to: '/catalog' },
        { icon: 'fas fa-users', label: t('dashboard.ov.joinClub', 'Rejoindre un club'), to: '/clubs' },
        { icon: 'fas fa-pen-fancy', label: t('dashboard.ov.submitManuscript', 'Soumettre un manuscrit'), to: '/submit-manuscript' },
      );
    }

    // Always show role activation for users without specialized roles
    if (!isAuthor && !isPublisher && !user?.profile_types?.some(pt => ['CORRECTEUR', 'ILLUSTRATEUR', 'TRADUCTEUR', 'LIVREUR'].includes(pt))) {
      list.push(
        { icon: 'fas fa-star', label: t('dashboard.ov.activateRoles', 'Devenir auteur, éditeur ou prestataire'), to: '/dashboard/settings', accent: true },
      );
    }

    return list;
  }, [isAuthor, isPublisher, organizationMemberships, user, t]);

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="dov">
        <div className="dov__header">
          <div className="dov__skeleton dov__skeleton--title" />
          <div className="dov__skeleton dov__skeleton--date" />
        </div>
        <div className="dov__skeleton dov__skeleton--banner" />
        <div className="dov__kpis">
          {[...Array(6)].map((_, i) => <div key={i} className="dov__skeleton dov__skeleton--kpi" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dov">
      {/* ═══ Zone 1 — En-tête ═══ */}
      <div className="dov__header">
        <h1 className="dov__greeting">
          {t('dashboard.ov.greeting', 'Bonjour {{name}}', { name: displayName })}
        </h1>
        <p className="dov__date">{today()}</p>
      </div>

      {/* ═══ Zone 2 — Actions requises ═══ */}
      <div className="dov__actions">
        <h2 className="dov__section-title">
          <i className="fas fa-bell" /> {t('dashboard.ov.actionsTitle', 'Actions requises')}
        </h2>
        {actions.length === 0 ? (
          <div className="dov__actions-empty">
            <i className="fas fa-check-circle" />
            <p>{t('dashboard.ov.noActions', "Tout est à jour, vous n'avez rien à traiter pour le moment.")}</p>
          </div>
        ) : (
          <div className="dov__actions-list">
            {actions.map((action) => (
              <Link key={action.id} to={action.link} className="dov__action-card">
                <span className="dov__action-dot" style={{ background: action.color }} />
                <i className={action.icon} style={{ color: action.color }} />
                <span className="dov__action-text">{action.title}</span>
                <i className="fas fa-chevron-right dov__action-arrow" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Zone 3 — KPIs ═══ */}
      <div className="dov__section">
        <h2 className="dov__section-title">
          <i className="fas fa-chart-bar" /> {t('dashboard.ov.kpisTitle', 'Mes chiffres')}
        </h2>
        <div className="dov__kpis">
          {kpis.map((kpi) => (
            <Link key={kpi.label} to={kpi.link} className="dov__kpi">
              <div className="dov__kpi-icon" style={{ background: kpi.color }}>
                <i className={kpi.icon} />
              </div>
              <div className="dov__kpi-body">
                <span className="dov__kpi-value">{kpi.value}</span>
                <span className="dov__kpi-label">{kpi.label}</span>
                {kpi.sub && <span className="dov__kpi-sub">{kpi.sub}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ Zone 4 — Raccourcis ═══ */}
      <div className="dov__section">
        <h2 className="dov__section-title">
          <i className="fas fa-bolt" /> {t('dashboard.ov.shortcutsTitle', 'Actions rapides')}
        </h2>
        <div className="dov__shortcuts">
          {shortcuts.map((s) => (
            <Link key={s.to + s.label} to={s.to} className={`dov__shortcut ${s.accent ? 'dov__shortcut--accent' : ''}`}>
              <i className={s.icon} />
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
