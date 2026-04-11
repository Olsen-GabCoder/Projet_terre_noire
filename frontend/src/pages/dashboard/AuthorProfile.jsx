import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { profileAPI, handleApiError } from '../../services/api';
import bookService from '../../services/bookService';
import authorDashboardService from '../../services/authorDashboardService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/Profile.css';
import '../../styles/AuthorSpace.css';

const AuthorProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: '', website: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profilesRes, dashRes] = await Promise.all([
          profileAPI.list(),
          authorDashboardService.getDashboard().catch(() => ({ data: null })),
        ]);
        const profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
        const auteur = profiles.find(p => p.profile_type === 'AUTEUR' && p.is_active);
        setProfile(auteur || null);

        if (dashRes.data?.author) {
          setAuthorData(dashRes.data.author);
          try {
            const booksRes = await bookService.getAuthorBooks(dashRes.data.author.id);
            setBooks(Array.isArray(booksRes) ? booksRes : booksRes.results || []);
          } catch { /* no books */ }
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const openEdit = () => { setForm({ bio: profile?.bio || '', website: profile?.website || '' }); setEditing(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await profileAPI.update(profile.id, { bio: form.bio, website: form.website });
      toast.success(t('dashboard.authorProfile.profileUpdated'));
      setEditing(false);
      const res = await profileAPI.list();
      const profiles = Array.isArray(res.data) ? res.data : [];
      setProfile(profiles.find(p => p.profile_type === 'AUTEUR' && p.is_active) || null);
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  if (!profile) {
    return (
      <div className="author-space">
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-pen-fancy" /></div>
            <h3>{t('dashboard.authorProfile.notActivated')}</h3>
            <p>{t('dashboard.authorProfile.notActivatedDesc')}</p>
            <Link to="/dashboard/settings" className="dashboard-btn dashboard-btn--primary" style={{ marginTop: '1rem' }}>
              <i className="fas fa-id-badge" /> {t('dashboard.authorProfile.myProfiles')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-id-card" style={{ color: 'var(--color-primary)' }} /> {t('dashboard.authorProfile.title')}</h1>
          <p className="author-space__subtitle">{t('dashboard.authorProfile.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {authorData?.id && (
            <Link to={`/authors/${authorData.id}`} className="dashboard-btn">
              <i className="fas fa-external-link-alt" /> {t('dashboard.authorProfile.viewMyPage')}
            </Link>
          )}
          {!editing && (
            <button className="dashboard-btn dashboard-btn--primary" onClick={openEdit}>
              <i className="fas fa-pen" /> {t('dashboard.authorProfile.edit')}
            </button>
          )}
        </div>
      </div>

      {/* Carte identité */}
      <div className="as-card">
        <div className="as-card__body" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
          }}>
            {user?.profile_image ? (
              <img src={user.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>
                {(user?.first_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
              {user?.first_name} {user?.last_name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>
                <i className="fas fa-pen-fancy" style={{ marginRight: 4 }} /> {t('dashboard.authorProfile.authorRole')}
              </span>
              {profile.is_verified && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="fas fa-check-circle" /> {t('dashboard.authorProfile.verified')}
                </span>
              )}
              {books.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)' }}>
                  · {t('dashboard.authorProfile.booksCount', { count: books.length })}
                </span>
              )}
            </div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>
              {t('dashboard.authorProfile.photoNote')} <Link to="/dashboard/settings" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>{t('dashboard.authorProfile.yourAccount')}</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Infos publiques */}
      <div className="as-card">
        <div className="as-card__header">
          <h2 className="as-card__title"><i className="fas fa-align-left" /> {t('dashboard.authorProfile.publicInfo')}</h2>
          {editing && (
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('dashboard.authorProfile.cancel')}
            </button>
          )}
        </div>
        <div className="as-card__body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="ob-form__field" style={{ maxWidth: 'none' }}>
                  <label>{t('dashboard.authorProfile.biography')}</label>
                  <textarea
                    rows={6} value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder={t('dashboard.authorProfile.bioPlaceholder')}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>{form.bio.length} / 2000 {t('dashboard.authorProfile.characters')}</span>
                </div>
                <div className="ob-form__field" style={{ maxWidth: 420 }}>
                  <label>{t('dashboard.authorProfile.website')}</label>
                  <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://monsite.com" />
                </div>
              </div>
              <div className="ob-form__actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setEditing(false)}>{t('dashboard.authorProfile.cancel')}</button>
                <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-save" /> {t('dashboard.authorProfile.save')}</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="pcard__fields">
              <div className="pcard__field" style={{ gridColumn: '1 / -1' }}>
                <span className="pcard__field-label">{t('dashboard.authorProfile.biography')}</span>
                <span className="pcard__field-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {profile.bio || <em style={{ color: 'var(--color-text-muted-ui)' }}>{t('dashboard.authorProfile.noBio')}</em>}
                </span>
              </div>
              <div className="pcard__field">
                <span className="pcard__field-label">{t('dashboard.authorProfile.website')}</span>
                <span className="pcard__field-value">
                  {profile.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {profile.website.replace(/^https?:\/\//, '')} <i className="fas fa-external-link-alt" style={{ fontSize: '0.6rem' }} />
                    </a>
                  ) : <em style={{ color: 'var(--color-text-muted-ui)' }}>—</em>}
                </span>
              </div>
              <div className="pcard__field">
                <span className="pcard__field-label">{t('dashboard.authorProfile.memberSince')}</span>
                <span className="pcard__field-value">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mes livres */}
      {books.length > 0 && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-book" /> {t('dashboard.authorProfile.myBooks', { count: books.length })}</h2>
            <Link to="/dashboard/author/books" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              {t('dashboard.authorProfile.manage')}
            </Link>
          </div>
          <div className="as-card__body">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {books.slice(0, 8).map(book => (
                <Link key={book.id} to={`/books/${book.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 0.85rem', borderRadius: 10,
                  background: 'var(--color-bg-section-alt)',
                  textDecoration: 'none', color: 'var(--color-text-heading)',
                  fontSize: '0.8125rem', fontWeight: 500,
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  transition: 'all 0.15s',
                }}>
                  {book.cover_image && <img src={book.cover_image} alt="" style={{ width: 24, height: 33, objectFit: 'cover', borderRadius: 3 }} />}
                  {book.title}
                </Link>
              ))}
              {books.length > 8 && (
                <Link to="/dashboard/author/books" style={{ display: 'flex', alignItems: 'center', padding: '0.45rem 0.85rem', color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none' }}>
                  +{books.length - 8} {t('dashboard.authorProfile.others')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorProfile;
