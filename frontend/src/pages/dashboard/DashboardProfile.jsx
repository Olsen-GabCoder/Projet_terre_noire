/**
 * DashboardProfile — page profil intégrée au dashboard.
 *
 * DUPLICATION VOLONTAIRE : le formulaire d'infos personnelles et le handler
 * d'avatar reprennent la même logique que frontend/src/pages/Profile.jsx
 * (onglet "info", lignes ~340-402, et handler avatar lignes ~96-107).
 * Si vous modifiez les champs, validations ou messages d'erreur dans l'un,
 * reportez la modification dans l'autre.
 *
 * Raison : Profile.jsx est une page publique lourde (hero, onglets, KPIs)
 * impossible à intégrer telle quelle dans le DashboardLayout sans conflit
 * visuel. Extraire un composant partagé nécessiterait 8+ props et un
 * refactor risqué de la page publique.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MyProfiles from './MyProfiles';
import '../../styles/Profile.css';

const DashboardProfile = () => {
  const { t } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    address: '', city: '', country: '', receive_newsletter: false,
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (user) setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      email: user.email || '', phone_number: user.phone_number || '',
      address: user.address || '', city: user.city || '',
      country: user.country || '', receive_newsletter: user.receive_newsletter || false,
    });
  }, [user]);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || (user?.username?.charAt(0) || 'U');
  const formatDate = (ds) => new Date(ds).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

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

  const handleLogout = () => {
    if (window.confirm(t('pages.profile.logoutConfirm', 'Voulez-vous vraiment vous déconnecter ?'))) {
      logout();
      navigate('/');
    }
  };

  if (!user) return null;

  return (
    <div className="dprofile">
      {/* ── Bandeau avatar + nom ── */}
      <div className="dprofile__header">
        <label className={`dprofile__avatar ${avatarLoading ? 'is-loading' : ''}`} htmlFor="dprofile-avatar-input">
          {user.profile_image
            ? <img src={user.profile_image} alt={displayName} className="dprofile__avatar-img" />
            : <span className="dprofile__avatar-initials">{initials.toUpperCase()}</span>}
          <span className="dprofile__avatar-overlay">
            {avatarLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-camera" />}
          </span>
        </label>
        <input id="dprofile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp"
          className="dprofile__avatar-file" onChange={handleAvatarChange} disabled={avatarLoading} />
        <div className="dprofile__identity">
          <h1 className="dprofile__name">{displayName}</h1>
          <p className="dprofile__email">{user.email}</p>
        </div>
      </div>

      {/* ── Messages ── */}
      {message.text && (
        <div className={`profile-msg profile-msg--${message.type}`}>
          <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
          {message.text}
        </div>
      )}

      {/* ── Infos personnelles ── */}
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
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-form__header"><h2>{t('pages.profile.editInfo', 'Modifier mes informations')}</h2><button type="button" className="pcard__edit-btn" onClick={() => setIsEditing(false)}><i className="fas fa-times" /> {t('pages.profile.cancel')}</button></div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="dp_first_name">{t('pages.profile.firstName')} *</label><input type="text" id="dp_first_name" name="first_name" value={formData.first_name} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="dp_last_name">{t('pages.profile.lastName')} *</label><input type="text" id="dp_last_name" name="last_name" value={formData.last_name} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="dp_email">{t('pages.profile.email')} *</label><input type="email" id="dp_email" name="email" value={formData.email} disabled className="disabled-input" /><small className="form-hint">{t('pages.profile.emailCannotBeChanged')}</small></div>
            <div className="form-group"><label htmlFor="dp_phone">{t('pages.profile.phone')}</label><input type="tel" id="dp_phone" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder={t('pages.profile.phonePlaceholder')} /></div>
            <div className="form-group full-width"><label htmlFor="dp_address">{t('pages.profile.address')}</label><input type="text" id="dp_address" name="address" value={formData.address} onChange={handleChange} placeholder={t('pages.profile.addressPlaceholder')} /></div>
            <div className="form-group"><label htmlFor="dp_city">{t('pages.profile.city')}</label><input type="text" id="dp_city" name="city" value={formData.city} onChange={handleChange} placeholder={t('pages.profile.cityPlaceholder')} /></div>
            <div className="form-group"><label htmlFor="dp_country">{t('pages.profile.country')}</label><input type="text" id="dp_country" name="country" value={formData.country} onChange={handleChange} placeholder={t('pages.profile.countryPlaceholder')} /></div>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label"><input type="checkbox" name="receive_newsletter" checked={formData.receive_newsletter} onChange={handleChange} /><span className="checkbox-custom" />{t('pages.profile.receiveNewsletter')}</label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? t('pages.profile.saving', 'Enregistrement...') : t('pages.profile.saveChanges', 'Enregistrer les modifications')}</button>
          </div>
        </form>
      )}

      {/* ── Mes rôles ── */}
      <div className="dprofile__section">
        <h2 className="dprofile__section-title"><i className="fas fa-id-badge" /> {t('pages.profile.tabRoles', 'Mes rôles')}</h2>
        <MyProfiles />
      </div>

      {/* ── Déconnexion ── */}
      <div className="dprofile__logout">
        <button type="button" className="btn-logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" /> {t('pages.profile.logout', 'Se déconnecter')}
        </button>
      </div>
    </div>
  );
};

export default DashboardProfile;
