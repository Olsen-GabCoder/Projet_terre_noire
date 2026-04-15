import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../../services/api';
import useEmitterContext from '../../hooks/useEmitterContext';
import EmitterSelector from '../../components/coupons/EmitterSelector';
import '../../styles/CouponSend.css';

const MAX_RECIPIENTS = 20;

// ── Helpers ──

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const discountLabel = (tpl, t) => {
  if (tpl.discount_type === 'PERCENT') return `-${parseFloat(tpl.discount_value)}%`;
  if (tpl.discount_type === 'FIXED') return `-${parseInt(tpl.discount_value)} FCFA`;
  return t('coupons.type.FREE_SHIPPING');
};

// ── Sous-composant : SendPreviewCard ──

const SendPreviewCard = ({ tpl, t }) => {
  const color = tpl.accent_color || '#5b5eea';
  const [r, g, b] = hexToRgb(color);
  const title = tpl.commercial_title || tpl.name;
  const subtitle = tpl.subtitle || '';
  const discount = discountLabel(tpl, t);
  const category = tpl.category !== 'AUTRE' ? t(`coupons.category.${tpl.category}`) : null;

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: `1px solid rgba(${r},${g},${b},0.3)`,
      background: 'var(--color-bg-card)',
      boxShadow: `0 4px 18px rgba(${r},${g},${b},0.15)`,
    }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, rgba(${r},${g},${b},0.7))`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#fff', flexShrink: 0 }}>
          <i className={tpl.icon || 'fas fa-ticket-alt'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.9rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {discount}
        </div>
      </div>
      <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid rgba(${r},${g},${b},0.15)` }}>
        {category && (
          <span style={{ background: `rgba(${r},${g},${b},0.12)`, color, borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
            {category}
          </span>
        )}
        {tpl.first_order_only && (
          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
            <i className="fas fa-star" style={{ marginRight: 3, fontSize: '0.65rem' }} />
            {t('coupons.firstOrderBadge')}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Composant principal ──

const CouponSend = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const emitter = useEmitterContext();
  const {
    emitterType, activeOrgId, canEmit, loading: emitterLoading,
    hasDualContext,
  } = emitter;

  // States
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tab, setTab] = useState('customers');
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [manualEmail, setManualEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customExpiry, setCustomExpiry] = useState('');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
  };

  // Fetch data on context change
  useEffect(() => {
    if (emitterLoading || !canEmit) return;
    couponAPI.getTemplates(emitterType, activeOrgId).then(({ data }) => setTemplates(data || [])).catch((err) => {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    });
    const isProviderContext = emitterType === 'provider_profile';
    const customersFetch = isProviderContext
      ? couponAPI.getServiceCustomers(emitterType, activeOrgId)
      : couponAPI.getVendorCustomers(emitterType, activeOrgId);
    customersFetch.then(({ data }) => setCustomers(data || [])).catch((err) => {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    });
    setSelectedTemplate(null);
    setSelectedEmails(new Set());
    setCustomMessage('');
    setCustomExpiry('');
  }, [emitterType, activeOrgId, emitterLoading, canEmit]);

  // Handlers
  const toggleEmail = (email) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else if (next.size < MAX_RECIPIENTS) next.add(email);
      return next;
    });
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (selectedEmails.size >= MAX_RECIPIENTS) return;
    setSelectedEmails((prev) => new Set(prev).add(email));
    setManualEmail('');
  };

  const removeEmail = (email) => {
    setSelectedEmails((prev) => { const next = new Set(prev); next.delete(email); return next; });
  };

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const payload = { template_id: selectedTemplate.id, recipient_emails: [...selectedEmails], custom_message: customMessage };
      if (customExpiry) payload.custom_expiry_days = parseInt(customExpiry);
      const { data } = await couponAPI.send(payload, emitterType, activeOrgId);
      showToast(t('coupons.send.success', { count: data.count }));
      setTimeout(() => navigate('/dashboard/coupons/issued'), 1500);
    } catch (err) {
      if (err?.response?.status === 429) {
        showToast(t('coupons.send.throttled', 'Limite d\'envoi atteinte, réessayez dans 1 heure'), 'error');
      } else {
        const msg = err?.response?.data?.error
          || err?.response?.data?.detail
          || err?.response?.data?.non_field_errors?.[0]
          || t('common.error', 'Erreur lors de l\'envoi');
        showToast(msg, 'error');
      }
    } finally { setSending(false); }
  };

  const canSend = selectedTemplate && selectedEmails.size > 0 && !sending;
  const accentColor = selectedTemplate?.accent_color || '#5b5eea';
  const [ar, ag, ab] = hexToRgb(accentColor);
  const expiryDays = customExpiry || selectedTemplate?.default_expiry_days || 30;

  // ── Styles ──
  const sectionStyle = {
    padding: '1.25rem', marginBottom: '1rem',
    background: 'var(--color-bg-section-alt)',
    borderRadius: 14,
    border: '1px solid var(--color-border-card)',
  };
  const sectionHeaderStyle = {
    fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-heading)',
    marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
  };
  const helpStyle = {
    fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginBottom: '1rem',
  };
  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8,
    border: '1px solid var(--color-border-card)', fontFamily: 'inherit',
    fontSize: '0.875rem', background: 'var(--color-bg-card)', color: 'var(--color-text-heading)',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em',
    textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: 4,
  };

  const emailsArray = [...selectedEmails];

  if (emitterLoading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;

  if (!canEmit) {
    return (
      <div>
        <div className="dashboard-home__header">
          <h1>{t('coupons.send.title')}</h1>
        </div>
        <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <i className="fas fa-ban" style={{ fontSize: '2.5rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-heading)' }}>{t('coupons.emitterSelector.noContext.title')}</h3>
          <p className="text-muted">{t('coupons.emitterSelector.noContext.desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .cs-layout { display: flex; gap: 1.5rem; align-items: flex-start; }
        .cs-form-col { flex: 1; min-width: 0; }
        .cs-preview-col { width: 320px; flex-shrink: 0; position: sticky; top: calc(var(--header-height, 68px) + 12px); z-index: 10; align-self: flex-start; }
        @media (max-width: 1024px) {
          .cs-layout { flex-direction: column-reverse; }
          .cs-preview-col { width: 100%; position: static; }
        }
        .cs-customer-card {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.85rem; border-radius: 10;
          border: 2px solid var(--color-border-card);
          background: var(--color-bg-card);
          cursor: pointer; transition: border-color 0.15s, background 0.15s;
        }
        .cs-customer-card:hover { background: var(--color-bg-section-alt); }
        .cs-customer-card--selected { border-color: var(--color-primary); background: rgba(91,94,234,0.04); }
        .cs-customer-card--disabled { opacity: 0.45; cursor: not-allowed; }
        .cs-chip-v2 {
          display: inline-flex; align-items: center; gap: 0.3rem;
          background: rgba(91,94,234,0.08); color: var(--color-primary);
          border-radius: 20; padding: 3px 10px; font-size: 0.75rem; font-weight: 600;
          animation: chipIn 0.15s ease;
        }
        .cs-chip-v2 button {
          border: none; background: none; cursor: pointer; color: inherit;
          padding: 0; font-size: 0.9rem; line-height: 1; opacity: 0.6; transition: opacity 0.15s;
        }
        .cs-chip-v2 button:hover { opacity: 1; }
        @keyframes chipIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="dashboard-home__header">
        <h1>{t('coupons.send.title')}</h1>
        <p className="dashboard-home__subtitle">{t('coupons.send.section.templateHelp')}</p>
      </div>

      <EmitterSelector {...emitter} />

      {/* ── Layout 2 colonnes ── */}
      <div className="cs-layout">

        {/* ── Colonne gauche : 3 sections ── */}
        <div className="cs-form-col">

          {/* Section 1 — Template */}
          <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>
              <i className="fas fa-clone" style={{ color: 'var(--color-primary)' }} />
              {t('coupons.send.section.template')}
            </h3>
            <p style={helpStyle}>{t('coupons.send.section.templateHelp')}</p>

            {templates.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderRadius: 10, background: 'var(--color-bg-card)', border: '1px dashed var(--color-border-card)' }}>
                <i className="fas fa-clone" style={{ fontSize: '2rem', color: 'var(--color-gray-300)', marginBottom: '0.75rem', display: 'block' }} />
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: 'var(--color-text-heading)' }}>{t('coupons.send.emptyTemplatesTitle')}</h4>
                <p className="text-muted" style={{ margin: '0 0 1rem', fontSize: '0.82rem' }}>{t('coupons.send.emptyTemplatesDesc')}</p>
                <a href="/dashboard/coupons/templates" className="dashboard-btn dashboard-btn--primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                  <i className="fas fa-book-open" /> {t('coupons.send.emptyTemplatesCTA')}
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {templates.map((tpl) => {
                  const hex = tpl.accent_color || '#5b5eea';
                  const [r, g, b] = hexToRgb(hex);
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const quotaExhausted = tpl.total_quota != null && tpl.quota_used >= tpl.total_quota;
                  const discount = discountLabel(tpl, t);
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => !quotaExhausted && setSelectedTemplate(tpl)}
                      style={{
                        borderRadius: 12, overflow: 'hidden', cursor: quotaExhausted ? 'not-allowed' : 'pointer',
                        border: `2px solid ${isSelected ? hex : 'var(--color-border-card)'}`,
                        opacity: quotaExhausted ? 0.5 : 1,
                        boxShadow: isSelected ? `0 0 0 3px rgba(${r},${g},${b},0.2)` : 'none',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        background: 'var(--color-bg-card)',
                      }}
                    >
                      <div style={{ background: `linear-gradient(135deg, ${hex}, rgba(${r},${g},${b},0.65))`, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#fff', flexShrink: 0 }}>
                          <i className={tpl.icon || 'fas fa-ticket-alt'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{discount}</div>
                        </div>
                        {isSelected && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fas fa-check" style={{ fontSize: '0.65rem', color: '#fff' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-heading)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tpl.commercial_title || tpl.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {tpl.first_order_only && (
                            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 20, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700 }}>
                              {t('coupons.firstOrderBadge')}
                            </span>
                          )}
                          {tpl.total_quota != null && (
                            <span style={{ fontSize: '0.65rem', color: quotaExhausted ? '#ef4444' : 'var(--color-text-muted-ui)', fontWeight: 600 }}>
                              {quotaExhausted ? t('coupons.quota.exhausted') : t('coupons.quota.remaining', { count: tpl.total_quota - tpl.quota_used })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reminder first_order_only */}
            {selectedTemplate?.first_order_only && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', color: '#92400e' }}>
                <i className="fas fa-star" style={{ color: '#d97706' }} />
                <span>{t('coupons.firstOrderBadge')} — {t('coupons.form.firstOrderOnly_help')}</span>
              </div>
            )}
          </div>

          {/* Section 2 — Destinataires */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
                <i className="fas fa-paper-plane" style={{ color: 'var(--color-primary)' }} />
                {t('coupons.send.section.recipients')}
              </h3>
              <span style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: selectedEmails.size >= MAX_RECIPIENTS ? 'var(--color-error)' : selectedEmails.size >= 15 ? '#d97706' : 'var(--color-gray-400)',
              }}>
                <strong>{selectedEmails.size}</strong> / {MAX_RECIPIENTS}
              </span>
            </div>
            <p style={helpStyle}>{t('coupons.send.section.recipientsHelp')}</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className={`dashboard-btn ${tab === 'customers' ? 'dashboard-btn--primary' : ''}`} onClick={() => setTab('customers')} style={{ fontSize: '0.78rem' }}>
                <i className="fas fa-users" /> {t('coupons.send.recipientsFromHistory')}
              </button>
              <button className={`dashboard-btn ${tab === 'manual' ? 'dashboard-btn--primary' : ''}`} onClick={() => setTab('manual')} style={{ fontSize: '0.78rem' }}>
                <i className="fas fa-keyboard" /> {t('coupons.send.recipientsManual')}
              </button>
            </div>

            {tab === 'customers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                {customers.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', borderRadius: 10, background: 'var(--color-bg-card)', border: '1px dashed var(--color-border-card)' }}>
                    <i className="fas fa-users" style={{ fontSize: '1.5rem', color: 'var(--color-gray-300)', marginBottom: '0.5rem', display: 'block' }} />
                    <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.88rem', color: 'var(--color-text-heading)' }}>{t('coupons.send.emptyCustomersTitle')}</h4>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.78rem' }}>{t('coupons.send.emptyCustomersDesc')}</p>
                  </div>
                ) : customers.map((c) => {
                  const isChecked = selectedEmails.has(c.email);
                  const isDisabled = !isChecked && selectedEmails.size >= MAX_RECIPIENTS;
                  return (
                    <div
                      key={c.email}
                      onClick={() => !isDisabled && toggleEmail(c.email)}
                      className={`cs-customer-card${isChecked ? ' cs-customer-card--selected' : ''}${isDisabled ? ' cs-customer-card--disabled' : ''}`}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: isChecked ? 'var(--color-primary)' : 'var(--color-bg-section-alt)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: isChecked ? '#fff' : 'var(--color-text-muted-ui)',
                        transition: 'background 0.15s, color 0.15s',
                      }}>
                        {isChecked ? <i className="fas fa-check" style={{ fontSize: '0.7rem' }} /> : (c.first_name?.[0] || c.email[0]).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>
                          {c.first_name} {c.last_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.email}
                        </div>
                      </div>
                      <span style={{ background: 'rgba(91,94,234,0.08)', color: 'var(--color-primary)', borderRadius: 20, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                        {c.order_count} cmd.
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'manual' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  placeholder={t('coupons.send.emailPlaceholder')}
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualEmail())}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button className="dashboard-btn" onClick={addManualEmail} disabled={selectedEmails.size >= MAX_RECIPIENTS}>
                  <i className="fas fa-plus" style={{ marginRight: 4 }} /> {t('coupons.send.addEmail')}
                </button>
              </div>
            )}

            {/* Chips */}
            {selectedEmails.size > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {emailsArray.map((email) => (
                    <span key={email} className="cs-chip-v2">
                      {email}
                      <button type="button" onClick={() => removeEmail(email)}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>
              {t('coupons.send.maxRecipientsHelp')}
            </small>
          </div>

          {/* Section 3 — Personnaliser */}
          <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>
              <i className="fas fa-edit" style={{ color: 'var(--color-primary)' }} />
              {t('coupons.send.section.customize')}
            </h3>
            <p style={helpStyle}>{t('coupons.send.section.customizeHelp')}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>{t('coupons.send.customMessage')}</label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={t('coupons.send.customMessagePlaceholder')}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>
                  {t('coupons.send.customMessageHelp')}
                </small>
              </div>
              <div>
                <label style={labelStyle}>{t('coupons.send.customExpiry')}</label>
                <input
                  type="number" min="1" max="365"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  placeholder={selectedTemplate ? String(selectedTemplate.default_expiry_days) : '30'}
                  style={{ ...inputStyle, maxWidth: 200 }}
                />
                <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>
                  {t('coupons.send.customExpiryHelp')}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne droite : preview sticky ── */}
        <div className="cs-preview-col">
          <div style={{ ...labelStyle, marginBottom: 8 }}>
            <i className="fas fa-eye" style={{ marginRight: 6 }} />{t('coupons.form.preview')}
          </div>

          {selectedTemplate ? (
            <SendPreviewCard tpl={selectedTemplate} t={t} />
          ) : (
            <div style={{ borderRadius: 14, border: '1px dashed var(--color-border-card)', background: 'var(--color-bg-section-alt)', padding: '2rem 1.25rem', textAlign: 'center' }}>
              <i className="fas fa-eye" style={{ fontSize: '1.5rem', color: 'var(--color-gray-300)', marginBottom: '0.5rem', display: 'block' }} />
              <p className="text-muted" style={{ margin: 0, fontSize: '0.82rem' }}>{t('coupons.send.preview.placeholder')}</p>
            </div>
          )}

          {/* Mini-recap */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted-ui)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-users" style={{ fontSize: '0.7rem', width: 14 }} />
              <span style={{ fontWeight: selectedEmails.size > 0 ? 600 : 400, color: selectedEmails.size > 0 ? 'var(--color-text-heading)' : undefined }}>
                {t('coupons.send.preview.recipientsCount', { count: selectedEmails.size })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-clock" style={{ fontSize: '0.7rem', width: 14 }} />
              {t('coupons.send.preview.expiry', { days: expiryDays })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-envelope" style={{ fontSize: '0.7rem', width: 14 }} />
              {customMessage.trim() ? t('coupons.send.preview.customMessageYes') : t('coupons.send.preview.customMessageNo')}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSend}
            style={{
              marginTop: '1.25rem', width: '100%', height: 44,
              borderRadius: 10, border: 'none', fontFamily: 'inherit',
              fontSize: '0.88rem', fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed',
              background: canSend ? accentColor : 'var(--color-gray-200)',
              color: canSend ? '#fff' : 'var(--color-gray-400)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s, opacity 0.15s',
              opacity: canSend ? 1 : 0.7,
            }}
          >
            <i className="fas fa-paper-plane" />
            {t('coupons.send.confirmSend', { count: selectedEmails.size })}
          </button>
        </div>
      </div>

      {/* ── Modal de confirmation enrichie ── */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            className="dashboard-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '1.75rem', maxWidth: 480, width: '100%', borderRadius: 14 }}
          >
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
              {t('coupons.send.confirmTitle')}
            </h3>

            {/* Mini preview */}
            {selectedTemplate && (
              <div style={{ marginBottom: '1rem' }}>
                <SendPreviewCard tpl={selectedTemplate} t={t} />
              </div>
            )}

            {/* Recipients chips */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted-ui)', marginBottom: 6, letterSpacing: '0.04em' }}>
                {t('coupons.send.recipients')}
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {emailsArray.slice(0, 10).map((email) => (
                  <span key={email} style={{ background: 'rgba(91,94,234,0.08)', color: 'var(--color-primary)', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                    {email}
                  </span>
                ))}
                {emailsArray.length > 10 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted-ui)', fontWeight: 600, padding: '2px 6px' }}>
                    {t('coupons.send.andMore', { count: emailsArray.length - 10 })}
                  </span>
                )}
              </div>
            </div>

            {/* Recap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', marginBottom: '1rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'var(--color-bg-section-alt)' }}>
              <span><i className="fas fa-clock" style={{ marginRight: 6, fontSize: '0.7rem' }} />{t('coupons.send.preview.expiry', { days: expiryDays })}</span>
              <span><i className="fas fa-envelope" style={{ marginRight: 6, fontSize: '0.7rem' }} />{customMessage.trim() ? `"${customMessage.trim().slice(0, 60)}${customMessage.trim().length > 60 ? '...' : ''}"` : t('coupons.send.preview.customMessageNo')}</span>
            </div>

            {/* Warning */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.78rem', color: '#92400e', marginBottom: '1.25rem' }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
              <span>{t('coupons.send.confirmWarning')}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="dashboard-btn" onClick={() => setShowConfirm(false)}>
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none', fontFamily: 'inherit',
                  fontSize: '0.88rem', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
                  background: accentColor, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {sending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                {t('coupons.send.confirmSend', { count: selectedEmails.size })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="cs-toast" onAnimationEnd={() => setToast(null)} style={toastType === 'error' ? { background: 'var(--color-error, #ef4444)' } : undefined}>
          <i className={toastType === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} /> {toast}
        </div>
      )}
    </div>
  );
};

export default CouponSend;
