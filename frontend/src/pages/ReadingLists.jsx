import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { handleApiError } from '../services/api';
import '../styles/Social.css';
import SEO from '../components/SEO';

const ReadingLists = () => {
  const { t } = useTranslation();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', is_public: true });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchLists = async () => {
    try {
      const res = await socialService.getLists({ mine: true });
      setLists(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchLists(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await socialService.createList(form);
      setShowForm(false);
      setForm({ title: '', description: '', is_public: true });
      fetchLists();
    } catch (err) {
      setMsg(handleApiError(err));
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('pages.readingLists.confirmDelete'))) return;
    try {
      await socialService.deleteList(id);
      fetchLists();
    } catch { /* */ }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="reading-lists-page">
      <SEO title={t('pages.readingLists.title')} />
      <div className="feed-page__container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className="feed-page__title" style={{ margin: 0 }}>{t('pages.readingLists.title')}</h1>
          <button className="dashboard-btn dashboard-btn--primary" onClick={() => setShowForm(!showForm)}>
            <i className="fas fa-plus" /> {t('pages.readingLists.newList')}
          </button>
        </div>

        {msg && <div className="dashboard-alert dashboard-alert--error">{msg}</div>}

        {showForm && (
          <form className="dashboard-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={handleCreate}>
            <div className="my-orgs__form-grid">
              <div className="form-group">
                <label>{t('pages.readingLists.titleLabel')} *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('pages.readingLists.visibility')}</label>
                <select value={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.value === 'true' })}>
                  <option value="true">{t('pages.readingLists.public')}</option>
                  <option value="false">{t('pages.readingLists.private')}</option>
                </select>
              </div>
              <div className="form-group form-group--full">
                <label>{t('pages.readingLists.description')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="my-orgs__form-actions">
              <button type="button" className="dashboard-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={creating}>
                {creating ? '...' : t('pages.readingLists.create')}
              </button>
            </div>
          </form>
        )}

        {lists.length === 0 ? (
          <div className="feed-page__empty">
            <i className="fas fa-bookmark" />
            <p>{t('pages.readingLists.empty')}</p>
          </div>
        ) : (
          <div className="reading-lists__grid">
            {lists.map((list) => (
              <div key={list.id} className="dashboard-card reading-list-card">
                <div className="dashboard-card__body">
                  <Link to={`/lists/${list.slug || list.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3>{list.title}</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {t('pages.readingLists.bookCount', { count: list.items_count || 0 })} — {list.is_public ? t('pages.readingLists.public') : t('pages.readingLists.private')}
                    </p>
                    {list.description && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{list.description}</p>}
                  </Link>
                  <button className="dashboard-btn" style={{ marginTop: '0.75rem', fontSize: '0.75rem' }} onClick={() => handleDelete(list.id)}>
                    <i className="fas fa-trash" /> {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingLists;
