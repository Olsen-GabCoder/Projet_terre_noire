import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../../services/api';
import useEmitterContext from '../../hooks/useEmitterContext';
import EmitterSelector from '../../components/coupons/EmitterSelector';

// ── Constantes (miroir des palettes backend) ──

const ICON_PALETTE = [
  'fas fa-ticket-alt', 'fas fa-gift', 'fas fa-star', 'fas fa-heart',
  'fas fa-birthday-cake', 'fas fa-fire', 'fas fa-bolt', 'fas fa-tag',
  'fas fa-shopping-bag', 'fas fa-crown', 'fas fa-bookmark', 'fas fa-trophy',
  'fas fa-medal', 'fas fa-hand-holding-heart', 'fas fa-percentage',
  'fas fa-truck', 'fas fa-clock', 'fas fa-calendar-alt', 'fas fa-certificate',
  'fas fa-award',
];

const COLOR_PALETTE = [
  '#5b5eea', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1',
];

const DISCOUNT_TYPES = ['PERCENT', 'FIXED', 'FREE_SHIPPING'];
const CATEGORIES = ['BIENVENUE', 'FIDELITE', 'SAISONNIER', 'REACTIVATION', 'ANNIVERSAIRE', 'FLASH', 'PARRAINAGE', 'PROMO_PRODUIT', 'DESTOCKAGE', 'AUTRE'];

const emptyForm = () => ({
  name: '',
  commercial_title: '',
  subtitle: '',
  marketing_description: '',
  category: 'AUTRE',
  tags: [],
  icon: 'fas fa-ticket-alt',
  accent_color: '#5b5eea',
  discount_type: 'PERCENT',
  discount_value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  first_order_only: false,
  min_customer_age_days: '',
  default_expiry_days: '30',
  valid_from: '',
  valid_until: '',
  total_quota: '',
  per_customer_limit: '1',
  is_published: true,
});

// ── Helpers ──

const discountLabel = (tpl, t) => {
  if (tpl.discount_type === 'PERCENT') return `-${parseFloat(tpl.discount_value)}%`;
  if (tpl.discount_type === 'FIXED') return `-${parseInt(tpl.discount_value)} FCFA`;
  return t('coupons.type.FREE_SHIPPING');
};

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const cardEntryStyle = (index) => ({
  animation: 'fadeSlideUp 0.28s ease both',
  animationDelay: `${index * 0.04}s`,
});

// ── Sous-composant : IconPicker ──

const IconPicker = ({ value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '0.4rem' }}>
    {ICON_PALETTE.map((icon) => (
      <button
        key={icon}
        type="button"
        title={icon}
        onClick={() => onChange(icon)}
        style={{
          width: 36, height: 36, borderRadius: 8, border: '2px solid',
          borderColor: value === icon ? 'var(--color-primary)' : 'var(--color-border-card)',
          background: value === icon ? 'rgba(91,94,234,0.1)' : 'var(--color-bg-card)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', color: value === icon ? 'var(--color-primary)' : 'var(--color-text-muted-ui)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <i className={icon} />
      </button>
    ))}
  </div>
);

// ── Sous-composant : ColorPicker ──

const ColorPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
    {COLOR_PALETTE.map((color) => (
      <button
        key={color}
        type="button"
        title={color}
        onClick={() => onChange(color)}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: '3px solid',
          borderColor: value === color ? 'var(--color-text-heading)' : 'transparent',
          background: color, cursor: 'pointer', outline: value === color ? `2px solid ${color}` : 'none',
          outlineOffset: 2, transition: 'border-color 0.15s',
        }}
      />
    ))}
  </div>
);

// ── Sous-composant : PreviewCard ──

const PreviewCard = ({ form, t }) => {
  const color = form.accent_color || '#5b5eea';
  const title = form.commercial_title || form.name || t('coupons.form.preview');
  const subtitle = form.subtitle || '';
  const discount = form.discount_type === 'PERCENT'
    ? (form.discount_value ? `-${parseFloat(form.discount_value)}%` : '')
    : form.discount_type === 'FIXED'
      ? (form.discount_value ? `-${parseInt(form.discount_value)} FCFA` : '')
      : t('coupons.type.FREE_SHIPPING');
  const category = form.category !== 'AUTRE' ? t(`coupons.category.${form.category}`) : null;

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${hexToRgba(color, 0.3)}`,
      background: 'var(--color-bg-card)',
      boxShadow: `0 4px 18px ${hexToRgba(color, 0.15)}`,
    }}>
      {/* Header coloré */}
      <div style={{ background: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.7)})`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#fff', flexShrink: 0 }}>
          <i className={form.icon || 'fas fa-ticket-alt'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
        </div>
        {discount && (
          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.9rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {discount}
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${hexToRgba(color, 0.15)}` }}>
        {category && (
          <span style={{ background: hexToRgba(color, 0.12), color, borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
            {category}
          </span>
        )}
        {form.first_order_only && (
          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
            <i className="fas fa-star" style={{ marginRight: 3, fontSize: '0.65rem' }} />
            {t('coupons.firstOrderBadge')}
          </span>
        )}
        {form.total_quota && (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>
            <i className="fas fa-ticket-alt" style={{ marginRight: 3 }} />
            {t('coupons.quota.remaining', { count: parseInt(form.total_quota) })}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Sous-composant : SystemTemplateCard ──

const SystemTemplateCard = ({ tpl, onClone, cloning, t, hovered, onHover, onLeave, index }) => {
  const accentColor = tpl.accent_color || '#5b5eea';
  const [rr, gg, bb] = hexToRgb(accentColor);
  const discount = discountLabel(tpl, t);
  const category = t(`coupons.category.${tpl.category}`);

  const cardStyle = {
    background: 'var(--color-bg-card)',
    borderRadius: 16,
    border: '1px solid var(--color-border-card)',
    borderLeft: `4px solid ${accentColor}`,
    padding: '1.1rem 1.1rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    cursor: 'pointer',
    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
    willChange: 'transform',
    ...(hovered
      ? { transform: 'translateY(-4px) scale(1.012)', boxShadow: `0 12px 32px rgba(${rr},${gg},${bb},0.18), 0 2px 8px rgba(0,0,0,0.06)` }
      : { transform: 'translateY(0) scale(1)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
    ),
    ...cardEntryStyle(index),
  };

  const iconPillStyle = {
    width: 46, height: 46, borderRadius: 12,
    background: `rgba(${rr},${gg},${bb},0.1)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.3rem', color: accentColor, flexShrink: 0,
    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
    ...(hovered ? { transform: 'scale(1.15) rotate(-4deg)' } : {}),
  };

  return (
    <div style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
      {/* Header: icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={iconPillStyle}>
          <i className={tpl.icon || 'fas fa-ticket-alt'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.93rem', color: 'var(--color-text-heading)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
            {tpl.commercial_title || tpl.name}
          </div>
          {tpl.subtitle && (
            <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--color-text-muted-ui)', marginTop: 1 }}>
              {tpl.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ borderTop: '1px solid var(--color-border-card)', paddingTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: `rgba(${rr},${gg},${bb},0.1)`, color: accentColor, borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700 }}>
          {category}
        </span>
        <span style={{ background: `rgba(${rr},${gg},${bb},0.13)`, color: accentColor, borderRadius: 20, padding: '2px 10px', fontSize: '0.73rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          {discount}
        </span>
        {tpl.first_order_only && (
          <span style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="fas fa-star" style={{ fontSize: '0.65rem' }} />
            {t('coupons.firstOrderBadge')}
          </span>
        )}
      </div>

      {/* Marketing description */}
      {tpl.marketing_description && (
        <div style={{ fontSize: '0.77rem', color: 'var(--color-text-muted-ui)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {tpl.marketing_description}
        </div>
      )}

      {/* Clone count */}
      {tpl.clone_count > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-users" style={{ fontSize: '0.65rem' }} />
          {t('coupons.library.vendorsUse', { count: tpl.clone_count })}
        </div>
      )}

      {/* Button */}
      <button
        style={{
          background: accentColor, color: '#fff',
          border: 'none', borderRadius: 10,
          width: '100%', height: 38,
          fontWeight: 600, fontSize: '0.82rem',
          cursor: cloning === tpl.id ? 'not-allowed' : 'pointer',
          marginTop: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'opacity 0.15s, transform 0.12s',
          fontFamily: 'inherit',
        }}
        onClick={() => onClone(tpl)}
        disabled={cloning === tpl.id}
        onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.985)'; } }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.975)'; }}
      >
        {cloning === tpl.id
          ? <><i className="fas fa-spinner fa-spin" /> Clonage...</>
          : <><i className="fas fa-magic" /> {t('coupons.library.useTemplate')}</>
        }
      </button>
    </div>
  );
};

// ── Sous-composant : PersonalTemplateCard ──

const PersonalTemplateCard = ({ tpl, onEdit, onView, onTogglePublished, onDelete, t, hovered, onHover, onLeave, index }) => {
  const accentColor = tpl.accent_color || '#5b5eea';
  const [rr, gg, bb] = hexToRgb(accentColor);
  const discount = discountLabel(tpl, t);

  const cardStyle = {
    background: 'var(--color-bg-card)',
    borderRadius: 16,
    border: '1px solid var(--color-border-card)',
    borderLeft: `4px solid ${accentColor}`,
    padding: '1.1rem 1.1rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    cursor: 'pointer',
    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
    willChange: 'transform',
    opacity: tpl.is_published ? 1 : 0.72,
    ...(hovered
      ? { transform: 'translateY(-4px) scale(1.012)', boxShadow: `0 12px 32px rgba(${rr},${gg},${bb},0.18), 0 2px 8px rgba(0,0,0,0.06)` }
      : { transform: 'translateY(0) scale(1)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
    ),
    ...cardEntryStyle(index),
  };

  const iconPillStyle = {
    width: 40, height: 40, borderRadius: 12,
    background: `rgba(${rr},${gg},${bb},0.1)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem', color: accentColor, flexShrink: 0,
    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
    ...(hovered ? { transform: 'scale(1.15) rotate(-4deg)' } : {}),
  };

  const actionBtnStyle = {
    padding: '0.3rem 0.55rem', fontSize: '0.75rem', borderRadius: 8,
    border: '1px solid var(--color-border-card)', background: 'var(--color-bg-card)',
    cursor: 'pointer', color: 'var(--color-text-heading)',
    transition: 'background 0.15s', fontFamily: 'inherit',
  };

  return (
    <div style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
      {/* Header: icon + titles */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={iconPillStyle}>
          <i className={tpl.icon || 'fas fa-ticket-alt'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)', fontWeight: 500, marginBottom: 2 }}>
            {tpl.name}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-heading)', lineHeight: 1.3 }}>
            {tpl.commercial_title || tpl.name}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ borderTop: '1px solid var(--color-border-card)', paddingTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: `rgba(${rr},${gg},${bb},0.1)`, color: accentColor, borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700 }}>
          {t(`coupons.category.${tpl.category}`)}
        </span>
        <span style={{ background: `rgba(${rr},${gg},${bb},0.13)`, color: accentColor, borderRadius: 20, padding: '2px 10px', fontSize: '0.73rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          {discount}
        </span>
        {tpl.first_order_only && (
          <span style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="fas fa-star" style={{ fontSize: '0.65rem' }} />
            {t('coupons.firstOrderBadge')}
          </span>
        )}
        {tpl.is_published ? (
          <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700 }}>
            {t('coupons.myTemplates.active', 'Actif')}
          </span>
        ) : (
          <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700 }}>
            {t('coupons.myTemplates.inactive')}
          </span>
        )}
        {tpl.total_quota != null && (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <i className="fas fa-ticket-alt" style={{ fontSize: '0.65rem' }} />
            {tpl.quota_used}/{tpl.total_quota}
          </span>
        )}
      </div>

      {/* cloned_from */}
      {tpl.cloned_from_name && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)', fontStyle: 'italic' }}>
          <i className="fas fa-code-branch" style={{ marginRight: 4 }} />
          {t('coupons.myTemplates.clonedFrom')} : {tpl.cloned_from_name}
        </div>
      )}

      {/* Footer: action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', paddingTop: '0.25rem' }}>
        <button style={actionBtnStyle} onClick={() => onView(tpl)} title={t('coupons.preview.title')}>
          <i className="fas fa-eye" />
        </button>
        <button style={actionBtnStyle} onClick={() => onEdit(tpl)} title="Modifier">
          <i className="fas fa-pen" />
        </button>
        <button style={actionBtnStyle} onClick={() => onTogglePublished(tpl)} title={t('coupons.myTemplates.togglePublished')}>
          <i className={tpl.is_published ? 'fas fa-eye-slash' : 'fas fa-eye'} />
        </button>
        <button style={{ ...actionBtnStyle, color: 'var(--color-error)' }} onClick={() => onDelete(tpl.id)} title="Supprimer">
          <i className="fas fa-trash" />
        </button>
      </div>
    </div>
  );
};

// ── Sous-composant : TemplatePreviewModal ──

const TemplatePreviewModal = ({ template, onClose, onEdit, t }) => {
  const tpl = template;
  const color = tpl.accent_color || '#5b5eea';

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border-card)', paddingBottom: '0.4rem' }}>
      <i className={icon} style={{ color }} /> {label}
    </div>
  );

  const fieldRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.3rem 0', gap: '1rem' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-heading)', textAlign: 'right' }}>{value}</span>
    </div>
  );

  const notSet = t('coupons.preview.notSet');
  const unlimited = t('coupons.preview.unlimited');

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : notSet;

  // Build a form-like object for PreviewCard
  const previewForm = {
    commercial_title: tpl.commercial_title,
    name: tpl.name,
    subtitle: tpl.subtitle,
    accent_color: color,
    icon: tpl.icon,
    discount_type: tpl.discount_type,
    discount_value: tpl.discount_value,
    category: tpl.category,
    first_order_only: tpl.first_order_only,
    total_quota: tpl.total_quota,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        animation: 'tpmFadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes tpmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tpmScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-card)', borderRadius: 16,
          maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto',
          border: `2px solid ${hexToRgba(color, 0.3)}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px ${hexToRgba(color, 0.1)}`,
          animation: 'tpmScaleIn 0.2s ease',
          padding: '1.5rem',
        }}
      >
        {/* Header — PreviewCard */}
        <PreviewCard form={previewForm} t={t} />

        {/* Section Identité */}
        <div style={{ marginTop: '1.25rem' }}>
          {sectionTitle('fas fa-tag', t('coupons.preview.section.identity'))}
          {fieldRow(t('coupons.preview.field.internalName'), tpl.name)}
          {tpl.marketing_description && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)', lineHeight: 1.55, padding: '0.3rem 0' }}>
              {tpl.marketing_description}
            </div>
          )}
          {tpl.tags && tpl.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.3rem 0' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-ui)', marginRight: 4 }}>{t('coupons.preview.field.tags')}</span>
              {tpl.tags.map((tag) => (
                <span key={tag} style={{ background: hexToRgba(color, 0.1), color, borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          )}
          {fieldRow(t('coupons.preview.field.accentColor'), (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: color, display: 'inline-block', border: '1px solid var(--color-border-card)' }} />
              {color}
            </span>
          ))}
        </div>

        {/* Section Conditions commerciales */}
        <div style={{ marginTop: '1rem' }}>
          {sectionTitle('fas fa-shopping-cart', t('coupons.preview.section.conditions'))}
          {fieldRow(t('coupons.preview.field.minOrder'), tpl.min_order_amount != null ? `${parseInt(tpl.min_order_amount)} FCFA` : notSet)}
          {tpl.max_discount_amount != null && fieldRow(t('coupons.preview.field.maxDiscount'), `${parseInt(tpl.max_discount_amount)} FCFA`)}
          {tpl.first_order_only && fieldRow(t('coupons.preview.field.firstOrderOnly'), '✓')}
          {tpl.min_customer_age_days != null && fieldRow(t('coupons.preview.field.minCustomerAge'), `${tpl.min_customer_age_days} ${t('coupons.templates.expiryDays', 'jours')}`)}
        </div>

        {/* Section Validité & quotas */}
        <div style={{ marginTop: '1rem' }}>
          {sectionTitle('fas fa-calendar-alt', t('coupons.preview.section.validity'))}
          {fieldRow(t('coupons.preview.field.expiryDays'), tpl.default_expiry_days ? `${tpl.default_expiry_days} j` : notSet)}
          {fieldRow(t('coupons.preview.field.validFrom'), formatDate(tpl.valid_from))}
          {fieldRow(t('coupons.preview.field.validUntil'), formatDate(tpl.valid_until))}
          {fieldRow(
            'Quota',
            tpl.total_quota != null
              ? t('coupons.preview.field.quotaUsage', { used: tpl.quota_used || 0, total: tpl.total_quota })
              : unlimited
          )}
          {fieldRow(t('coupons.preview.field.perCustomerLimit'), tpl.per_customer_limit || unlimited)}
        </div>

        {/* Section Métadonnées */}
        <div style={{ marginTop: '1rem' }}>
          {sectionTitle('fas fa-info-circle', t('coupons.preview.section.metadata'))}
          {fieldRow(t('coupons.preview.field.status'), tpl.is_published
            ? t('coupons.preview.field.statusActive')
            : t('coupons.preview.field.statusInactive')
          )}
          {tpl.created_at && fieldRow(t('coupons.preview.field.createdAt'), formatDate(tpl.created_at))}
          {tpl.updated_at && fieldRow(t('coupons.preview.field.updatedAt'), formatDate(tpl.updated_at))}
          {tpl.cloned_from_name && fieldRow(
            t('coupons.preview.field.clonedFrom', { name: tpl.cloned_from_name }),
            ''
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-card)' }}>
          <button
            className="dashboard-btn"
            onClick={onClose}
            style={{ fontSize: '0.85rem' }}
          >
            {t('coupons.preview.close')}
          </button>
          <button
            className="dashboard-btn"
            onClick={() => { onClose(); onEdit(tpl); }}
            style={{ background: color, color: '#fff', borderColor: color, fontSize: '0.85rem' }}
          >
            <i className="fas fa-pen" style={{ marginRight: 6 }} />
            {t('coupons.preview.edit')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Composant principal ──

const CouponTemplates = () => {
  const { t } = useTranslation();
  const emitter = useEmitterContext();
  const {
    emitterType, activeOrgId, canEmit, loading: emitterLoading,
    hasDualContext,
  } = emitter;

  // Onglets
  const [activeTab, setActiveTab] = useState(null); // null = pas encore décidé (chargement initial)
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);

  // Données
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);

  // Filtre catégorie bibliothèque
  const [categoryFilter, setCategoryFilter] = useState('');

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Clonage / prévisualisation
  const [cloning, setCloning] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Hover card
  const [hoveredCard, setHoveredCard] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Modal de confirmation (remplace window.confirm)
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null });

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3500);
  };

  const askConfirm = (message, onConfirm) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  const closeConfirm = () => setConfirmState({ show: false, message: '', onConfirm: null });

  const fetchAll = useCallback(() => {
    setLibraryLoading(true);
    setMyLoading(true);

    Promise.all([
      couponAPI.getSystemLibrary({}, emitterType, activeOrgId),
      couponAPI.getTemplates(emitterType, activeOrgId),
    ]).then(([libRes, myRes]) => {
      const lib = libRes.data || [];
      const mine = myRes.data || [];
      setSystemTemplates(lib);
      setMyTemplates(mine);
      // Onglet par défaut calculé après réception
      setActiveTab((prev) => prev === null ? (mine.length === 0 ? 'library' : 'mine') : prev);
    }).catch((err) => {
      setSystemTemplates([]);
      setMyTemplates([]);
      setActiveTab((prev) => prev === null ? 'library' : prev);
      const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    }).finally(() => {
      setLibraryLoading(false);
      setMyLoading(false);
    });
  }, [emitterType, activeOrgId]);

  // Reset + refetch on context change
  useEffect(() => {
    if (emitterLoading || !canEmit) return;
    setActiveTab(null);
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
    fetchAll();
  }, [emitterType, activeOrgId, emitterLoading, canEmit]);

  // Filtre catégorie côté client
  const filteredLibrary = categoryFilter
    ? systemTemplates.filter((t) => t.category === categoryFilter)
    : systemTemplates;

  // ── Handlers bibliothèque ──

  const handleClone = async (tpl) => {
    setCloning(tpl.id);
    try {
      await couponAPI.cloneSystemTemplate(tpl.id, emitterType, activeOrgId);
      showToast(t('coupons.library.cloneSuccess'));
      await couponAPI.getTemplates(emitterType, activeOrgId).then(({ data }) => setMyTemplates(data || []));
      setActiveTab('mine');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    } finally { setCloning(null); }
  };

  // ── Handlers formulaire ──

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setShowForm(false);
    setTagInput('');
  };

  const handleEdit = (tpl) => {
    setForm({
      name: tpl.name || '',
      commercial_title: tpl.commercial_title || '',
      subtitle: tpl.subtitle || '',
      marketing_description: tpl.marketing_description || '',
      category: tpl.category || 'AUTRE',
      tags: tpl.tags || [],
      icon: tpl.icon || 'fas fa-ticket-alt',
      accent_color: tpl.accent_color || '#5b5eea',
      discount_type: tpl.discount_type || 'PERCENT',
      discount_value: String(tpl.discount_value ?? ''),
      min_order_amount: String(tpl.min_order_amount ?? '0'),
      max_discount_amount: tpl.max_discount_amount != null ? String(tpl.max_discount_amount) : '',
      first_order_only: tpl.first_order_only || false,
      min_customer_age_days: tpl.min_customer_age_days != null ? String(tpl.min_customer_age_days) : '',
      default_expiry_days: String(tpl.default_expiry_days ?? '30'),
      valid_from: tpl.valid_from ? tpl.valid_from.slice(0, 16) : '',
      valid_until: tpl.valid_until ? tpl.valid_until.slice(0, 16) : '',
      total_quota: tpl.total_quota != null ? String(tpl.total_quota) : '',
      per_customer_limit: String(tpl.per_customer_limit ?? '1'),
      is_published: tpl.is_published !== false,
    });
    setEditing(tpl.id);
    setShowForm(true);
    setTagInput('');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const buildPayload = () => {
    const p = {
      name: form.name,
      commercial_title: form.commercial_title,
      subtitle: form.subtitle,
      marketing_description: form.marketing_description,
      category: form.category,
      tags: form.tags,
      icon: form.icon,
      accent_color: form.accent_color,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'FREE_SHIPPING' ? '0' : form.discount_value,
      min_order_amount: form.min_order_amount || '0',
      first_order_only: form.first_order_only,
      default_expiry_days: form.default_expiry_days || '30',
      per_customer_limit: form.per_customer_limit || '1',
      is_published: form.is_published,
    };
    if (form.max_discount_amount !== '') p.max_discount_amount = form.max_discount_amount;
    if (form.min_customer_age_days !== '') p.min_customer_age_days = form.min_customer_age_days;
    if (form.valid_from !== '') p.valid_from = form.valid_from;
    if (form.valid_until !== '') p.valid_until = form.valid_until;
    if (form.total_quota !== '') p.total_quota = form.total_quota;
    return p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await couponAPI.updateTemplate(editing, payload, emitterType, activeOrgId);
      } else {
        await couponAPI.createTemplate(payload, emitterType, activeOrgId);
      }
      resetForm();
      couponAPI.getTemplates(emitterType, activeOrgId).then(({ data }) => setMyTemplates(data || []));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail
        || err?.response?.data?.non_field_errors?.[0]
        || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  // ── Handlers liste personnelle ──

  const handleView = (tpl) => {
    setPreviewTemplate(tpl);
  };

  const handleTogglePublished = async (tpl) => {
    try {
      await couponAPI.updateTemplate(tpl.id, { is_published: !tpl.is_published }, emitterType, activeOrgId);
      couponAPI.getTemplates(emitterType, activeOrgId).then(({ data }) => setMyTemplates(data || []));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Une erreur est survenue');
      showToast(msg, 'error');
    }
  };

  const handleDelete = (id) => {
    askConfirm(t('coupons.templates.deleteConfirm'), async () => {
      try {
        closeConfirm();
        await couponAPI.deleteTemplate(id, emitterType, activeOrgId);
        couponAPI.getTemplates(emitterType, activeOrgId).then(({ data }) => setMyTemplates(data || []));
      } catch (err) {
        const msg = err?.response?.data?.error || err?.response?.data?.detail || t('common.error', 'Erreur lors de la suppression');
        showToast(msg, 'error');
      }
    });
  };

  // ── Styles ──

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
  const sectionHeaderStyle = {
    fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-heading)',
    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
  };

  const isLoading = libraryLoading || myLoading;

  if (emitterLoading || (isLoading && activeTab === null)) {
    return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  }

  if (!canEmit) {
    return (
      <div>
        <div className="dashboard-home__header">
          <h1>{t('coupons.templates.title')}</h1>
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
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ct-form-layout {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .ct-preview-col {
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: calc(var(--header-height, 68px) + 12px);
          z-index: 10;
          align-self: flex-start;
        }
        @media (max-width: 768px) {
          .ct-form-layout {
            flex-direction: column-reverse;
          }
          .ct-preview-col {
            width: 100%;
            position: static;
          }
        }
      `}</style>
      <div className="dashboard-home__header">
        <h1>{t('coupons.templates.title')}</h1>
        <p className="dashboard-home__subtitle">Gérez vos templates de coupons et explorez la bibliothèque Frollot.</p>
      </div>

      <EmitterSelector {...emitter} />

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border-card)', paddingBottom: '0.1rem' }}>
        {[
          { key: 'library', icon: 'fas fa-book-open', label: t('coupons.library.title') },
          { key: 'mine', icon: 'fas fa-clone', label: t('coupons.myTemplates.title'), count: myTemplates.length },
        ].map(({ key, icon, label, count }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setShowForm(false); }}
            style={{
              padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
              color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text-muted-ui)',
              borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'color 0.15s',
            }}
          >
            <i className={icon} />
            {label}
            {count != null && count > 0 && (
              <span style={{ background: 'rgba(91,94,234,0.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Onglet Bibliothèque ── */}
      {activeTab === 'library' && (
        <div>
          <p className="text-muted" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {t('coupons.library.subtitle')}
          </p>

          {/* Filtre catégories */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              className={`dashboard-btn ${categoryFilter === '' ? 'dashboard-btn--primary' : ''}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
              onClick={() => setCategoryFilter('')}
            >
              {t('coupons.library.filterAll')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`dashboard-btn ${categoryFilter === cat ? 'dashboard-btn--primary' : ''}`}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                onClick={() => setCategoryFilter(cat)}
              >
                {t(`coupons.category.${cat}`)}
              </button>
            ))}
          </div>

          {libraryLoading ? (
            <div className="dashboard-loading"><div className="admin-spinner" /></div>
          ) : filteredLibrary.length === 0 ? (
            <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <i className="fas fa-book-open" style={{ fontSize: '2rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
              <p className="text-muted">{t('coupons.library.empty')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredLibrary.map((tpl, index) => (
                <SystemTemplateCard
                  key={tpl.id} tpl={tpl} onClone={handleClone} cloning={cloning} t={t} index={index}
                  hovered={hoveredCard === tpl.id}
                  onHover={() => setHoveredCard(tpl.id)}
                  onLeave={() => setHoveredCard(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Mes templates ── */}
      {activeTab === 'mine' && (
        <div>
          {/* Bouton créer + formulaire */}
          {!showForm ? (
            <button
              className="dashboard-btn dashboard-btn--primary"
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{ marginBottom: '1.5rem' }}
            >
              <i className="fas fa-plus" /> {t('coupons.templates.create')}
            </button>
          ) : (
            <div className="as-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
                {editing ? t('coupons.templates.edit') : t('coupons.templates.create')}
              </h2>

              <div className="ct-form-layout">
                {/* Form column */}
                <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: 0 }}>
                {/* ── Section Identité & marketing ── */}
                <div className="as-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--color-bg-section-alt)' }}>
                  <h3 style={sectionHeaderStyle}>
                    <i className="fas fa-tag" style={{ color: 'var(--color-primary)' }} />
                    {t('coupons.form.section.identity')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.commercialTitle')}</label>
                      <input style={inputStyle} value={form.commercial_title} onChange={(e) => setForm({ ...form, commercial_title: e.target.value })} placeholder={t('coupons.form.commercialTitle_placeholder')} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.commercialTitle_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.subtitle')}</label>
                      <input style={inputStyle} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder={t('coupons.form.subtitle_placeholder')} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.subtitle_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.internalName')} *</label>
                      <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('coupons.form.internalName_placeholder')} required />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.internalName_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.category')}</label>
                      <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{t(`coupons.category.${cat}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>{t('coupons.form.marketingDescription')}</label>
                      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.marketing_description} onChange={(e) => setForm({ ...form, marketing_description: e.target.value })} placeholder={t('coupons.form.marketingDescription_placeholder')} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.marketingDescription_help')}</small>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>{t('coupons.form.tags')}</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                          placeholder={t('coupons.form.tags_placeholder')}
                        />
                        <button type="button" className="dashboard-btn" onClick={handleAddTag} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          <i className="fas fa-plus" />
                        </button>
                      </div>
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.tags_help')}</small>
                      {form.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {form.tags.map((tag) => (
                            <span key={tag} style={{ background: 'rgba(91,94,234,0.1)', color: '#5b5eea', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              {tag}
                              <button type="button" onClick={() => handleRemoveTag(tag)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: '0.85rem', lineHeight: 1 }}>&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Section Apparence ── */}
                <div className="as-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--color-bg-section-alt)' }}>
                  <h3 style={sectionHeaderStyle}>
                    <i className="fas fa-palette" style={{ color: 'var(--color-primary)' }} />
                    {t('coupons.form.section.appearance')}
                  </h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>{t('coupons.form.icon')}</label>
                    <IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('coupons.form.accentColor')}</label>
                    <ColorPicker value={form.accent_color} onChange={(color) => setForm({ ...form, accent_color: color })} />
                  </div>
                </div>

                {/* ── Section Réduction ── */}
                <div className="as-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--color-bg-section-alt)' }}>
                  <h3 style={sectionHeaderStyle}>
                    <i className="fas fa-percentage" style={{ color: 'var(--color-primary)' }} />
                    {t('coupons.form.section.discount')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>{t('coupons.templates.discountType')} *</label>
                      <select style={inputStyle} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                        {DISCOUNT_TYPES.map((dt) => <option key={dt} value={dt}>{t(`coupons.type.${dt}`)}</option>)}
                      </select>
                    </div>
                    {form.discount_type !== 'FREE_SHIPPING' && (
                      <div>
                        <label style={labelStyle}>{t('coupons.templates.discountValue')} *</label>
                        <input type="number" style={inputStyle} step="0.01" min="0" max={form.discount_type === 'PERCENT' ? 100 : undefined} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required />
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>{t('coupons.templates.minOrder')}</label>
                      <input type="number" style={inputStyle} min="0" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
                    </div>
                    {form.discount_type === 'PERCENT' && (
                      <div>
                        <label style={labelStyle}>{t('coupons.form.maxDiscountAmount')}</label>
                        <input type="number" style={inputStyle} min="0" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} placeholder="Illimité" />
                        <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.maxDiscountAmount_help')}</small>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section Conditions ── */}
                <div className="as-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--color-bg-section-alt)' }}>
                  <h3 style={sectionHeaderStyle}>
                    <i className="fas fa-filter" style={{ color: 'var(--color-primary)' }} />
                    {t('coupons.form.section.conditions')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>{t('coupons.form.firstOrderOnly')}</span>
                      </label>
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)', marginLeft: 22 }}>{t('coupons.form.firstOrderOnly_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.minCustomerAgeDays')}</label>
                      <input type="number" style={inputStyle} min="0" value={form.min_customer_age_days} onChange={(e) => setForm({ ...form, min_customer_age_days: e.target.value })} placeholder="Vide = aucune condition" />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.minCustomerAgeDays_help')}</small>
                    </div>
                  </div>
                </div>

                {/* ── Section Validité & quotas ── */}
                <div className="as-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--color-bg-section-alt)' }}>
                  <h3 style={sectionHeaderStyle}>
                    <i className="fas fa-calendar-alt" style={{ color: 'var(--color-primary)' }} />
                    {t('coupons.form.section.validity')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>{t('coupons.templates.expiryDays')}</label>
                      <input type="number" style={inputStyle} min="1" max="365" value={form.default_expiry_days} onChange={(e) => setForm({ ...form, default_expiry_days: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.totalQuota')}</label>
                      <input type="number" style={inputStyle} min="1" value={form.total_quota} onChange={(e) => setForm({ ...form, total_quota: e.target.value })} placeholder="Illimité" />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.totalQuota_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.perCustomerLimit')}</label>
                      <input type="number" style={inputStyle} min="1" value={form.per_customer_limit} onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.perCustomerLimit_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.validFrom')}</label>
                      <input type="datetime-local" style={inputStyle} value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.validFrom_help')}</small>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('coupons.form.validUntil')}</label>
                      <input type="datetime-local" style={inputStyle} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                      <small style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted-ui)' }}>{t('coupons.form.validUntil_help')}</small>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="dashboard-btn" onClick={resetForm}>
                    {t('common.cancel', 'Annuler')}
                  </button>
                  <button type="submit" className="dashboard-btn dashboard-btn--primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin" /> : (editing ? t('common.save', 'Enregistrer') : t('coupons.templates.create'))}
                  </button>
                </div>
              </form>

                {/* Sticky preview column */}
                <div className="ct-preview-col">
                  <div style={{ ...labelStyle, marginBottom: 8 }}><i className="fas fa-eye" style={{ marginRight: 6 }} />{t('coupons.form.preview')}</div>
                  <PreviewCard form={form} t={t} />
                </div>
              </div>
            </div>
          )}

          {/* Liste templates personnels */}
          {myLoading ? (
            <div className="dashboard-loading"><div className="admin-spinner" /></div>
          ) : myTemplates.length === 0 && !showForm ? (
            <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <i className="fas fa-clone" style={{ fontSize: '2rem', color: 'var(--color-gray-300)', marginBottom: '1rem', display: 'block' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-heading)' }}>{t('coupons.myTemplates.emptyTitle')}</h3>
              <p className="text-muted" style={{ marginBottom: '1.25rem' }}>{t('coupons.myTemplates.emptyDesc')}</p>
              <button className="dashboard-btn dashboard-btn--primary" onClick={() => setActiveTab('library')}>
                <i className="fas fa-book-open" /> {t('coupons.myTemplates.emptyCTA')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {myTemplates.map((tpl, index) => (
                <PersonalTemplateCard
                  key={tpl.id} tpl={tpl} t={t} index={index}
                  onEdit={handleEdit} onView={handleView}
                  onTogglePublished={handleTogglePublished} onDelete={handleDelete}
                  hovered={hoveredCard === tpl.id}
                  onHover={() => setHoveredCard(tpl.id)}
                  onLeave={() => setHoveredCard(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de prévisualisation */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onEdit={handleEdit}
          t={t}
        />
      )}

      {/* Modal de confirmation */}
      {confirmState.show && (
        <div
          onClick={closeConfirm}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            className="dashboard-card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '1.75rem', maxWidth: 400, width: '100%', borderRadius: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '1.1rem', flexShrink: 0 }}>
                <i className="fas fa-exclamation-triangle" />
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-heading)', lineHeight: 1.4 }}>
                {confirmState.message}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="dashboard-btn" onClick={closeConfirm}>
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                className="dashboard-btn"
                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                onClick={confirmState.onConfirm}
              >
                <i className="fas fa-trash" style={{ marginRight: 6 }} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          background: toastType === 'error' ? 'var(--color-error, #ef4444)' : 'var(--color-success, #10b981)',
          color: '#fff',
          padding: '0.75rem 1.25rem', borderRadius: 10,
          fontSize: '0.85rem', fontWeight: 600, zIndex: 9999,
          boxShadow: toastType === 'error' ? '0 4px 16px rgba(239,68,68,0.3)' : '0 4px 16px rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <i className={toastType === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} /> {toast}
        </div>
      )}
    </div>
  );
};

export default CouponTemplates;
