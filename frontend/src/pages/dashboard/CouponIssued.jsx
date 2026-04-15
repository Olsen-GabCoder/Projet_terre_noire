import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../../services/api';
import useEmitterContext from '../../hooks/useEmitterContext';
import EmitterSelector from '../../components/coupons/EmitterSelector';

const FILTERS = ['', 'SENT', 'USED', 'EXPIRED', 'REVOKED', 'FAILED'];

const CouponIssued = () => {
  const { t } = useTranslation();
  const emitter = useEmitterContext();
  const { emitterType, activeOrgId, canEmit, loading: emitterLoading } = emitter;

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, used: 0, rate: 0 });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const fetchCoupons = (status) => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    couponAPI.getMyIssued(params, emitterType, activeOrgId)
      .then(({ data }) => {
        const list = data.results || data || [];
        setCoupons(list);
        const total = list.length;
        const used = list.filter((c) => c.status === 'USED').length;
        setStats({ total, used, rate: total > 0 ? Math.round((used / total) * 100) : 0 });
      })
      .catch((err) => {
        setCoupons([]);
        const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
        setToast(msg);
        setToastType('error');
      })
      .finally(() => setLoading(false));
  };

  // Reset + refetch on context change
  useEffect(() => {
    if (emitterLoading || !canEmit) return;
    setFilter('');
    setCoupons([]);
    fetchCoupons('');
  }, [emitterType, activeOrgId, emitterLoading, canEmit]);

  const handleRetry = (id) => {
    setConfirmState({
      show: true,
      message: t('coupons.issued.retryConfirm'),
      onConfirm: async () => {
        setConfirmState({ show: false, message: '', onConfirm: null });
        try {
          await couponAPI.retry(id, emitterType, activeOrgId);
          setToast(t('coupons.issued.retrySuccess'));
          setToastType('success');
          setTimeout(() => setToast(null), 4000);
          fetchCoupons(filter);
        } catch (err) {
          const msg = err?.response?.data?.error || err?.response?.data?.detail || t('coupons.issued.retryError');
          setToast(msg);
          setToastType('error');
          setTimeout(() => setToast(null), 4000);
        }
      },
    });
  };

  const handleRevoke = (id) => {
    setConfirmState({
      show: true,
      message: t('coupons.issued.revokeConfirm'),
      onConfirm: async () => {
        setConfirmState({ show: false, message: '', onConfirm: null });
        try {
          await couponAPI.revoke(id, emitterType, activeOrgId);
          fetchCoupons(filter);
        } catch (err) {
          const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Erreur lors de la révocation');
          setToast(msg);
          setToastType('error');
        }
      },
    });
  };

  const discountLabel = (c) => {
    if (c.discount_type === 'PERCENT') return `-${parseFloat(c.discount_value)}%`;
    if (c.discount_type === 'FIXED') return `-${parseInt(c.discount_value)} FCFA`;
    return t('coupons.type.FREE_SHIPPING');
  };

  const badgeStyle = (status) => {
    const map = {
      SENT: { background: 'rgba(91,94,234,0.12)', color: '#5b5eea' },
      USED: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
      EXPIRED: { background: 'rgba(107,114,128,0.1)', color: '#6b7280' },
      REVOKED: { background: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      PENDING: { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      FAILED: { background: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    };
    return { ...map[status] || map.SENT, padding: '3px 12px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 };
  };

  if (emitterLoading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  if (!canEmit) {
    return (
      <div>
        <div className="dashboard-home__header">
          <h1>{t('coupons.issued.title')}</h1>
        </div>
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <i className="fas fa-ban" style={{ fontSize: '2.5rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-heading)' }}>{t('coupons.emitterSelector.noContext.title')}</h3>
          <p className="text-muted">{t('coupons.emitterSelector.noContext.desc')}</p>
        </div>
      </div>
    );
  }

  const toastNode = toast && (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: toastType === 'error' ? 'var(--color-error, #ef4444)' : 'var(--color-success, #10b981)',
      color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10,
      fontSize: '0.85rem', fontWeight: 600, zIndex: 9999,
      boxShadow: toastType === 'error' ? '0 4px 16px rgba(239,68,68,0.3)' : '0 4px 16px rgba(16,185,129,0.3)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <i className={toastType === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} /> {toast}
    </div>
  );

  return (
    <div>
      <div className="dashboard-home__header">
        <h1>{t('coupons.issued.title')}</h1>
        <p className="dashboard-home__subtitle">Suivez les coupons envoyés à vos clients et leur utilisation.</p>
      </div>

      <EmitterSelector {...emitter} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: t('coupons.issued.stats.total'), value: stats.total, icon: 'fas fa-ticket-alt' },
          { label: t('coupons.issued.stats.used'), value: stats.used, icon: 'fas fa-check-circle' },
          { label: t('coupons.issued.stats.rate'), value: `${stats.rate}%`, icon: 'fas fa-chart-line' },
        ].map((s, i) => (
          <div key={i} className="dashboard-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <i className={s.icon} style={{ fontSize: '1.2rem', color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'block' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map((s) => (
          <button
            key={s}
            className={`dashboard-btn ${filter === s ? 'dashboard-btn--primary' : ''}`}
            onClick={() => setFilter(s)}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
          >
            {s ? t(`coupons.status.${s}`) : t('coupons.received.filter.all')}
          </button>
        ))}
      </div>

      {coupons.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <i className="fas fa-history" style={{ fontSize: '2rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-heading)' }}>{t('coupons.issued.empty')}</h3>
          <p className="text-muted">{t('coupons.issued.emptyDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {coupons.map((c) => {
            const accentHex = c.template_accent_color || '#5b5eea';
            const r = parseInt(accentHex.slice(1, 3), 16);
            const g = parseInt(accentHex.slice(3, 5), 16);
            const b = parseInt(accentHex.slice(5, 7), 16);
            const bgAlpha = `rgba(${r},${g},${b},0.1)`;
            return (
            <div key={c.id} className="dashboard-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${accentHex}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {/* Icon template */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: bgAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: accentHex, flexShrink: 0 }}>
                  <i className={c.template_icon || 'fas fa-ticket-alt'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.88rem', letterSpacing: '0.5px' }}>{c.code}</strong>
                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: bgAlpha, color: accentHex }}>
                      {discountLabel(c)}
                    </span>
                    <span style={badgeStyle(c.status)}>{t(`coupons.status.${c.status}`)}</span>
                  </div>
                  {(c.template_commercial_title || c.template_name) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', marginTop: 2 }}>
                      <i className="fas fa-clone" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }} />
                      {c.template_commercial_title || c.template_name}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>
                <span><i className="fas fa-envelope" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }} />{c.recipient_email}</span>
                {c.used_by_name && <span><i className="fas fa-user-check" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }} />{c.used_by_name}</span>}
                <span><i className="fas fa-calendar" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }} />{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(c.status === 'SENT' || c.status === 'PENDING') && (
                  <button className="dashboard-btn" onClick={() => handleRevoke(c.id)} style={{ fontSize: '0.75rem', color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <i className="fas fa-ban" /> {t('coupons.issued.revoke')}
                  </button>
                )}
                {c.status === 'FAILED' && (
                  <button className="dashboard-btn" onClick={() => handleRetry(c.id)} style={{ fontSize: '0.75rem', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)' }}>
                    <i className="fas fa-redo" /> {t('coupons.issued.retry')}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      {/* Modal de confirmation */}
      {confirmState.show && (
        <div
          onClick={() => setConfirmState({ show: false, message: '', onConfirm: null })}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            className="dashboard-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '1.75rem', maxWidth: 400, width: '100%', borderRadius: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '1.1rem', flexShrink: 0 }}>
                <i className="fas fa-ban" />
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-heading)', lineHeight: 1.4 }}>
                {confirmState.message}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="dashboard-btn" onClick={() => setConfirmState({ show: false, message: '', onConfirm: null })}>
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                className="dashboard-btn"
                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                onClick={confirmState.onConfirm}
              >
                <i className="fas fa-ban" style={{ marginRight: 6 }} />
                {t('coupons.issued.revoke')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
};

export default CouponIssued;
