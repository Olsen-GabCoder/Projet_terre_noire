import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../../services/servicesService';
import bookService from '../../services/bookService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';

const TASK_STATUS_COLORS = {
  TODO: '#94a3b8', IN_PROGRESS: '#f59e0b', REVIEW: '#6366f1', DONE: '#10b981',
};

const EditorialProjectDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', task_type: 'CORRECTION', notes: '', due_date: '' });
  const [creating, setCreating] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [publishForm, setPublishForm] = useState({ title: '', reference: '', description: '', price: '', format: 'PAPIER', category: '', author: '' });
  const [publishing, setPublishing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);

  const fetchProject = async () => {
    try {
      const res = await servicesService.getProject(id);
      setProject(res.data);
    } catch (err) {
      setError(handleApiError(err));
    }
    setLoading(false);
  };

  useEffect(() => { fetchProject(); }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await servicesService.createTask(id, taskForm);
      setShowTaskForm(false);
      setTaskForm({ title: '', task_type: 'CORRECTION', notes: '', due_date: '' });
      fetchProject();
    } catch (err) {
      setError(handleApiError(err));
    }
    setCreating(false);
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await servicesService.updateTaskStatus(taskId, { status });
      fetchProject();
    } catch { /* */ }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!project) return null;

  const tasks = project.tasks || [];

  return (
    <div className="project-detail">
      <div className="dashboard-home__header">
        <h1>{project.title}</h1>
        <p className="dashboard-home__subtitle">
          {t('dashboard.editorialDetail.status')} : <strong>{project.status_display || project.status}</strong>
          {project.organization_name && ` — ${project.organization_name}`}
        </p>
      </div>

      {project.description && <p style={{ marginBottom: '1.5rem' }}>{project.description}</p>}

      {/* Publier comme livre — visible si APPROVED ou PRINTING */}
      {['APPROVED', 'PRINTING'].includes(project.status) && !project.book && (
        <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
          {!showPublish ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 .75rem', color: 'var(--color-text-body)', fontSize: '.9rem' }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '.35rem' }} />
                {t('dashboard.editorialDetail.readyToPublish')}
              </p>
              <button className="dashboard-btn dashboard-btn--primary" onClick={() => {
                setShowPublish(true);
                setPublishForm(f => ({ ...f, title: project.title, description: project.description || '' }));
                bookService.getCategories().then(d => setCategories(d.results || d || [])).catch(() => {});
                bookService.getAuthors().then(d => { const l = Array.isArray(d) ? d : d.results || []; setAuthors(l); }).catch(() => {});
              }}>
                <i className="fas fa-book" /> {t('dashboard.editorialDetail.publishAsBook')}
              </button>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setPublishing(true);
              try {
                const fd = new FormData();
                ['title', 'reference', 'description', 'price', 'format', 'category', 'author'].forEach(k => fd.append(k, publishForm[k]));
                fd.append('available', true);
                const res = await servicesService.publishProject(project.id, fd);
                toast.success(res.data.message);
                fetchProject();
                setShowPublish(false);
              } catch (err) { toast.error(handleApiError(err)); }
              finally { setPublishing(false); }
            }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}><i className="fas fa-book" /> {t('dashboard.editorialDetail.publishTitle', { title: project.title })}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.titleLabel')} *</label><input value={publishForm.title} onChange={e => setPublishForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.isbn')} *</label><input value={publishForm.reference} onChange={e => setPublishForm(f => ({ ...f, reference: e.target.value }))} required placeholder="978-2-XXX" /></div>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.price')} *</label><input type="number" value={publishForm.price} onChange={e => setPublishForm(f => ({ ...f, price: e.target.value }))} min="0" required /></div>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.format')}</label>
                  <select value={publishForm.format} onChange={e => setPublishForm(f => ({ ...f, format: e.target.value }))}>
                    <option value="PAPIER">{t('dashboard.editorialDetail.paper')}</option><option value="EBOOK">{t('dashboard.editorialDetail.ebook')}</option>
                  </select>
                </div>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.category')} *</label>
                  <select value={publishForm.category} onChange={e => setPublishForm(f => ({ ...f, category: e.target.value }))} required>
                    <option value="">—</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="ob-form__field"><label>{t('dashboard.editorialDetail.author')} *</label>
                  <select value={publishForm.author} onChange={e => setPublishForm(f => ({ ...f, author: e.target.value }))} required>
                    <option value="">—</option>{authors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
                <div className="ob-form__field" style={{ gridColumn: '1 / -1' }}><label>{t('dashboard.editorialDetail.description')}</label><textarea value={publishForm.description} onChange={e => setPublishForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setShowPublish(false)}>{t('dashboard.editorialDetail.cancel')}</button>
                <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={publishing}>
                  {publishing ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-check" /> {t('dashboard.editorialDetail.publish')}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {project.book && (
        <div className="dashboard-alert dashboard-alert--success" style={{ marginBottom: '1rem' }}>
          <i className="fas fa-book" /> {t('dashboard.editorialDetail.projectPublished')} <a href={`/books/${project.book}`} style={{ fontWeight: 700 }}>{t('dashboard.editorialDetail.viewBook')}</a>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}><i className="fas fa-tasks" /> {t('dashboard.editorialDetail.tasks', { count: tasks.length })}</h2>
        <button className="dashboard-btn dashboard-btn--primary" onClick={() => setShowTaskForm(!showTaskForm)}>
          <i className="fas fa-plus" /> {t('dashboard.editorialDetail.addTask')}
        </button>
      </div>

      {showTaskForm && (
        <form className="dashboard-card" style={{ padding: '1.25rem', marginBottom: '1rem' }} onSubmit={handleCreateTask}>
          <div className="my-orgs__form-grid">
            <div className="form-group">
              <label>{t('dashboard.editorialDetail.titleLabel')} *</label>
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('dashboard.editorialDetail.type')}</label>
              <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}>
                <option value="CORRECTION">{t('dashboard.editorialDetail.taskCorrection')}</option>
                <option value="ILLUSTRATION">{t('dashboard.editorialDetail.taskIllustration')}</option>
                <option value="COVER_DESIGN">{t('dashboard.editorialDetail.taskCoverDesign')}</option>
                <option value="LAYOUT">{t('dashboard.editorialDetail.taskLayout')}</option>
                <option value="PROOFREADING">{t('dashboard.editorialDetail.taskProofreading')}</option>
                <option value="TRANSLATION">{t('dashboard.editorialDetail.taskTranslation')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('dashboard.editorialDetail.dueDate')}</label>
              <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            </div>
            <div className="form-group form-group--full">
              <label>{t('dashboard.editorialDetail.notes')}</label>
              <textarea value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="my-orgs__form-actions">
            <button type="button" className="dashboard-btn" onClick={() => setShowTaskForm(false)}>{t('dashboard.editorialDetail.cancel')}</button>
            <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={creating}>{creating ? '...' : t('dashboard.editorialDetail.create')}</button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-muted">{t('dashboard.editorialDetail.noTasks')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tasks.map((task) => (
            <div key={task.id} className="dashboard-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{task.title}</strong>
                  <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    {task.task_type_display || task.task_type}
                  </span>
                </div>
                <span className="my-profiles__badge" style={{ background: `${TASK_STATUS_COLORS[task.status]}20`, color: TASK_STATUS_COLORS[task.status] }}>
                  {task.status_display || task.status}
                </span>
              </div>
              {task.assigned_to_name && <p className="text-muted" style={{ fontSize: '0.8rem' }}><i className="fas fa-user" /> {task.assigned_to_name}</p>}
              {task.due_date && <p className="text-muted" style={{ fontSize: '0.8rem' }}><i className="fas fa-calendar" /> {task.due_date}</p>}
              {task.status !== 'DONE' && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].filter((s) => s !== task.status).map((s) => (
                    <button key={s} className="dashboard-btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }} onClick={() => updateTaskStatus(task.id, s)}>
                      {s === 'DONE' ? t('dashboard.editorialDetail.finish') : s === 'IN_PROGRESS' ? t('dashboard.editorialDetail.start') : s === 'REVIEW' ? t('dashboard.editorialDetail.inReview') : t('dashboard.editorialDetail.toDo')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditorialProjectDetail;
