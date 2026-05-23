/**
 * TnAlert — Contextual feedback alert (Vague 2.5 P6)
 *
 * Usage:
 *   <TnAlert variant="error">Email ou mot de passe incorrect.</TnAlert>
 *   <TnAlert variant="success" title="Inscription reussie" onClose={() => setShow(false)}>
 *     Bienvenue sur Terre Noire Editions.
 *   </TnAlert>
 */
import React from 'react';

const ICONS = {
  error:   'fas fa-circle-exclamation',
  success: 'fas fa-circle-check',
  warning: 'fas fa-triangle-exclamation',
  info:    'fas fa-circle-info',
};

export default function TnAlert({
  variant = 'error',
  icon,
  title,
  onClose,
  children,
  className = '',
  ...rest
}) {
  const iconClass = icon === false ? null : (icon || ICONS[variant]);

  return (
    <div
      className={`tn-alert tn-alert--${variant}${className ? ' ' + className : ''}`}
      role="alert"
      {...rest}
    >
      {iconClass && (
        <span className="tn-alert__icon">
          <i className={iconClass} aria-hidden="true" />
        </span>
      )}
      <div className="tn-alert__content">
        {title && <div className="tn-alert__title">{title}</div>}
        <div className="tn-alert__message">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="tn-alert__close"
          aria-label="Fermer"
          onClick={onClose}
        >
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
