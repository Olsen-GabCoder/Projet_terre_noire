import { useState, useEffect } from 'react';
import { invitationAPI, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const MyInvitations = () => {
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchInvitations = async () => {
    try {
      const res = await invitationAPI.mine();
      setInvitations(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: handleApiError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvitations(); }, []);

  const respond = async (token, accept) => {
    setResponding(token);
    setMessage({ type: '', text: '' });
    try {
      const res = await invitationAPI.respond({ token, accept });
      setMessage({ type: 'success', text: res.data.message });
      fetchInvitations();
      // Rafraîchir le profil pour mettre à jour organizationMemberships
      if (accept) {
        await refreshUser();
      }
    } catch (err) {
      setMessage({ type: 'error', text: handleApiError(err) });
    } finally {
      setResponding(null);
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="my-invitations">
      <div className="dashboard-home__header">
        <h1>{t('pages.profile.invitations.title')}</h1>
        <p className="dashboard-home__subtitle">
          {t('pages.profile.invitations.subtitle')}
        </p>
      </div>

      {message.text && (
        <div className={`dashboard-alert dashboard-alert--${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-card__body">
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <i className="fas fa-envelope-open" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block', opacity: 0.4 }} />
              {t('pages.profile.invitations.noInvitations')}
            </p>
          </div>
        </div>
      ) : (
        <div className="my-invitations__list">
          {invitations.map((inv) => (
            <div key={inv.id} className="dashboard-card my-invitations__card">
              <div className="dashboard-card__body">
                <div className="my-invitations__info">
                  <h3>{inv.organization_name}</h3>
                  <p>
                    {t('pages.profile.invitations.roleProposed')} <strong>{inv.role_display}</strong>
                  </p>
                  <p className="text-muted">
                    {t('pages.profile.invitations.invitedBy', { name: inv.invited_by_name, date: new Date(inv.created_at).toLocaleDateString('fr-FR') })}
                  </p>
                  {inv.message && <p className="my-invitations__message">"{inv.message}"</p>}
                </div>
                <div className="my-invitations__actions">
                  <button
                    className="dashboard-btn dashboard-btn--primary"
                    onClick={() => respond(inv.token, true)}
                    disabled={responding === inv.token}
                  >
                    <i className="fas fa-check" /> {t('pages.profile.invitations.accept')}
                  </button>
                  <button
                    className="dashboard-btn"
                    onClick={() => respond(inv.token, false)}
                    disabled={responding === inv.token}
                  >
                    <i className="fas fa-times" /> {t('pages.profile.invitations.decline')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyInvitations;
