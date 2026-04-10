import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { profileAPI, handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';

const DeliveryProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ zones: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileAPI.list()
      .then(res => {
        const profiles = Array.isArray(res.data) ? res.data : [];
        setProfile(profiles.find(p => p.profile_type === 'LIVREUR' && p.is_active) || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openEdit = () => {
    const zones = profile?.metadata?.coverage_zones;
    setForm({
      zones: Array.isArray(zones) ? zones.join(', ') : (zones || ''),
      bio: profile?.bio || '',
    });
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const zonesArray = form.zones.split(',').map(z => z.trim()).filter(Boolean);
      await profileAPI.update(profile.id, {
        bio: form.bio,
        metadata: { ...profile.metadata, coverage_zones: zonesArray },
      });
      toast.success(t('dashboard.deliveryProfile.profileUpdated'));
      setEditing(false);
      const res = await profileAPI.list();
      const profiles = Array.isArray(res.data) ? res.data : [];
      setProfile(profiles.find(p => p.profile_type === 'LIVREUR' && p.is_active) || null);
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  if (!profile) {
    return (
      <div className="author-space">
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-truck" /></div>
            <h3>{t('dashboard.deliveryProfile.notActivated')}</h3>
            <p>{t('dashboard.deliveryProfile.notActivatedDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  const zones = profile.metadata?.coverage_zones;
  const zonesList = Array.isArray(zones) ? zones : (zones ? [zones] : []);

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-map-marker-alt" style={{ color: '#f59e0b' }} /> {t('dashboard.deliveryProfile.title')}</h1>
          <p className="author-space__subtitle">{t('dashboard.deliveryProfile.subtitle')}</p>
        </div>
        {!editing && (
          <button className="as-cta" onClick={openEdit}>
            <i className="fas fa-pen" /> {t('dashboard.deliveryProfile.edit')}
          </button>
        )}
      </div>

      {/* Identité */}
      <div className="as-card">
        <div className="as-card__body" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
          }}>
            {user?.profile_image ? (
              <img src={user.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <i className="fas fa-truck" style={{ color: '#fff', fontSize: '1.25rem' }} />
            )}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.15rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
              {user?.first_name} {user?.last_name}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span><i className="fas fa-truck" /> {t('dashboard.deliveryProfile.delivererRole')}</span>
              {profile.is_verified && <span style={{ color: 'var(--color-success)' }}><i className="fas fa-check-circle" /> {t('dashboard.deliveryProfile.verified')}</span>}
              {profile.avg_rating > 0 && <span>· {parseFloat(profile.avg_rating).toFixed(1)} ★</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Infos / Edition */}
      <div className="as-card">
        <div className="as-card__header">
          <h2 className="as-card__title"><i className="fas fa-map" /> {t('dashboard.deliveryProfile.coverageZones')}</h2>
          {editing && (
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('dashboard.deliveryProfile.cancel')}
            </button>
          )}
        </div>
        <div className="as-card__body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryProfile.coverageZones')}</label>
                  <input
                    type="text"
                    value={form.zones}
                    onChange={e => setForm(f => ({ ...f, zones: e.target.value }))}
                    placeholder="Libreville, Owendo, Akanda..."
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>
                    {t('dashboard.deliveryProfile.zonesHint')}
                  </span>
                </div>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.deliveryProfile.presentation')}</label>
                  <textarea
                    rows={3} value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder={t('dashboard.deliveryProfile.presentationPlaceholder')}
                  />
                </div>
              </div>
              <div className="ob-form__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setEditing(false)}>{t('dashboard.deliveryProfile.cancel')}</button>
                <button type="submit" className="as-cta" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-save" /> {t('dashboard.deliveryProfile.save')}</>}
                </button>
              </div>
            </form>
          ) : (
            <>
              {zonesList.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {zonesList.map((z, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.35rem 0.75rem', borderRadius: 8,
                      background: 'rgba(var(--color-primary-rgb), 0.08)',
                      color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: 600,
                    }}>
                      <i className="fas fa-map-pin" style={{ fontSize: '0.65rem' }} /> {z}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--color-text-muted-ui)', fontSize: '0.85rem' }}>
                  <em>{t('dashboard.deliveryProfile.noZones')}</em>
                </p>
              )}
              {profile.bio && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted-ui)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.deliveryProfile.presentation')}</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-body)', lineHeight: 1.6 }}>{profile.bio}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryProfile;
