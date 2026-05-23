/**
 * AdminPrimitives — Composants partages reutilisables pour toutes les pages admin.
 * Pixel-perfect match du design Claude Design (AdminShell.jsx + Admin.jsx).
 *
 * Design language:
 *   - Cards: white, 1px gray-200, 14px radius
 *   - Stats: 2px orange accent bar top, icon 34px with tinted bg, serif 30px value
 *   - Tables: cream-2 header, mono uppercase labels, 14px 18px cell padding
 *   - Filters: pill 999 radius, orange active, white inactive
 *   - Orange #E8601C is the ONLY action color
 */
import React, { useEffect, useRef } from 'react';

/* =============================================
   STATUS BADGE — used across orders, manuscripts, users
   ============================================= */
const STATUS_MAP = {
  paid:      { bg: 'rgba(46,125,50,0.12)',  fg: '#2E7D32', dot: '#2E7D32', label: 'Payee' },
  pending:   { bg: 'rgba(232,96,28,0.12)',  fg: '#C94E15', dot: '#E8601C', label: 'En attente' },
  shipped:   { bg: 'rgba(28,42,74,0.12)',   fg: '#1c2a4a', dot: '#1c2a4a', label: 'Expediee' },
  cancelled: { bg: 'rgba(198,40,40,0.12)',  fg: '#C62828', dot: '#C62828', label: 'Annulee' },
  reviewing: { bg: 'rgba(28,42,74,0.12)',   fg: '#1c2a4a', dot: '#1c2a4a', label: 'En examen' },
  accepted:  { bg: 'rgba(46,125,50,0.12)',  fg: '#2E7D32', dot: '#2E7D32', label: 'Accepte' },
  rejected:  { bg: 'rgba(198,40,40,0.12)',  fg: '#C62828', dot: '#C62828', label: 'Refuse' },
  active:    { bg: 'rgba(46,125,50,0.12)',  fg: '#2E7D32', dot: '#2E7D32', label: 'Actif' },
  inactive:  { bg: 'rgba(198,40,40,0.12)',  fg: '#C62828', dot: '#C62828', label: 'Inactif' },
};

export function StatusBadge({ value }) {
  const c = STATUS_MAP[(value || '').toLowerCase()] || STATUS_MAP.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: c.bg, color: c.fg,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

/* =============================================
   SECTION TITLE — mono eyebrow + serif title
   ============================================= */
export function AdminSectionTitle({ icon, eyebrow, title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 18, gap: 16,
    }}>
      <div>
        {eyebrow && (
          <div style={{
            fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--tn-orange)', marginBottom: 6,
          }}>{eyebrow}</div>
        )}
        <h2 style={{
          fontFamily: 'var(--tn-serif)', fontSize: 22, fontWeight: 600,
          margin: 0, letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {icon && <i className={`fas ${icon}`} style={{ color: 'var(--tn-orange)', fontSize: 16 }} />}
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* =============================================
   STAT CARD — light + dark variant
   ============================================= */
export function AdminStat({ icon, label, value, suffix, meta, metaTone = 'muted', color = 'var(--tn-orange)', dark = false }) {
  if (dark) {
    return (
      <div style={{
        background: 'var(--tn-black)', color: 'var(--tn-cream)',
        borderRadius: 14, padding: 20,
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(200,149,108,0.25)',
      }}>
        <div className="tn-motif-bg" style={{ position: 'absolute', inset: 0, opacity: 0.06 }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--tn-gold-light)', marginBottom: 14,
          }}>
            {icon && <i className={`fas ${icon}`} style={{ marginRight: 8 }} />}
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--tn-serif)', fontSize: 38, fontWeight: 700, color: 'var(--ds-white)' }}>{value}</span>
            {suffix && <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'var(--tn-gold-light)' }}>{suffix}</span>}
          </div>
          {meta && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--tn-gray-400)' }}>{meta}</div>}
        </div>
      </div>
    );
  }

  const metaColor =
    metaTone === 'alert' ? 'var(--tn-orange)' :
    metaTone === 'good'  ? 'var(--tn-success)' :
    metaTone === 'bad'   ? 'var(--tn-error)' :
                           'var(--tn-gray-500)';

  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14, padding: 20,
      border: '1px solid var(--tn-gray-200)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 2px orange accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, height: 2, width: 56,
        background: color, borderRadius: '0 2px 2px 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: `${color}15`, color, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          <i className={`fas ${icon}`} />
        </div>
        <div style={{
          fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--tn-gray-500)', flex: 1,
        }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--tn-serif)', fontSize: 30, fontWeight: 700, color: 'var(--tn-gray-900)', letterSpacing: '-0.01em' }}>{value}</span>
        {suffix && <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'var(--tn-gray-500)' }}>{suffix}</span>}
      </div>
      {meta && (
        <div style={{ marginTop: 6, fontSize: 12, color: metaColor, fontWeight: metaTone === 'muted' ? 500 : 600 }}>
          {meta}
        </div>
      )}
    </div>
  );
}

/* =============================================
   CARD WRAPPER
   ============================================= */
export function AdminCard({ children, padding = 24, accent, style }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14,
      border: '1px solid var(--tn-gray-200)',
      borderTop: accent ? '4px solid var(--tn-orange)' : '1px solid var(--tn-gray-200)',
      padding,
      ...style,
    }}>{children}</div>
  );
}

/* =============================================
   FILTER PILLS
   ============================================= */
export function AdminFilterPills({ items, active, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([key, label, count]) => {
        const isActive = key === active;
        return (
          <button key={key} onClick={() => onChange && onChange(key)} style={{
            padding: '8px 14px', borderRadius: 999,
            background: isActive ? 'var(--tn-orange)' : 'var(--ds-white)',
            color: isActive ? 'var(--ds-white)' : 'var(--tn-gray-700)',
            border: `1.5px solid ${isActive ? 'var(--tn-orange)' : 'var(--tn-gray-200)'}`,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'all 140ms ease',
          }}>
            {label}
            {count != null && (
              <span style={{
                minWidth: 20, padding: '0 6px', borderRadius: 999,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--tn-cream-2)',
                color: isActive ? 'var(--ds-white)' : 'var(--tn-gray-700)',
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--tn-mono)',
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =============================================
   SEARCH BAR
   ============================================= */
export function AdminSearch({ placeholder = 'Rechercher...', value, onChange, onClear }) {
  return (
    <div style={{
      flex: 1, minWidth: 240, maxWidth: 380,
      background: 'var(--ds-white)', borderRadius: 999,
      padding: '4px 4px 4px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      border: '1px solid var(--tn-gray-200)',
    }}>
      <i className="fas fa-search" style={{ color: 'var(--tn-gray-500)', fontSize: 12 }} />
      <input
        type="text"
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        style={{
          flex: 1, background: 'transparent', border: 0, outline: 0,
          fontSize: 13, color: 'var(--tn-gray-900)', fontFamily: 'var(--tn-sans)',
        }}
      />
      {value && (
        <button onClick={onClear} style={{
          width: 28, height: 28, borderRadius: '50%', border: 0,
          background: 'var(--tn-cream-2)', color: 'var(--tn-gray-700)',
          cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><i className="fas fa-times" /></button>
      )}
    </div>
  );
}

/* =============================================
   TABLE PRIMITIVES
   ============================================= */
export function AdminTable({ columns, children }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14,
      border: '1px solid var(--tn-gray-200)',
      overflowX: 'auto', overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
        <thead>
          <tr style={{ background: 'var(--tn-cream-2)', borderBottom: '1px solid var(--tn-gray-200)' }}>
            {columns.map((c, i) => (
              <th key={i} style={{
                textAlign: c.align || 'left', padding: '14px 18px',
                fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--tn-gray-700)', fontWeight: 700,
                width: c.width,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminRow({ children, last }) {
  return <tr style={{ borderBottom: last ? 0 : '1px solid var(--tn-gray-200)' }}>{children}</tr>;
}

export function AdminCell({ children, align, mono, bold, muted, style }) {
  return (
    <td style={{
      padding: '14px 18px',
      textAlign: align || 'left',
      fontFamily: mono ? 'var(--tn-mono)' : 'var(--tn-sans)',
      fontWeight: bold ? 700 : 500,
      color: muted ? 'var(--tn-gray-500)' : 'var(--tn-gray-900)',
      fontSize: mono ? 12 : 13,
      verticalAlign: 'middle',
      ...style,
    }}>{children}</td>
  );
}

/* =============================================
   AVATAR
   ============================================= */
export function AdminAvatar({ name, size = 32, photo }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: photo ? `url(${photo}) center/cover` : 'linear-gradient(135deg, var(--tn-orange), var(--tn-gold-dark))',
      color: 'var(--ds-white)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--tn-serif)', fontWeight: 700, fontSize: Math.round(size * 0.42),
      flexShrink: 0,
    }}>{photo ? null : initial}</div>
  );
}

/* =============================================
   ACTION BUTTONS (table rows)
   ============================================= */
const ACTION_TONES = {
  gray:   { bg: 'transparent', fg: 'var(--tn-gray-700)', border: 'var(--tn-gray-200)' },
  orange: { bg: 'var(--tn-orange-50)', fg: 'var(--tn-orange-hover)', border: 'var(--tn-orange-100)' },
  red:    { bg: 'rgba(198,40,40,0.06)', fg: 'var(--tn-error)', border: 'rgba(198,40,40,0.18)' },
  green:  { bg: 'rgba(46,125,50,0.08)', fg: 'var(--tn-success)', border: 'rgba(46,125,50,0.2)' },
};

export function AdminActionBtn({ icon, tone = 'gray', title, onClick }) {
  const t = ACTION_TONES[tone] || ACTION_TONES.gray;
  return (
    <button title={title} onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 12,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 140ms ease',
    }}>
      <i className={`fas ${icon}`} />
    </button>
  );
}

/* =============================================
   EMPTY STATE
   ============================================= */
export function AdminEmpty({ icon, title, subtitle, action }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14, border: '1px dashed var(--tn-gray-300)',
      padding: '64px 28px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--tn-orange-50)', color: 'var(--tn-orange)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        <i className={`fas ${icon}`} />
      </div>
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 22, fontWeight: 600, marginTop: 16, color: 'var(--tn-gray-900)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14, color: 'var(--tn-gray-500)', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 24 }}>{action}</div>}
    </div>
  );
}

/* =============================================
   LOADING STATE
   ============================================= */
export function AdminLoading({ label = 'Chargement...' }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14, border: '1px solid var(--tn-gray-200)',
      padding: '72px 28px', textAlign: 'center',
    }}>
      <div style={{
        width: 54, height: 54, borderRadius: '50%',
        border: '3px solid var(--tn-cream-2)',
        borderTopColor: 'var(--tn-orange)',
        margin: '0 auto',
        animation: 'tn-spin 1s linear infinite',
      }} />
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 18, fontWeight: 600, marginTop: 22, color: 'var(--tn-gray-900)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)',
        letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6,
      }}>Veuillez patienter...</div>
    </div>
  );
}

/* =============================================
   ERROR STATE
   ============================================= */
export function AdminError({ message, onRetry }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14,
      border: '1px solid rgba(198,40,40,0.25)',
      borderTop: '4px solid var(--tn-error)',
      padding: '56px 28px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(198,40,40,0.08)', color: 'var(--tn-error)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        <i className="fas fa-triangle-exclamation" />
      </div>
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 22, fontWeight: 600, marginTop: 16, color: 'var(--tn-gray-900)' }}>
        Une erreur est survenue
      </div>
      <div style={{ fontSize: 14, color: 'var(--tn-gray-500)', marginTop: 8, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
        {message || "Impossible de charger les donnees. Verifiez votre connexion ou reessayez."}
      </div>
      {onRetry && (
        <div style={{ marginTop: 24 }}>
          <button onClick={onRetry} className="tn-btn tn-btn--primary">
            <i className="fas fa-rotate-right" /> Reessayer
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================
   GENRE PILL (manuscripts)
   ============================================= */
const GENRE_COLORS = {
  ROMAN:    { bg: '#FCEFE6', fg: '#C94E15' },
  NOUVELLE: { bg: 'rgba(200,149,108,0.2)', fg: '#A77648' },
  POESIE:   { bg: 'rgba(28,42,74,0.12)', fg: '#1c2a4a' },
  ESSAI:    { bg: 'rgba(46,125,50,0.12)', fg: '#2E7D32' },
  THEATRE:  { bg: 'rgba(91,26,45,0.12)', fg: '#5b1a2d' },
  JEUNESSE: { bg: '#fef3c7', fg: '#92400e' },
  BD:       { bg: 'rgba(58,46,26,0.12)', fg: '#3a2e1a' },
  AUTRE:    { bg: 'var(--tn-cream-2)', fg: 'var(--tn-gray-700)' },
};

export function GenrePill({ value }) {
  const c = GENRE_COLORS[(value || '').toUpperCase()] || GENRE_COLORS.AUTRE;
  const labels = {
    ROMAN: 'Roman', NOUVELLE: 'Nouvelle', POESIE: 'Poesie', ESSAI: 'Essai',
    THEATRE: 'Theatre', JEUNESSE: 'Jeunesse', BD: 'BD', AUTRE: 'Autre',
  };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.fg,
      fontSize: 11, fontWeight: 700,
    }}>{labels[(value || '').toUpperCase()] || value || '--'}</span>
  );
}

/* =============================================
   MODAL OVERLAY + SECTION
   ============================================= */
export function AdminModalOverlay({ children, onClose, ariaLabel = 'Dialogue' }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const getFocusables = () => modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusables = getFocusables();
    if (focusables.length > 0) focusables[0].focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const els = getFocusables();
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,10,10,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--tn-cream)', borderRadius: 16,
          maxWidth: 680, width: '100%', maxHeight: '92vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          animation: 'adm-modal-in 0.25s cubic-bezier(.2,.7,.3,1)',
        }}
      >{children}</div>
    </div>
  );
}

export function AdminModalHeader({ children, onClose }) {
  return (
    <div style={{
      background: 'var(--tn-black)', color: 'var(--tn-cream)',
      padding: '22px 26px', position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div className="tn-motif-bg" style={{ position: 'absolute', inset: 0, opacity: 0.08 }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><i className="fas fa-times" /></button>
      </div>
    </div>
  );
}

export function AdminModalBody({ children }) {
  return (
    <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
      {children}
    </div>
  );
}

export function AdminModalSection({ icon, title, rightLabel, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 10,
        borderBottom: '1px solid var(--tn-gray-200)',
      }}>
        <div style={{
          fontFamily: 'var(--tn-mono)', fontSize: 10, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--tn-gray-700)', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {icon && <i className={`fas ${icon}`} style={{ color: 'var(--tn-orange)', fontSize: 12 }} />}
          {title}
        </div>
        {rightLabel && (
          <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 10, color: 'var(--tn-gray-500)' }}>{rightLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* =============================================
   STATUS WORKFLOW BUTTONS (modal)
   ============================================= */
const WORKFLOW_COLORS = {
  pending:   { bg: 'rgba(232,96,28,0.12)', fg: '#C94E15', activeBg: 'var(--tn-orange)', border: 'var(--tn-orange)' },
  paid:      { bg: 'rgba(46,125,50,0.12)', fg: '#2E7D32', activeBg: 'var(--tn-success)', border: 'var(--tn-success)' },
  shipped:   { bg: 'rgba(28,42,74,0.12)',  fg: '#1c2a4a', activeBg: '#1c2a4a', border: '#1c2a4a' },
  cancelled: { bg: 'rgba(198,40,40,0.12)', fg: '#C62828', activeBg: 'var(--tn-error)', border: 'var(--tn-error)' },
  reviewing: { bg: 'rgba(28,42,74,0.12)',  fg: '#1c2a4a', activeBg: '#1c2a4a', border: '#1c2a4a' },
  accepted:  { bg: 'rgba(46,125,50,0.12)', fg: '#2E7D32', activeBg: 'var(--tn-success)', border: 'var(--tn-success)' },
  rejected:  { bg: 'rgba(198,40,40,0.12)', fg: '#C62828', activeBg: 'var(--tn-error)', border: 'var(--tn-error)' },
};

export function StatusBtn({ statusKey, label, icon, isCurrent, onClick }) {
  const c = WORKFLOW_COLORS[statusKey] || WORKFLOW_COLORS.pending;
  return (
    <button
      onClick={onClick}
      disabled={isCurrent}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 10,
        background: isCurrent ? c.activeBg : c.bg,
        color: isCurrent ? 'var(--ds-white)' : c.fg,
        border: isCurrent ? `2px solid ${c.border}` : '1.5px solid transparent',
        fontSize: 12, fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: isCurrent ? 0.85 : 1,
        transition: 'all 140ms ease',
      }}
    >
      {isCurrent && <i className="fas fa-check" style={{ fontSize: 10 }} />}
      {!isCurrent && icon && <i className={`fas ${icon}`} style={{ fontSize: 10 }} />}
      {label}
    </button>
  );
}

/* =============================================
   TABLE SKELETON (Vague 5)
   ============================================= */
export function AdminTableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div style={{
      background: 'var(--ds-white)', borderRadius: 14,
      border: '1px solid var(--tn-gray-200)', overflow: 'hidden',
    }} aria-busy="true" aria-label="Chargement">
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16, padding: '14px 20px',
        background: 'var(--tn-cream-2, #F5F2EA)',
        borderBottom: '1px solid var(--tn-gray-200)',
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="tn-skel-shimmer" style={{ height: 10, borderRadius: 4, width: '70%', opacity: 0.6 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16, padding: '14px 20px',
          borderBottom: r < rows - 1 ? '1px solid var(--tn-gray-200)' : 'none',
        }}>
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="tn-skel-shimmer" style={{ height: 14, borderRadius: 4, width: c === 0 ? '50%' : '80%' }} />
          ))}
        </div>
      ))}
    </div>
  );
}
