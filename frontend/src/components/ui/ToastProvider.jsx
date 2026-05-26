/**
 * ToastProvider + useToast + ConfirmModal
 * Design system Terre Noire Editions — ultra-premium
 *
 * Usage:
 *   // Wrap app once
 *   <ToastProvider><App /></ToastProvider>
 *
 *   // In any component
 *   const { toast, confirm } = useToast();
 *   toast.success('Livre cree');
 *   toast.error('Echec de la suppression');
 *   const ok = await confirm({ title: 'Supprimer ?', message: '...' });
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/* ─────────────────────────────────────────────
   CONTEXT
   ───────────────────────────────────────────── */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

/* ─────────────────────────────────────────────
   TOAST CONFIG
   ───────────────────────────────────────────── */
const TOAST_TYPES = {
  success: {
    icon: 'fa-circle-check',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    accent: '#2E7D32',
    accentLight: 'rgba(46,125,50,0.25)',
    iconBg: 'rgba(46,125,50,0.15)',
  },
  error: {
    icon: 'fa-circle-xmark',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    accent: '#C62828',
    accentLight: 'rgba(198,40,40,0.25)',
    iconBg: 'rgba(198,40,40,0.15)',
  },
  warning: {
    icon: 'fa-triangle-exclamation',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    accent: '#E65100',
    accentLight: 'rgba(230,81,0,0.25)',
    iconBg: 'rgba(230,81,0,0.15)',
  },
  info: {
    icon: 'fa-circle-info',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    accent: '#1565C0',
    accentLight: 'rgba(21,101,192,0.25)',
    iconBg: 'rgba(21,101,192,0.2)',
  },
};

const DURATION = 4000;
let toastId = 0;

/* ─────────────────────────────────────────────
   SINGLE TOAST
   ───────────────────────────────────────────── */
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function Toast({ id, type, message, onDismiss }) {
  const cfg = TOAST_TYPES[type] || TOAST_TYPES.info;
  const [state, setState] = useState(prefersReducedMotion ? 'visible' : 'entering');
  const timerRef = useRef(null);

  useEffect(() => {
    // Enter
    const enterTimer = prefersReducedMotion ? null : setTimeout(() => setState('visible'), 10);
    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), DURATION);
    return () => { if (enterTimer) clearTimeout(enterTimer); clearTimeout(timerRef.current); };
  }, []);

  const dismiss = () => {
    if (prefersReducedMotion) { onDismiss(id); return; }
    setState('exiting');
    setTimeout(() => onDismiss(id), 300);
  };

  const transform = prefersReducedMotion ? 'none' :
    state === 'entering' ? 'translateX(120%)' :
    state === 'exiting'  ? 'translateX(120%) scale(0.95)' :
                           'translateX(0)';

  return (
    <div
      role="alert"
      onClick={dismiss}
      style={{
        background: cfg.bg,
        borderRadius: 14,
        padding: '16px 20px 16px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        borderLeft: `4px solid ${cfg.accent}`,
        transform,
        opacity: state === 'exiting' ? 0 : 1,
        transition: prefersReducedMotion ? 'none' : 'all 0.35s cubic-bezier(.2,.7,.3,1)',
        maxWidth: 420,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Motif background */}
      <div className="tn-motif-bg" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }} />

      {/* Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: cfg.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: cfg.accent, fontSize: 16,
        position: 'relative',
      }}>
        <i className={`fas ${cfg.icon}`} />
      </div>

      {/* Message */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--tn-mono, monospace)', fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: cfg.accent, marginBottom: 4, fontWeight: 700,
        }}>
          {type === 'success' ? 'Succes' : type === 'error' ? 'Erreur' : type === 'warning' ? 'Attention' : 'Information'}
        </div>
        <div style={{
          fontFamily: 'var(--tn-sans, sans-serif)', fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.85)', lineHeight: 1.45,
        }}>
          {message}
        </div>
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Fermer la notification"
        style={{
          width: 24, height: 24, borderRadius: 6, border: 0,
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.4)', fontSize: 10,
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
      >
        <i className="fas fa-times" />
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: cfg.accentLight, borderRadius: '0 0 14px 14px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: cfg.accent, borderRadius: '0 0 0 14px',
          animation: state === 'visible' ? `toast-progress ${DURATION}ms linear forwards` : 'none',
        }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONFIRM MODAL
   ───────────────────────────────────────────── */
function ConfirmModal({ config, onResult }) {
  const [state, setState] = useState('entering');
  const modalRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const {
    title = 'Confirmer',
    message = 'Etes-vous sur ?',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    tone = 'danger', // 'danger' | 'warning' | 'info'
    icon,
  } = config;

  const toneMap = {
    danger:  { color: '#C62828', bg: 'rgba(198,40,40,0.08)', iconBg: 'rgba(198,40,40,0.12)', icon: icon || 'fa-trash-can' },
    warning: { color: '#E65100', bg: 'rgba(230,81,0,0.08)', iconBg: 'rgba(230,81,0,0.12)', icon: icon || 'fa-triangle-exclamation' },
    info:    { color: '#1565C0', bg: 'rgba(21,101,192,0.08)', iconBg: 'rgba(21,101,192,0.12)', icon: icon || 'fa-circle-info' },
  };
  const t = toneMap[tone] || toneMap.danger;

  useEffect(() => {
    setTimeout(() => setState('visible'), 10);
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const getFocusables = () => modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusables = getFocusables();
    if (focusables.length > 0) focusables[0].focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onResultRef.current(false); return; }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = (result) => {
    setState('exiting');
    setTimeout(() => onResult(result), 250);
  };

  const overlayOpacity = state === 'entering' ? 0 : state === 'exiting' ? 0 : 1;
  const modalTransform =
    state === 'entering' ? 'scale(0.92) translateY(20px)' :
    state === 'exiting'  ? 'scale(0.95) translateY(10px)' :
                           'scale(1) translateY(0)';

  return (
    <div
      onClick={() => close(false)}
      className="tn-modal-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        opacity: overlayOpacity,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="tn-mist-top"
        style={{
          background: 'var(--ds-white)', borderRadius: 20,
          maxWidth: 440, width: '100%',
          boxShadow: '0 24px 64px -16px rgba(232,96,28,0.15), 0 8px 24px rgba(0,0,0,0.12)',
          transform: modalTransform,
          opacity: state === 'exiting' ? 0 : 1,
          transition: 'all 0.3s cubic-bezier(.2,.7,.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header accent */}
        <div style={{
          height: 4, background: `linear-gradient(90deg, ${t.color}, var(--tn-orange, #E8601C))`,
        }} />

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: t.iconBg, color: t.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, margin: '0 auto 18px',
          }}>
            <i className={`fas ${t.icon}`} />
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--tn-serif, Georgia, serif)',
            fontSize: 22, fontWeight: 700, textAlign: 'center',
            margin: '0 0 10px', color: 'var(--tn-gray-900, #1a1a1a)',
            letterSpacing: '-0.01em',
          }}>{title}</h3>

          {/* Message */}
          <p style={{
            fontSize: 14, lineHeight: 1.6, textAlign: 'center',
            color: 'var(--tn-gray-500, #6b7280)', margin: '0 0 24px',
            maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
          }}>{message}</p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => close(false)}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 10,
                background: 'var(--ds-white)', color: 'var(--tn-gray-700, #374151)',
                border: '1.5px solid var(--tn-gray-200, #e5e7eb)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 140ms ease',
                fontFamily: 'var(--tn-sans, sans-serif)',
              }}
            >{cancelLabel}</button>
            <button
              onClick={() => close(true)}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 10,
                background: t.color, color: 'var(--ds-white)', border: 'none',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 140ms ease',
                fontFamily: 'var(--tn-sans, sans-serif)',
                boxShadow: `0 4px 14px ${t.color}40`,
              }}
            >{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROVIDER
   ───────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const addToast = useCallback((type, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]); // max 5
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info:    (msg) => addToast('info', msg),
  };

  const confirm = useCallback((config) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState(config);
    });
  }, []);

  const handleConfirmResult = (result) => {
    setConfirmState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast container — top-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 10001,
          display: 'flex', flexDirection: 'column', gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast id={t.id} type={t.type} message={t.message} onDismiss={removeToast} />
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <ConfirmModal config={confirmState} onResult={handleConfirmResult} />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export default ToastProvider;
