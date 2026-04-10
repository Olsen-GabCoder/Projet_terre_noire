import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';

const STATUS_CONFIG = {
  SUBMITTED: { labelKey: 'dashboard.proRequests.statusReceived', bg: '#fef3c7', color: '#d97706', icon: 'fas fa-inbox' },
  QUOTED: { labelKey: 'dashboard.proRequests.statusQuoted', bg: '#dbeafe', color: '#2563eb', icon: 'fas fa-file-invoice' },
  ACCEPTED: { labelKey: 'dashboard.proRequests.statusAccepted', bg: '#d1fae5', color: '#059669', icon: 'fas fa-check' },
  IN_PROGRESS: { labelKey: 'dashboard.proRequests.statusInProgress', bg: 'rgba(99,102,241,0.1)', color: '#6366f1', icon: 'fas fa-spinner' },
  COMPLETED: { labelKey: 'dashboard.proRequests.statusCompleted', bg: '#d1fae5', color: '#059669', icon: 'fas fa-check-double' },
  CANCELLED: { labelKey: 'dashboard.proRequests.statusCancelled', bg: '#fee2e2', color: '#dc2626', icon: 'fas fa-ban' },
  REJECTED: { labelKey: 'dashboard.proRequests.statusRejected', bg: '#fee2e2', color: '#dc2626', icon: 'fas fa-times' },
};

const PAYMENT_OPTIONS = [
  { value: '100_UPFRONT', labelKey: 'dashboard.proRequests.pay100' },
  { value: '50_50', labelKey: 'dashboard.proRequests.pay5050' },
  { value: '30_70', labelKey: 'dashboard.proRequests.pay3070' },
  { value: 'ON_DELIVERY', labelKey: 'dashboard.proRequests.payOnDelivery' },
];

const REPORTING_OPTIONS = [
  { value: 'EACH_MILESTONE', labelKey: 'dashboard.proRequests.reportMilestone' },
  { value: 'WEEKLY', labelKey: 'dashboard.proRequests.reportWeekly' },
  { value: 'BIWEEKLY', labelKey: 'dashboard.proRequests.reportBiweekly' },
  { value: 'ON_COMPLETION', labelKey: 'dashboard.proRequests.reportCompletion' },
];

const ProRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [quoteForm, setQuoteForm] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await servicesService.getRequests({ role: 'provider' });
      setRequests(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => {
    if (filter === 'pending') return r.status === 'SUBMITTED';
    if (filter === 'quoted') return r.status === 'QUOTED';
    if (filter === 'active') return ['ACCEPTED', 'IN_PROGRESS'].includes(r.status);
    return true;
  });

  const openQuoteForm = (req) => {
    const defaultValid = new Date();
    defaultValid.setDate(defaultValid.getDate() + 15);
    setQuoteForm({
      requestId: req.id,
      price: req.budget_max || req.budget_min || '',
      turnaround_days: '',
      scope_of_work: '',
      methodology: '',
      revision_rounds: 2,
      payment_terms: '50_50',
      reporting_frequency: 'BIWEEKLY',
      exclusions: '',
      message: '',
      valid_until: defaultValid.toISOString().slice(0, 10),
    });
    setMilestones([{ title: '', days: '', deliverable: '' }]);
  };

  const addMilestone = () => setMilestones([...milestones, { title: '', days: '', deliverable: '' }]);
  const removeMilestone = (i) => setMilestones(milestones.filter((_, idx) => idx !== i));
  const updateMilestone = (i, field, value) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    if (!quoteForm) return;
    setSubmitting(true);
    try {
      const validMilestones = milestones.filter(m => m.title.trim());
      await servicesService.createQuote(quoteForm.requestId, {
        request: quoteForm.requestId,
        price: parseFloat(quoteForm.price),
        turnaround_days: parseInt(quoteForm.turnaround_days),
        scope_of_work: quoteForm.scope_of_work,
        methodology: quoteForm.methodology,
        milestones: validMilestones.map(m => ({ title: m.title, days: parseInt(m.days) || 0, deliverable: m.deliverable })),
        revision_rounds: parseInt(quoteForm.revision_rounds),
        payment_terms: quoteForm.payment_terms,
        reporting_frequency: quoteForm.reporting_frequency,
        exclusions: quoteForm.exclusions,
        message: quoteForm.message,
        valid_until: new Date(quoteForm.valid_until).toISOString(),
      });
      toast.success(t('dashboard.proRequests.quoteSent'));
      setQuoteForm(null);
      setMilestones([]);
      fetchRequests();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSubmitting(false); }
  };

  const handleDownloadPdf = async (quoteId) => {
    setDownloadingPdf(quoteId);
    try {
      await servicesService.downloadQuotePDF(quoteId);
    } catch (err) { toast.error(handleApiError(err)); }
    setDownloadingPdf(null);
  };

  const pendingCount = requests.filter(r => r.status === 'SUBMITTED').length;
  const quotedCount = requests.filter(r => r.status === 'QUOTED').length;
  const activeCount = requests.filter(r => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length;

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title"><i className="fas fa-inbox" style={{ color: '#f59e0b' }} /> {t('dashboard.proRequests.title')}</h1>
        <p className="author-space__subtitle">{t('dashboard.proRequests.count', { count: requests.length })}</p>
      </div>

      <div className="ob-toolbar">
        {[
          { key: 'pending', label: `${t('dashboard.proRequests.filterPending')} (${pendingCount})`, icon: 'fas fa-clock' },
          { key: 'quoted', label: `${t('dashboard.proRequests.filterQuoted')} (${quotedCount})`, icon: 'fas fa-file-invoice' },
          { key: 'active', label: `${t('dashboard.proRequests.filterActive')} (${activeCount})`, icon: 'fas fa-play' },
          { key: 'all', label: t('dashboard.proRequests.filterAll'), icon: 'fas fa-list' },
        ].map(f => (
          <button key={f.key} className={`dashboard-btn ${filter === f.key ? 'dashboard-btn--primary' : ''}`} onClick={() => setFilter(f.key)} style={{ fontSize: '0.8rem' }}>
            <i className={f.icon} aria-hidden="true" /> {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="as-card"><div className="as-card__body as-empty">
          <div className="as-empty__icon"><i className="fas fa-inbox" /></div>
          <h3>{t('dashboard.proRequests.empty')}</h3>
          <p>{t('dashboard.proRequests.emptyDesc')}</p>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || { labelKey: '', bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)', icon: 'fas fa-circle' };
            const isQuoteOpen = quoteForm?.requestId === req.id;
            const isExpanded = expandedId === req.id;
            return (
              <div key={req.id} className="as-card">
                <div className="as-card__body" style={{ padding: '1.25rem' }}>

                  {/* ── Header ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-heading)' }}>{req.title}</strong>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                          <i className={cfg.icon} aria-hidden="true" /> {t(cfg.labelKey)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted-ui)', display: 'flex', flexWrap: 'wrap', gap: '0.15rem 1rem' }}>
                        <span><i className="fas fa-user" style={{ width: 14 }} /> {req.client_name}</span>
                        {req.budget_min && <span><i className="fas fa-coins" style={{ width: 14 }} /> {Math.round(req.budget_min).toLocaleString('fr-FR')} — {Math.round(req.budget_max).toLocaleString('fr-FR')} FCFA</span>}
                        {req.page_count && <span><i className="fas fa-file-alt" style={{ width: 14 }} /> {req.page_count} pages</span>}
                        {req.word_count && <span><i className="fas fa-font" style={{ width: 14 }} /> {parseInt(req.word_count).toLocaleString('fr-FR')} {t('dashboard.proRequests.words')}</span>}
                        <span><i className="fas fa-calendar" style={{ width: 14 }} /> {new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {/* Download quote PDF if already quoted */}
                      {req.quotes_count > 0 && (
                        <button className="dashboard-btn" onClick={() => handleDownloadPdf(req.quotes?.[0]?.id || req.id)} disabled={downloadingPdf === req.id} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                          <i className={downloadingPdf === req.id ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'} aria-hidden="true" /> PDF
                        </button>
                      )}
                      <button className="dashboard-btn" onClick={() => setExpandedId(isExpanded ? null : req.id)} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} aria-hidden="true" /> {isExpanded ? t('dashboard.proRequests.collapse') : t('dashboard.proRequests.details')}
                      </button>
                      {req.status === 'SUBMITTED' && !isQuoteOpen && (
                        <button className="as-cta" onClick={() => { setExpandedId(req.id); openQuoteForm(req); }} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                          <i className="fas fa-paper-plane" aria-hidden="true" /> {t('dashboard.proRequests.sendQuote')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded details ── */}
                  {isExpanded && !isQuoteOpen && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-card)' }}>
                      {req.description && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{t('dashboard.proRequests.description')}</h4>
                          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{req.description}</p>
                        </div>
                      )}
                      {req.requirements && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{t('dashboard.proRequests.requirements')}</h4>
                          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{req.requirements}</p>
                        </div>
                      )}
                      {req.file && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{t('dashboard.proRequests.attachedFile')}</h4>
                          <a href={req.file} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: 10, background: 'var(--color-bg-section-alt)', border: '1px solid var(--color-border-card)', textDecoration: 'none', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                            <i className="fas fa-file-download" aria-hidden="true" /> {t('dashboard.proRequests.downloadFile')} <span style={{ color: 'var(--color-text-muted-ui)', fontWeight: 400, fontSize: '0.78rem' }}>({req.file.split('/').pop()})</span>
                          </a>
                        </div>
                      )}
                      {req.client_info && (
                        <div>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{t('dashboard.proRequests.clientInfo')}</h4>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-body)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span><i className="fas fa-user" style={{ width: 16, color: 'var(--color-primary)' }} /> {req.client_info.full_name}</span>
                            {req.client_info.email && <span><i className="fas fa-envelope" style={{ width: 16, color: 'var(--color-primary)' }} /> {req.client_info.email}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════
                      FORMULAIRE DE DEVIS ULTRA-PROFESSIONNEL
                      ═══════════════════════════════════════════ */}
                  {isQuoteOpen && (
                    <form onSubmit={submitQuote} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--color-primary)' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <i className="fas fa-file-invoice" style={{ color: 'var(--color-primary)' }} /> {t('dashboard.proRequests.quoteFormTitle')}
                      </h3>

                      {/* Section 1 — Tarification & délai */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                          <i className="fas fa-coins" /> {t('dashboard.proRequests.sectionPricing')}
                        </h4>
                        <div className="ob-form__grid">
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quotePrice')} *</label>
                            <input type="number" value={quoteForm.price} onChange={e => setQuoteForm(f => ({ ...f, price: e.target.value }))} min="0" required placeholder="0" />
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quoteTurnaround')} *</label>
                            <input type="number" value={quoteForm.turnaround_days} onChange={e => setQuoteForm(f => ({ ...f, turnaround_days: e.target.value }))} min="1" required placeholder="7" />
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quotePaymentTerms')}</label>
                            <select value={quoteForm.payment_terms} onChange={e => setQuoteForm(f => ({ ...f, payment_terms: e.target.value }))}>
                              {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                            </select>
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quoteValidUntil')} *</label>
                            <input type="date" value={quoteForm.valid_until} onChange={e => setQuoteForm(f => ({ ...f, valid_until: e.target.value }))} required min={new Date().toISOString().slice(0, 10)} />
                          </div>
                        </div>
                      </div>

                      {/* Section 2 — Périmètre */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                          <i className="fas fa-clipboard-list" /> {t('dashboard.proRequests.sectionScope')}
                        </h4>
                        <div className="ob-form__grid">
                          <div className="ob-form__field ob-form__field--full">
                            <label>{t('dashboard.proRequests.quoteScope')}</label>
                            <textarea rows={3} value={quoteForm.scope_of_work} onChange={e => setQuoteForm(f => ({ ...f, scope_of_work: e.target.value }))} placeholder={t('dashboard.proRequests.quoteScopePlaceholder')} />
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quoteRevisions')}</label>
                            <input type="number" value={quoteForm.revision_rounds} onChange={e => setQuoteForm(f => ({ ...f, revision_rounds: e.target.value }))} min="0" max="10" />
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quoteExclusions')}</label>
                            <textarea rows={2} value={quoteForm.exclusions} onChange={e => setQuoteForm(f => ({ ...f, exclusions: e.target.value }))} placeholder={t('dashboard.proRequests.quoteExclusionsPlaceholder')} />
                          </div>
                        </div>
                      </div>

                      {/* Section 3 — Méthodologie */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                          <i className="fas fa-cogs" /> {t('dashboard.proRequests.sectionMethodology')}
                        </h4>
                        <div className="ob-form__grid">
                          <div className="ob-form__field ob-form__field--full">
                            <label>{t('dashboard.proRequests.quoteMethodology')}</label>
                            <textarea rows={3} value={quoteForm.methodology} onChange={e => setQuoteForm(f => ({ ...f, methodology: e.target.value }))} placeholder={t('dashboard.proRequests.quoteMethodologyPlaceholder')} />
                          </div>
                          <div className="ob-form__field">
                            <label>{t('dashboard.proRequests.quoteReporting')}</label>
                            <select value={quoteForm.reporting_frequency} onChange={e => setQuoteForm(f => ({ ...f, reporting_frequency: e.target.value }))}>
                              {REPORTING_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 4 — Jalons / Sprints */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span><i className="fas fa-flag-checkered" /> {t('dashboard.proRequests.sectionMilestones')}</span>
                          <button type="button" onClick={addMilestone} className="dashboard-btn" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                            <i className="fas fa-plus" aria-hidden="true" /> {t('dashboard.proRequests.addMilestone')}
                          </button>
                        </h4>
                        {milestones.map((m, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                            <div className="ob-form__field">
                              {i === 0 && <label>{t('dashboard.proRequests.milestoneTitle')}</label>}
                              <input value={m.title} onChange={e => updateMilestone(i, 'title', e.target.value)} placeholder={`${t('dashboard.proRequests.milestoneStep')} ${i + 1}`} />
                            </div>
                            <div className="ob-form__field">
                              {i === 0 && <label>{t('dashboard.proRequests.milestoneDays')}</label>}
                              <input type="number" value={m.days} onChange={e => updateMilestone(i, 'days', e.target.value)} min="1" placeholder="j" />
                            </div>
                            <div className="ob-form__field">
                              {i === 0 && <label>{t('dashboard.proRequests.milestoneDeliverable')}</label>}
                              <input value={m.deliverable} onChange={e => updateMilestone(i, 'deliverable', e.target.value)} placeholder={t('dashboard.proRequests.milestoneDeliverablePlaceholder')} />
                            </div>
                            <button type="button" onClick={() => removeMilestone(i)} style={{ width: 32, height: 32, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Section 5 — Message */}
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                          <i className="fas fa-comment-alt" /> {t('dashboard.proRequests.sectionMessage')}
                        </h4>
                        <div className="ob-form__grid">
                          <div className="ob-form__field ob-form__field--full">
                            <textarea rows={2} value={quoteForm.message} onChange={e => setQuoteForm(f => ({ ...f, message: e.target.value }))} placeholder={t('dashboard.proRequests.quoteMessagePlaceholder')} />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'var(--color-bg-section-alt)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fas fa-info-circle" style={{ color: 'var(--color-primary)' }} />
                        {t('dashboard.proRequests.quotePdfNote')}
                      </div>

                      {/* Actions */}
                      <div className="ob-form__actions">
                        <button type="button" className="dashboard-btn" onClick={() => { setQuoteForm(null); setMilestones([]); }}>{t('common.cancel')}</button>
                        <button type="submit" className="as-cta" disabled={submitting}>
                          {submitting
                            ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> {t('dashboard.proRequests.sending')}</>
                            : <><i className="fas fa-paper-plane" aria-hidden="true" /> {t('dashboard.proRequests.submitQuote')}</>
                          }
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProRequests;
