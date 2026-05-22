/**
 * TnDivider — Visual separator (Vague 2.5 P4)
 *
 * Usage:
 *   <TnDivider />
 *   <TnDivider variant="ornament" spacing="lg" />
 *   <TnDivider label="OU" spacing="md" />
 *   <TnDivider variant="dashed" onDark />
 */
import React from 'react';

const cn = (...c) => c.filter(Boolean).join(' ');

const DiamondOrnament = () => (
  <svg className="tn-divider__ornament" width="24" height="8" viewBox="0 0 24 8" fill="none" aria-hidden="true">
    <path d="M0 4 L4 0 L8 4 L12 0 L16 4 L20 0 L24 4" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export default function TnDivider({
  variant = 'ornament',
  spacing,
  onDark = false,
  dark = false,
  label,
  className = '',
  style,
  ...rest
}) {
  const isDark = onDark || dark;

  const classes = cn(
    'tn-divider',
    variant !== 'default' && `tn-divider--${variant}`,
    spacing && `tn-divider--${spacing}`,
    isDark && 'tn-divider--dark',
    className
  );

  if (label) {
    return (
      <div className={classes} role="separator" aria-orientation="horizontal" style={style} {...rest}>
        <span className="tn-divider__line" />
        <span className="tn-divider__label">{label}</span>
        <span className="tn-divider__line" />
      </div>
    );
  }

  if (variant === 'ornament') {
    return (
      <div className={classes} role="separator" aria-orientation="horizontal" style={style} {...rest}>
        <span className="tn-divider__line" />
        <DiamondOrnament />
        <span className="tn-divider__line" />
      </div>
    );
  }

  return (
    <div className={classes} role="separator" aria-orientation="horizontal" style={style} {...rest}>
      <span className="tn-divider__line" />
    </div>
  );
}
