import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';

const STATUS_COLORS = {
  DRAFT: '#94a3b8', CORRECTION: '#f59e0b', ILLUSTRATION: '#8b5cf6',
  LAYOUT: '#3b82f6', REVIEW: '#6366f1', APPROVED: '#10b981',
  PRINTING: '#f97316', PUBLISHED: '#16a34a',
};

const EditorialProjects = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await servicesService.getProjects();
      setProjects(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await servicesService.createProject(form);
      setShowForm(false);
      setForm({ title: '', description: '' });
      fetchProjects();
    } catch (err) {
      setMsg(handleApiError(err));
    }
    setCreating(false);
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="editorial-projects">
      <div className="dashboard-home__header">
        <h1>{t('dashboard.editorialProjects.title')}</h1>
        <p className="dashboard-home__subtitle">{t('dashboard.editorialProjects.subtitle')}</p>
      </div>

      {msg && <div className="dashboard-alert dashboard-alert--error">{msg}</div>}

      <button className="dashboard-btn dashboard-btn--primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        <i className="fas fa-plus" /> {t('dashboard.editorialProjects.newProject')}
      </button>

      {showForm && (
        <form className="dashboard-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={handleCreate}>
          <div className="my-orgs__form-grid">
            <div className="form-group form-group--full">
              <label>{t('dashboard.editorialProjects.titleLabel')} *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group form-group--full">
              <label>{t('dashboard.editorialProjects.description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="my-orgs__form-actions">
            <button type="button" className="dashboard-btn" onClick={() => setShowForm(false)}>{t('dashboard.editorialProjects.cancel')}</button>
            <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={creating}>
              {creating ? '...' : t('dashboard.editorialProjects.create')}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="text-muted">{t('dashboard.editorialProjects.noProjects')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {projects.map((p) => (
            <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="dashboard-card" style={{ padding: '1rem', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.title}</strong>
                  {p.organization_name && <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>— {p.organization_name}</span>}
                </div>
                <span className="my-profiles__badge" style={{ background: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status] }}>
                  {p.status_display || p.status}
                </span>
              </div>
              {p.tasks_count !== undefined && (
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  {t('dashboard.editorialProjects.tasksCount', { count: p.tasks_count })}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditorialProjects;
