import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { organizationAPI, invitationAPI, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const OrgDashboard = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const { hasOrgRole } = useAuth();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invitation form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBRE', message: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const canManage = hasOrgRole(Number(id), 'PROPRIETAIRE') || hasOrgRole(Number(id), 'ADMINISTRATEUR');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, membersRes] = await Promise.all([
          organizationAPI.dashboard(id),
          organizationAPI.listMembers(id),
        ]);
        setData(dashRes.data);
        setMembers(membersRes.data);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, location.key]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg('');
    try {
      const res = await organizationAPI.invite(id, inviteForm);
      setInviteMsg(res.data.message);
      setInviteForm({ email: '', role: 'MEMBRE', message: '' });
      setShowInvite(false);
    } catch (err) {
      setInviteMsg(handleApiError(err));
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!data) return null;

  const org = data.organization;
  const orgType = org.org_type;

  // Libellés adaptés au type d'org
  const bookLabel = orgType === 'LIBRAIRIE' ? t('dashboard.org.labelStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.org.labelFonds') : t('dashboard.org.labelPublished');
  const bookIcon = orgType === 'LIBRAIRIE' ? 'fa-store' : orgType === 'BIBLIOTHEQUE' ? 'fa-landmark' : 'fa-book';
  const bookBtnLabel = orgType === 'LIBRAIRIE' ? t('dashboard.org.manageStock') : orgType === 'BIBLIOTHEQUE' ? t('dashboard.org.manageCatalog') : t('dashboard.org.manageCatalog');

  return (
    <div className="org-dashboard">
      <div className="dashboard-home__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>{org.name}</h1>
            <p className="dashboard-home__subtitle">{org.org_type_display}</p>
          </div>
          {canManage && (
            <Link to={`/dashboard/organizations/${id}/settings`} className="dashboard-btn dashboard-btn--secondary">
              <i className="fas fa-cog" /> {t('dashboard.org.settings')}
            </Link>
          )}
        </div>
      </div>

      {inviteMsg && <div className="dashboard-alert dashboard-alert--success">{inviteMsg}</div>}

      {/* Navigation rapide selon le type d'org */}
      <div className="org-dashboard__nav" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Link to={`/dashboard/organizations/${id}/books`} className="dashboard-card" style={{ flex: '1 1 200px', textDecoration: 'none', cursor: 'pointer' }}>
          <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <i className={`fas ${bookIcon}`} style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'var(--color-primary)' }} />
            <strong>{bookBtnLabel}</strong>
            {data.book_count !== undefined && (
              <p style={{ margin: '0.25rem 0 0', opacity: 0.7 }}>{t('dashboard.org.titleCount', { count: data.book_count })}</p>
            )}
          </div>
        </Link>

        {orgType === 'MAISON_EDITION' && (
          <Link to={`/dashboard/organizations/${id}/manuscripts`} className="dashboard-card" style={{ flex: '1 1 200px', textDecoration: 'none', cursor: 'pointer' }}>
            <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="fas fa-inbox" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'var(--color-primary)' }} />
              <strong>{t('dashboard.org.manuscripts')}</strong>
              {data.manuscripts_total !== undefined && (
                <p style={{ margin: '0.25rem 0 0', opacity: 0.7 }}>{t('dashboard.org.receivedCount', { count: data.manuscripts_total })}</p>
              )}
            </div>
          </Link>
        )}

        {orgType === 'IMPRIMERIE' && (
          <Link to={`/dashboard/organizations/${id}/print-requests`} className="dashboard-card" style={{ flex: '1 1 200px', textDecoration: 'none', cursor: 'pointer' }}>
            <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="fas fa-print" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'var(--color-primary)' }} />
              <strong>{t('dashboard.org.printRequests')}</strong>
            </div>
          </Link>
        )}

        <Link to="/vendor" className="dashboard-card" style={{ flex: '1 1 200px', textDecoration: 'none', cursor: 'pointer' }}>
          <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <i className="fas fa-shopping-bag" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: '#10b981' }} />
            <strong>{t('dashboard.org.orders')}</strong>
            {data.orders_pending > 0 && (
              <p style={{ margin: '0.25rem 0 0', color: '#f59e0b', fontWeight: 600 }}>{t('dashboard.org.toProcess', { count: data.orders_pending })}</p>
            )}
          </div>
        </Link>

        {canManage && (
          <Link to={`/dashboard/organizations/${id}/settings`} className="dashboard-card" style={{ flex: '1 1 200px', textDecoration: 'none', cursor: 'pointer' }}>
            <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="fas fa-cog" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'var(--color-primary)' }} />
              <strong>{t('dashboard.org.settings')}</strong>
            </div>
          </Link>
        )}
      </div>

      <div className="dashboard-home__grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2><i className="fas fa-chart-bar" /> {t('dashboard.org.statistics')}</h2>
          </div>
          <div className="dashboard-card__body">
            <div className="org-dashboard__stats">
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">{data.member_count}</span>
                <span className="org-dashboard__stat-label">{t('dashboard.org.members')}</span>
              </div>
              <div className="org-dashboard__stat">
                <span className="org-dashboard__stat-value">{data.pending_invitations}</span>
                <span className="org-dashboard__stat-label">{t('dashboard.org.pendingInvitations')}</span>
              </div>
              {data.book_count !== undefined && (
                <div className="org-dashboard__stat">
                  <span className="org-dashboard__stat-value">{data.book_count}</span>
                  <span className="org-dashboard__stat-label">{bookLabel}</span>
                </div>
              )}
              {orgType === 'MAISON_EDITION' && data.manuscripts_total !== undefined && (
                <>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value">{data.manuscripts_total}</span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.manuscriptsReceived')}</span>
                  </div>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value" style={{ color: '#f59e0b' }}>{data.manuscripts_pending}</span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.pending')}</span>
                  </div>
                </>
              )}
              {data.orders_total > 0 && (
                <>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value">{data.orders_total}</span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.orders')}</span>
                  </div>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value" style={{ color: '#f59e0b' }}>{data.orders_pending}</span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.toProcessLabel')}</span>
                  </div>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value" style={{ color: '#10b981' }}>{data.orders_delivered}</span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.delivered')}</span>
                  </div>
                  <div className="org-dashboard__stat">
                    <span className="org-dashboard__stat-value" style={{ color: 'var(--color-primary)' }}>
                      {Math.round(data.revenue || 0).toLocaleString('fr-FR')} F
                    </span>
                    <span className="org-dashboard__stat-label">{t('dashboard.org.revenue')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2><i className="fas fa-users" /> {t('dashboard.org.members')} ({members.length})</h2>
            {canManage && (
              <button className="dashboard-card__link" onClick={() => setShowInvite(!showInvite)}>
                <i className="fas fa-user-plus" /> {t('dashboard.org.invite')}
              </button>
            )}
          </div>
          <div className="dashboard-card__body">
            {showInvite && (
              <form className="org-dashboard__invite-form" onSubmit={handleInvite}>
                <input
                  type="email" placeholder={t('dashboard.org.inviteEmailPlaceholder')} required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="MEMBRE">{t('dashboard.org.roleMember')}</option>
                  <option value="COMMERCIAL">{t('dashboard.org.roleCommercial')}</option>
                  <option value="EDITEUR">{t('dashboard.org.roleEditor')}</option>
                  <option value="ADMINISTRATEUR">{t('dashboard.org.roleAdmin')}</option>
                </select>
                <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={inviting}>
                  {inviting ? '...' : t('dashboard.org.send')}
                </button>
              </form>
            )}
            <ul className="org-dashboard__member-list">
              {members.map((m) => (
                <li key={m.id} className="org-dashboard__member">
                  <span className="org-dashboard__member-name">{m.user_name}</span>
                  <span className="org-dashboard__member-email">{m.user_email}</span>
                  <span className="my-orgs__role-badge">{m.role_display}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgDashboard;
