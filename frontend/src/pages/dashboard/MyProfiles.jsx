import { useState, useEffect } from 'react';
import { profileAPI, handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';

const PROFILE_TYPES = [
  { value: 'LECTEUR', labelKey: 'pages.profile.roles.lecteurLabel', icon: 'fas fa-book-reader', descKey: 'pages.profile.roles.lecteurDesc' },
  { value: 'AUTEUR', labelKey: 'pages.profile.roles.auteurLabel', icon: 'fas fa-pen-fancy', descKey: 'pages.profile.roles.auteurDesc' },
  { value: 'EDITEUR', labelKey: 'pages.profile.roles.editeurLabel', icon: 'fas fa-book-open', descKey: 'pages.profile.roles.editeurDesc' },
  { value: 'CORRECTEUR', labelKey: 'pages.profile.roles.correcteurLabel', icon: 'fas fa-spell-check', descKey: 'pages.profile.roles.correcteurDesc' },
  { value: 'ILLUSTRATEUR', labelKey: 'pages.profile.roles.illustrateurLabel', icon: 'fas fa-palette', descKey: 'pages.profile.roles.illustrateurDesc' },
  { value: 'TRADUCTEUR', labelKey: 'pages.profile.roles.traducteurLabel', icon: 'fas fa-language', descKey: 'pages.profile.roles.traducteurDesc' },
  { value: 'LIVREUR', labelKey: 'pages.profile.roles.livreurLabel', icon: 'fas fa-truck', descKey: 'pages.profile.roles.livreurDesc' },
];

const MyProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfiles = async () => {
    try {
      const res = await profileAPI.list();
      setProfiles(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const activeTypes = profiles.filter(p => p.is_active).map(p => p.profile_type);

  const activateProfile = async (profileType) => {
    setActivating(profileType);
    setError('');
    setSuccess('');
    try {
      const res = await profileAPI.create({ profile_type: profileType });
      setSuccess(res.data.message);
      fetchProfiles();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setActivating(null);
    }
  };

  const deactivateProfile = async (profile) => {
    if (profile.profile_type === 'LECTEUR') return;
    setError('');
    setSuccess('');
    try {
      const res = await profileAPI.deactivate(profile.id);
      setSuccess(res.data.message);
      fetchProfiles();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="my-profiles">
      <div className="dashboard-home__header">
        <h1>{t('pages.profile.roles.title')}</h1>
        <p className="dashboard-home__subtitle">
          {t('pages.profile.roles.subtitle')}
        </p>
      </div>

      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}
      {success && <div className="dashboard-alert dashboard-alert--success">{success}</div>}

      <div className="my-profiles__grid">
        {PROFILE_TYPES.map((pt) => {
          const existing = profiles.find(p => p.profile_type === pt.value);
          const isActive = existing?.is_active;
          const isLecteur = pt.value === 'LECTEUR';

          return (
            <div key={pt.value} className={`my-profiles__card ${isActive ? 'my-profiles__card--active' : existing ? 'my-profiles__card--inactive' : ''}`}>
              <div className="my-profiles__card-icon">
                <i className={pt.icon} />
              </div>
              <h3>{t(pt.labelKey)}</h3>
              <p>{t(pt.descKey)}</p>
              {isActive ? (
                <div className="my-profiles__card-status">
                  <span className="my-profiles__badge my-profiles__badge--active">
                    <i className="fas fa-check-circle" /> {t('pages.profile.roles.active')}
                  </span>
                  {existing?.is_verified && <span className="my-profiles__badge my-profiles__badge--verified"><i className="fas fa-badge-check" /> {t('pages.profile.roles.verified')}</span>}
                  {!isLecteur && (
                    <button className="my-profiles__btn my-profiles__btn--deactivate" onClick={() => deactivateProfile(existing)}>
                      {t('pages.profile.roles.deactivate')}
                    </button>
                  )}
                </div>
              ) : existing ? (
                <div className="my-profiles__card-status">
                  <span className="my-profiles__badge my-profiles__badge--inactive">
                    <i className="fas fa-pause-circle" /> {t('pages.profile.roles.inactive')}
                  </span>
                  <button
                    className="my-profiles__btn my-profiles__btn--reactivate"
                    onClick={() => activateProfile(pt.value)}
                    disabled={activating === pt.value}
                  >
                    {activating === pt.value ? t('pages.profile.roles.reactivating') : t('pages.profile.roles.reactivate')}
                  </button>
                </div>
              ) : (
                <button
                  className="my-profiles__btn my-profiles__btn--activate"
                  onClick={() => activateProfile(pt.value)}
                  disabled={activating === pt.value}
                >
                  {activating === pt.value ? t('pages.profile.roles.activating') : t('pages.profile.roles.activateProfile')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyProfiles;
