import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../../services/servicesService';
import bookService from '../../services/bookService';
import { useAuth } from '../../context/AuthContext';
import { handleApiError } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/AuthorSpace.css';
import '../../styles/OrgBooks.css';

const OrgPrintRequests = () => {
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    DRAFT: { label: t('dashboard.orgPrint.statusDraft'), bg: '#f1f5f9', color: '#475569' },
    QUOTED: { label: t('dashboard.orgPrint.statusQuoted'), bg: '#dbeafe', color: '#2563eb' },
    CONFIRMED: { label: t('dashboard.orgPrint.statusConfirmed'), bg: '#d1fae5', color: '#059669' },
    PRINTING: { label: t('dashboard.orgPrint.statusPrinting'), bg: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' },
    SHIPPED: { label: t('dashboard.orgPrint.statusShipped'), bg: '#fef3c7', color: '#d97706' },
    DELIVERED: { label: t('dashboard.orgPrint.statusDelivered'), bg: '#d1fae5', color: '#059669' },
    CANCELLED: { label: t('dashboard.orgPrint.statusCancelled'), bg: '#fee2e2', color: '#dc2626' },
  };
  const { id: orgId } = useParams();
  const { organizationMemberships } = useAuth();
  const membership = organizationMemberships.find(m => m.organization_id === Number(orgId));
  const orgType = membership?.organization_type;
  const isImprimerie = orgType === 'IMPRIMERIE';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ book: '', printer: '', quantity: '', delivery_address: '', format_specs: '' });
  const [saving, setSaving] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [books, setBooks] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await servicesService.getPrintRequests();
      setRequests(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRequests();
    if (!isImprimerie) {
      // Éditeur/auteur : charger les imprimeries et ses livres
      servicesService.getPrinters().then(res => setPrinters(Array.isArray(res.data) ? res.data : [])).catch(() => {});
      import('../../services/api').then(({ organizationAPI }) => {
        organizationAPI.listBooks(orgId).then(res => setBooks(Array.isArray(res.data) ? res.data : res.data?.results || [])).catch(() => {});
      });
    }
  }, [orgId, isImprimerie]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        book: form.book,
        printer: form.printer,
        quantity: parseInt(form.quantity),
        delivery_address: form.delivery_address,
        format_specs: form.format_specs ? JSON.parse(form.format_specs) : {},
      };
      await servicesService.createPrintRequest(data);
      toast.success(t('dashboard.orgPrint.requestSent'));
      setShowForm(false);
      setForm({ book: '', printer: '', quantity: '', delivery_address: '', format_specs: '' });
      fetchRequests();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async (reqId, newStatus, extraData = {}) => {
    setUpdatingId(reqId);
    try {
      await servicesService.updatePrintRequestStatus(reqId, { status: newStatus, ...extraData });
      toast.success(t('dashboard.orgPrint.statusUpdated'));
      fetchRequests();
    } catch (err) { toast.error(handleApiError(err)); }
    finally { setUpdatingId(null); }
  };

  const fmtPrice = (v) => v ? Math.round(parseFloat(v)).toLocaleString('fr-FR') : '—';

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const pageTitle = isImprimerie ? t('dashboard.orgPrint.titleReceived') : t('dashboard.orgPrint.titleRequests');
  const pending = requests.filter(r => ['DRAFT', 'QUOTED'].includes(r.status));

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-print" style={{ color: 'var(--color-primary)' }} /> {pageTitle}</h1>
          <p className="author-space__subtitle">{t('dashboard.orgPrint.requestCount', { count: requests.length })}{pending.length > 0 ? ` · ${t('dashboard.orgPrint.pendingCount', { count: pending.length })}` : ''}</p>
        </div>
        {!isImprimerie && !showForm && (
          <button className="as-cta" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus" /> {t('dashboard.orgPrint.newRequest')}
          </button>
        )}
      </div>

      {/* Formulaire (éditeur/auteur uniquement) */}
      {showForm && !isImprimerie && (
        <div className="as-card" style={{ marginBottom: '1.25rem' }}>
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-edit" /> {t('dashboard.orgPrint.formTitle')}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-ui)', fontSize: '0.8rem', fontWeight: 600 }}>
              <i className="fas fa-times" /> {t('common.close')}
            </button>
          </div>
          <div className="as-card__body">
            <form onSubmit={handleSubmit}>
              <div className="ob-form__grid">
                <div className="ob-form__field"><label>{t('dashboard.orgPrint.labelBook')} *</label>
                  <select value={form.book} onChange={e => setForm(f => ({ ...f, book: e.target.value }))} required>
                    <option value="">{t('dashboard.orgPrint.chooseBook')}</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                <div className="ob-form__field"><label>{t('dashboard.orgPrint.labelPrinter')} *</label>
                  <select value={form.printer} onChange={e => setForm(f => ({ ...f, printer: e.target.value }))} required>
                    <option value="">{t('dashboard.orgPrint.choosePrinter')}</option>
                    {printers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                  </select>
                </div>
                <div className="ob-form__field"><label>{t('dashboard.orgPrint.labelQuantity')} *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" required />
                </div>
                <div className="ob-form__field"><label>{t('dashboard.orgPrint.labelAddress')}</label>
                  <input type="text" value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder={t('dashboard.orgPrint.addressPlaceholder')} />
                </div>
              </div>
              <div className="ob-form__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="dashboard-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
                <button type="submit" className="as-cta" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> ...</> : <><i className="fas fa-paper-plane" /> {t('dashboard.orgPrint.send')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste */}
      {requests.length === 0 && !showForm ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-print" /></div>
            <h3>{isImprimerie ? t('dashboard.orgPrint.emptyReceived') : t('dashboard.orgPrint.emptySent')}</h3>
            <p>{isImprimerie ? t('dashboard.orgPrint.emptyReceivedHint') : t('dashboard.orgPrint.emptySentHint')}</p>
          </div>
        </div>
      ) : !showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] || { label: req.status_display, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
            return (
              <div key={req.id} className="as-card">
                <div className="as-card__body" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-heading)' }}>{req.book_title}</strong>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span><i className="fas fa-print" style={{ width: 14 }} /> {isImprimerie ? `De : ${req.requester_name}` : `Imprimerie : ${req.printer_name}`}</span>
                        <span><i className="fas fa-copy" style={{ width: 14 }} /> {req.quantity} exemplaire{req.quantity > 1 ? 's' : ''}</span>
                        {req.unit_price && <span><i className="fas fa-coins" style={{ width: 14 }} /> {fmtPrice(req.unit_price)} F/unité · Total : {fmtPrice(req.total_price)} F</span>}
                        {req.delivery_address && <span><i className="fas fa-map-marker-alt" style={{ width: 14 }} /> {req.delivery_address}</span>}
                      </div>
                    </div>

                    {/* Actions selon le rôle et le statut */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      {/* Imprimerie : proposer un devis */}
                      {isImprimerie && req.status === 'DRAFT' && (
                        <button
                          className="as-cta"
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                          disabled={updatingId === req.id}
                          onClick={() => {
                            const price = prompt('Prix unitaire (FCFA) :');
                            if (price) handleStatusUpdate(req.id, 'QUOTED', { unit_price: price, total_price: parseFloat(price) * req.quantity });
                          }}
                        >
                          <i className="fas fa-calculator" /> Chiffrer
                        </button>
                      )}
                      {/* Imprimerie : confirmer l'impression */}
                      {isImprimerie && req.status === 'CONFIRMED' && (
                        <button className="as-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} disabled={updatingId === req.id} onClick={() => handleStatusUpdate(req.id, 'PRINTING')}>
                          <i className="fas fa-play" /> Lancer l'impression
                        </button>
                      )}
                      {/* Imprimerie : marquer expédié */}
                      {isImprimerie && req.status === 'PRINTING' && (
                        <button className="as-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} disabled={updatingId === req.id} onClick={() => handleStatusUpdate(req.id, 'SHIPPED')}>
                          <i className="fas fa-truck" /> Expédier
                        </button>
                      )}
                      {/* Éditeur : confirmer le devis */}
                      {!isImprimerie && req.status === 'QUOTED' && (
                        <>
                          <button className="as-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={updatingId === req.id} onClick={() => handleStatusUpdate(req.id, 'CONFIRMED')}>
                            <i className="fas fa-check" /> Accepter
                          </button>
                          <button className="dashboard-btn" style={{ fontSize: '0.8rem' }} disabled={updatingId === req.id} onClick={() => handleStatusUpdate(req.id, 'CANCELLED')}>
                            Refuser
                          </button>
                        </>
                      )}
                      {/* Éditeur : confirmer réception */}
                      {!isImprimerie && req.status === 'SHIPPED' && (
                        <button className="as-cta" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={updatingId === req.id} onClick={() => handleStatusUpdate(req.id, 'DELIVERED')}>
                          <i className="fas fa-check-circle" /> Confirmer réception
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgPrintRequests;
