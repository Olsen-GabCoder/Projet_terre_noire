import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import socialService from '../services/socialService';
import '../styles/BookClubs.css';

const ClubInvite = () => {
  const { token } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await socialService.getInvitePreview(token);
        setInvite(r.data);
      } catch {
        setError('Invitation introuvable ou expirée.');
      }
      setLoading(false);
    })();
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const r = await socialService.joinByLink(token);
      navigate(`/clubs/${r.data.slug}`);
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (err.response?.status === 409) {
        // Déjà membre
        navigate(`/clubs/${err.response.data.slug || invite?.club_slug}`);
      } else {
        setError(detail || 'Impossible de rejoindre le club.');
      }
    }
    setJoining(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  if (error) return (
    <div className="club-invite">
      <div className="club-invite__card">
        <div className="club-invite__icon club-invite__icon--error"><i className="fas fa-link-slash" /></div>
        <h1>{t('pages.bookClubs.inviteExpired', 'Invitation invalide')}</h1>
        <p>{error}</p>
        <Link to="/clubs" className="clubs-page__create-btn">
          <i className="fas fa-compass" /> {t('pages.bookClubs.exploreClubs', 'Explorer les clubs')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="club-invite">
      <div className="club-invite__card">
        <div className="club-invite__avatar">
          {invite.club_cover ? (
            <img src={invite.club_cover} alt={invite.club_name} />
          ) : (
            <i className="fas fa-users" />
          )}
        </div>
        <h1>{invite.club_name}</h1>
        <div className="club-invite__meta">
          <span><i className="fas fa-users" /> {invite.club_members_count} membre{invite.club_members_count > 1 ? 's' : ''}</span>
          {invite.created_by && (
            <span>Invité par {invite.created_by.full_name || invite.created_by.username}</span>
          )}
        </div>

        {!invite.is_valid ? (
          <div className="club-invite__expired">
            <i className="fas fa-clock" />
            <p>Cette invitation a expiré.</p>
            <Link to="/clubs" className="clubs-page__create-btn" style={{ marginTop: '1rem' }}>
              <i className="fas fa-compass" /> Explorer les clubs
            </Link>
          </div>
        ) : user ? (
          <button className="clubs-page__create-btn club-invite__join" onClick={handleJoin} disabled={joining}>
            {joining ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sign-in-alt" />}
            {' '}Rejoindre {invite.club_name}
          </button>
        ) : (
          <div className="club-invite__auth">
            <p>{t('pages.bookClubs.inviteAuthPrompt', 'Connectez-vous ou créez un compte pour rejoindre ce club.')}</p>
            <Link to={`/login?redirect=/clubs/invite/${token}`} className="clubs-page__create-btn">
              <i className="fas fa-sign-in-alt" /> {t('pages.bookClubs.login', 'Se connecter')}
            </Link>
            <Link to={`/register?redirect=/clubs/invite/${token}`} className="clubs-page__create-btn club-invite__register">
              <i className="fas fa-user-plus" /> {t('pages.bookClubs.register', "Créer un compte")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubInvite;
