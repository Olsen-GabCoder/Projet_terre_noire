import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../services/api';

const STATUS_FILTER_MAP = { all: '', active: 'SENT', used: 'USED', expired: 'EXPIRED' };

const MyCoupons = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (STATUS_FILTER_MAP[filter]) params.status = STATUS_FILTER_MAP[filter];
    couponAPI.getMyReceived(params)
      .then(({ data }) => setCoupons(data.results || data || []))
      .catch((err) => {
        setCoupons([]);
        console.error('Failed to fetch coupons:', err);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const handleUse = (coupon) => {
    localStorage.setItem('pending_coupon_code', coupon.code);
    navigate('/cart');
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
    };
    return { ...map[status] || map.SENT, padding: '3px 12px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, display: 'inline-block' };
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  return (
    <div>
      <div className="dashboard-home__header">
        <h1>{t('coupons.received.title')}</h1>
        <p className="dashboard-home__subtitle">Consultez vos coupons de réduction et utilisez-les dans votre panier.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Object.keys(STATUS_FILTER_MAP).map((key) => (
          <button
            key={key}
            className={`dashboard-btn ${filter === key ? 'dashboard-btn--primary' : ''}`}
            onClick={() => setFilter(key)}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
          >
            {t(`coupons.received.filter.${key}`)}
          </button>
        ))}
      </div>

      {coupons.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <i className="fas fa-ticket-alt" style={{ fontSize: '2rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-heading)' }}>{t('coupons.received.empty')}</h3>
          <p className="text-muted">{t('coupons.received.emptyDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {coupons.map((c) => {
            const accentHex = c.template_accent_color || '#5b5eea';
            const r = parseInt(accentHex.slice(1, 3), 16);
            const g = parseInt(accentHex.slice(3, 5), 16);
            const b = parseInt(accentHex.slice(5, 7), 16);
            const bgAlpha = `rgba(${r},${g},${b},0.1)`;
            const isActive = c.status === 'SENT';
            return (
            <div key={c.id} style={{
              borderRadius: 14, overflow: 'hidden',
              border: `1px solid ${isActive ? `rgba(${r},${g},${b},0.3)` : 'var(--color-border-card)'}`,
              background: 'var(--color-bg-card)',
              boxShadow: isActive ? `0 4px 16px rgba(${r},${g},${b},0.15)` : '0 1px 4px rgba(0,0,0,0.06)',
              opacity: c.status === 'USED' || c.status === 'EXPIRED' || c.status === 'REVOKED' ? 0.7 : 1,
            }}>
              {/* Header coloré */}
              <div style={{ background: `linear-gradient(135deg, ${accentHex}, rgba(${r},${g},${b},0.65))`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#fff', flexShrink: 0 }}>
                  <i className={c.template_icon || 'fas fa-ticket-alt'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {discountLabel(c)}
                  </div>
                  {c.template_commercial_title && (
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', marginTop: 3, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.template_commercial_title}
                    </div>
                  )}
                  {c.template_subtitle && (
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.template_subtitle}
                    </div>
                  )}
                </div>
                <span style={badgeStyle(c.status)}>{t(`coupons.status.${c.status}`)}</span>
              </div>

              {/* Séparateur dentelé */}
              <div style={{ height: 1, background: `repeating-linear-gradient(to right, var(--color-border-card) 0, var(--color-border-card) 6px, transparent 6px, transparent 12px)` }} />

              {/* Corps */}
              <div style={{ padding: '0.9rem 1.25rem' }}>
                {/* Code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <code style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-text-heading)', background: bgAlpha, padding: '3px 10px', borderRadius: 6, border: `1px dashed rgba(${r},${g},${b},0.3)` }}>
                    {c.code}
                  </code>
                </div>
                {/* Meta */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.template_category && (
                    <span style={{ background: bgAlpha, color: accentHex, borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700 }}>
                      {t(`coupons.category.${c.template_category}`)}
                    </span>
                  )}
                  {(c.emitter_name || c.organization_name) && (
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                      <i className="fas fa-store" style={{ marginRight: 3 }} />
                      {c.emitter_name || c.organization_name}
                    </span>
                  )}
                  {c.valid_until && (
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                      <i className="fas fa-clock" style={{ marginRight: 3 }} />
                      Exp. {new Date(c.valid_until).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer action */}
              {isActive && (
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <button
                    className="dashboard-btn dashboard-btn--primary"
                    onClick={() => handleUse(c)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
                  >
                    <i className="fas fa-shopping-cart" style={{ marginRight: 6 }} />
                    {t('coupons.received.apply')}
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCoupons;
