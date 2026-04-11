import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/Profile.css';

const ICON_MAP = {
  author: 'fas fa-pen-fancy',
  CORRECTEUR: 'fas fa-spell-check',
  ILLUSTRATEUR: 'fas fa-palette',
  TRADUCTEUR: 'fas fa-language',
  organization: 'fas fa-building',
};

const LABEL_KEY_MAP = {
  author: 'pages.settings.profile.publicPages.author',
  CORRECTEUR: 'pages.settings.profile.publicPages.proofreader',
  ILLUSTRATEUR: 'pages.settings.profile.publicPages.illustrator',
  TRADUCTEUR: 'pages.settings.profile.publicPages.translator',
};

const ROLE_KEY_MAP = {
  PROPRIETAIRE: 'pages.settings.profile.publicPages.owner',
  ADMINISTRATEUR: 'pages.settings.profile.publicPages.admin',
  EDITEUR: 'pages.settings.profile.publicPages.editor',
  COMMERCIAL: 'pages.settings.profile.publicPages.commercial',
  MEMBRE: 'pages.settings.profile.publicPages.member',
};

const SectionProfile = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone_number: '',
    address: '', city: '', country: '',
  });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [facets, setFacets] = useState([]);
  const [facetsLoading, setFacetsLoading] = useState(true);

  useEffect(() => {
    if (user) setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      phone_number: user.phone_number || '', address: user.address || '',
      city: user.city || '', country: user.country || '',
    });
  }, [user]);

  useEffect(() => {
    authAPI.getPublicPresence()
      .then(res => setFacets(res.data?.facets || []))
      .catch(() => {})
      .finally(() => setFacetsLoading(false));
  }, []);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || (user?.username?.charAt(0) || 'U');

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
    if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: t('pages.settings.profile.imageTooLarge') }); return; }
    setAvatarLoading(true); setMessage({ type: '', text: '' });
    try {
      const fd = new FormData(); fd.append('profile_image', file);
      const result = await updateProfile(fd);
      setMessage(result.success ? { type: 'success', text: t('pages.settings.profile.photoSaved') } : { type: 'error', text: t('pages.settings.profile.error') });
    } catch { setMessage({ type: 'error', text: t('pages.settings.profile.error') }); }
    finally { setAvatarLoading(false); e.target.value = ''; }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      phone_number: user.phone_number || '', address: user.address || '',
      city: user.city || '', country: user.country || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({
        first_name: formData.first_name, last_name: formData.last_name,
        phone_number: formData.phone_number, address: formData.address,
        city: formData.city, country: formData.country,
      });
      if (result.success) { setMessage({ type: 'success', text: t('pages.settings.profile.saved') }); setIsEditing(false); }
      else setMessage({ type: 'error', text: t('pages.settings.profile.error') });
    } catch { setMessage({ type: 'error', text: t('pages.settings.profile.error') }); }
    finally { setLoading(false); }
  };

  const copyLink = (url) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success(t('pages.settings.profile.publicPages.linkCopied'));
    });
  };

  const getFacetLabel = (facet) => {
    if (facet.type === 'organization') return facet.name;
    if (facet.type === 'professional') return t(LABEL_KEY_MAP[facet.profile_type] || facet.profile_type);
    return t(LABEL_KEY_MAP[facet.type] || facet.type);
  };

  const getFacetIcon = (facet) => {
    if (facet.type === 'professional') return ICON_MAP[facet.profile_type] || 'fas fa-user';
    return ICON_MAP[facet.type] || 'fas fa-globe';
  };

  const getFacetDetail = (facet) => {
    if (facet.type === 'author') return t('pages.settings.profile.publicPages.booksCount', { count: facet.books_count });
    if (facet.type === 'professional' && facet.is_verified) return t('pages.settings.profile.publicPages.verified');
    if (facet.type === 'organization') return t(ROLE_KEY_MAP[facet.role] || facet.role);
    return null;
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2><i className="fas fa-user" /> {t('pages.settings.profile.title')}</h2>
        {!isEditing && (
          <button type="button" className="pcard__edit-btn" onClick={() => setIsEditing(true)}>
            <i className="fas fa-pen" /> {t('pages.settings.profile.edit')}
          </button>
        )}
      </div>
      <div className="dashboard-card__body">
        <p className="sp-hint">{t('pages.settings.profile.subtitle')}</p>

        {message.text && (
          <div className={`settings-msg settings-msg--${message.type}`}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {message.text}
          </div>
        )}

        {/* Avatar */}
        <div className="sp-avatar-row">
          <label className={`sp-avatar ${avatarLoading ? 'is-loading' : ''}`} htmlFor="sp-avatar-input">
            {user?.profile_image
              ? <img src={user.profile_image} alt={displayName} className="sp-avatar__img" />
              : <span className="sp-avatar__initials">{initials.toUpperCase()}</span>}
            <span className="sp-avatar__overlay">
              {avatarLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-camera" />}
            </span>
          </label>
          <input id="sp-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} disabled={avatarLoading} />
          <div className="sp-avatar-info">
            <span className="sp-avatar-info__name">{displayName}</span>
            <span className="sp-avatar-info__hint">{t('pages.settings.profile.photoHint')}</span>
          </div>
        </div>

        {/* Fields */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="sp-form">
            <div className="sp-form__grid">
              <div className="sp-form__field">
                <label htmlFor="sp-first-name">{t('pages.settings.profile.firstName')} *</label>
                <input id="sp-first-name" type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />
              </div>
              <div className="sp-form__field">
                <label htmlFor="sp-last-name">{t('pages.settings.profile.lastName')} *</label>
                <input id="sp-last-name" type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />
              </div>
              <div className="sp-form__field sp-form__field--full">
                <label htmlFor="sp-email">{t('pages.settings.profile.email')}</label>
                <input id="sp-email" type="email" value={user?.email || ''} disabled className="sp-input--disabled" />
                <small className="sp-form__hint">{t('pages.settings.profile.emailHint')}</small>
              </div>
              <div className="sp-form__field">
                <label htmlFor="sp-phone">{t('pages.settings.profile.phone')}</label>
                <input id="sp-phone" type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+241 XX XX XX XX" />
              </div>
              <div className="sp-form__field sp-form__field--full">
                <label htmlFor="sp-address">{t('pages.settings.profile.address')}</label>
                <input id="sp-address" type="text" name="address" value={formData.address} onChange={handleChange} />
              </div>
              <div className="sp-form__field">
                <label htmlFor="sp-city">{t('pages.settings.profile.city')}</label>
                <input id="sp-city" type="text" name="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="sp-form__field">
                <label htmlFor="sp-country">{t('pages.settings.profile.country')}</label>
                <input id="sp-country" type="text" name="country" value={formData.country} onChange={handleChange} />
              </div>
            </div>
            <div className="sp-form__actions">
              <button type="button" className="dashboard-btn dashboard-btn--secondary" onClick={handleCancel}>
                {t('pages.settings.profile.cancel')}
              </button>
              <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> {t('common.loading')}</> : <><i className="fas fa-save" /> {t('pages.settings.profile.save')}</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="sp-fields">
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.firstName')}</span>
              <span className="sp-field__value">{user?.first_name || '—'}</span>
            </div>
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.lastName')}</span>
              <span className="sp-field__value">{user?.last_name || '—'}</span>
            </div>
            {user?.username && (
              <div className="sp-field">
                <span className="sp-field__label">{t('pages.settings.profile.username')}</span>
                <span className="sp-field__value">@{user.username}</span>
              </div>
            )}
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.email')}</span>
              <span className="sp-field__value sp-field__value--muted"><i className="fas fa-lock" /> {user?.email}</span>
            </div>
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.phone')}</span>
              <span className={`sp-field__value ${!user?.phone_number ? 'sp-field__value--empty' : ''}`}>{user?.phone_number || '—'}</span>
            </div>
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.address')}</span>
              <span className={`sp-field__value ${!user?.address ? 'sp-field__value--empty' : ''}`}>{user?.address || '—'}</span>
            </div>
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.city')}</span>
              <span className={`sp-field__value ${!user?.city ? 'sp-field__value--empty' : ''}`}>{user?.city || '—'}</span>
            </div>
            <div className="sp-field">
              <span className="sp-field__label">{t('pages.settings.profile.country')}</span>
              <span className={`sp-field__value ${!user?.country ? 'sp-field__value--empty' : ''}`}>{user?.country || '—'}</span>
            </div>
          </div>
        )}

        {/* Public presence */}
        <div className="sp-presence">
          <h3 className="sp-presence__title">
            <i className="fas fa-globe" /> {t('pages.settings.profile.publicPages.title')}
          </h3>
          <p className="sp-hint">{t('pages.settings.profile.publicPages.subtitle')}</p>

          {facetsLoading ? (
            <div className="ss-loading"><i className="fas fa-spinner fa-spin" /> {t('common.loading')}</div>
          ) : facets.length === 0 ? (
            <p className="sp-presence__empty">{t('pages.settings.profile.publicPages.empty')}</p>
          ) : (
            <div className="sp-presence__list">
              {facets.map((facet, i) => (
                <div key={`${facet.type}-${facet.url}-${i}`} className="sp-facet">
                  <div className="sp-facet__icon">
                    <i className={getFacetIcon(facet)} />
                  </div>
                  <div className="sp-facet__body">
                    <span className="sp-facet__label">{getFacetLabel(facet)}</span>
                    {getFacetDetail(facet) && <span className="sp-facet__detail">{getFacetDetail(facet)}</span>}
                  </div>
                  <div className="sp-facet__actions">
                    <a href={facet.url} target="_blank" rel="noopener noreferrer" className="sp-facet__btn" title={t('pages.settings.profile.publicPages.view')}>
                      <i className="fas fa-external-link-alt" />
                    </a>
                    <button type="button" className="sp-facet__btn" onClick={() => copyLink(facet.url)} title={t('pages.settings.profile.publicPages.copyLink')}>
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionProfile;
