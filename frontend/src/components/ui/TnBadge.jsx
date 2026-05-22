/**
 * TnBadge — React wrapper for centralized .tn-badge CSS (Vague 2 P2.4)
 *
 * Usage:
 *   <TnBadge variant="promo">-30%</TnBadge>
 *   <TnBadge variant="success" badgeStyle="soft" leftIcon={<i className="fas fa-check" />}>Payee</TnBadge>
 *   <TnBadge variant="count" count={3} />
 */
import React from 'react';

export default function TnBadge({
  variant = 'neutral',
  size = 'sm',
  badgeStyle = 'solid',
  pill = false,
  pop = false,
  leftIcon,
  count,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'tn-badge',
    `tn-badge--${variant}`,
    badgeStyle !== 'solid' && `tn-badge--${badgeStyle}`,
    size !== 'sm' && `tn-badge--${size}`,
    pill && 'tn-badge--pill',
    pop && 'tn-badge--pop',
    className,
  ].filter(Boolean).join(' ');

  const content = variant === 'count' && count !== undefined ? count : children;

  return (
    <span className={classes} {...rest}>
      {leftIcon && <span aria-hidden="true" style={{ display: 'inline-flex', fontSize: '0.82em' }}>{leftIcon}</span>}
      {content}
    </span>
  );
}
