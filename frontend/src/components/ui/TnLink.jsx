/**
 * TnLink — React wrapper for .tn-link CSS (Vague 2.5 P1)
 *
 * Usage:
 *   <TnLink to="/catalog">Voir le catalogue</TnLink>
 *   <TnLink href="https://instagram.com/terrenoire">Instagram</TnLink>
 *   <TnLink variant="strong" to="/authors" rightIcon={<i className="fas fa-arrow-right" />}>
 *     Decouvrir nos auteurs
 *   </TnLink>
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function TnLink({
  to,
  href,
  variant = 'default',
  onDark = false,
  external = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...rest
}) {
  const isExternal = external || (
    href &&
    /^https?:\/\//.test(href) &&
    typeof window !== 'undefined' &&
    !href.includes(window.location.hostname)
  );

  const classes = [
    'tn-link',
    variant !== 'default' && `tn-link--${variant}`,
    onDark && 'tn-link--on-dark',
    isExternal && 'tn-link--external',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {leftIcon && <span className="tn-link__icon" aria-hidden="true">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="tn-link__icon tn-link__icon--right" aria-hidden="true">{rightIcon}</span>}
    </>
  );

  if (to) {
    return <Link to={to} className={classes} {...rest}>{content}</Link>;
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return <a href={href} className={classes} {...rest}>{content}</a>;
}
