/**
 * TnButton — React wrapper for elevated .tn-btn CSS (Vague 2 P2.1)
 *
 * Usage:
 *   <TnButton variant="primary" size="lg" onClick={handleClick}>
 *     Finaliser la commande
 *   </TnButton>
 *
 *   <TnButton variant="danger" loading={saving} leftIcon={<i className="fas fa-trash" />}>
 *     Supprimer
 *   </TnButton>
 */
import React from 'react';

const VARIANTS = ['primary', 'secondary', 'dark', 'outline', 'outline-light', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

export default function TnButton({
  variant = 'primary',
  size = 'md',
  type = 'button',
  block = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'tn-btn',
    `tn-btn--${variant}`,
    size !== 'md' && `tn-btn--${size}`,
    block && 'tn-btn--block',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading && <span className="tn-btn__spinner" aria-hidden="true" />}
      {!loading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
}
