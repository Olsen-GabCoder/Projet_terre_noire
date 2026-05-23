/**
 * TnInput — React wrapper for elevated .tn-input CSS (Vague 2 P2.3)
 *
 * Usage:
 *   <TnInput label="Email" name="email" type="email" required
 *     error={errors.email} leftIcon={<i className="fas fa-envelope" />} />
 */
import React, { useId, useState } from 'react';

export default function TnInput({
  label,
  name,
  type = 'text',
  size,
  variant,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helper,
  leftIcon,
  rightIcon,
  showToggle = false,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const inputId = rest.id || `tn-input-${autoId}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const [revealed, setRevealed] = useState(false);
  const isPasswordToggle = showToggle && type === 'password';
  const effectiveType = isPasswordToggle && revealed ? 'text' : type;

  const inputClasses = [
    'tn-input',
    size && `tn-input--${size}`,
    variant && `tn-input--${variant}`,
    error && 'tn-input--error',
    className,
  ].filter(Boolean).join(' ');

  const wrapClasses = [
    'tn-field__wrap',
    leftIcon && 'tn-field__wrap--has-left',
    (rightIcon || isPasswordToggle) && 'tn-field__wrap--has-right',
  ].filter(Boolean).join(' ');

  return (
    <div className="tn-field">
      {label && (
        <label className={`tn-field__label${required ? ' tn-field__label--required' : ''}`} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={wrapClasses}>
        {leftIcon && <span className="tn-field__icon tn-field__icon--left" aria-hidden="true">{leftIcon}</span>}
        <input
          id={inputId}
          name={name}
          type={effectiveType}
          className={inputClasses}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={errorId}
          {...rest}
        />
        {isPasswordToggle ? (
          <button
            type="button"
            className="tn-field__toggle"
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <i className={`fas ${revealed ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
          </button>
        ) : rightIcon ? (
          <span className="tn-field__icon tn-field__icon--right" aria-hidden="true">{rightIcon}</span>
        ) : null}
      </div>
      {error && <span className="tn-field__error" id={errorId} role="alert"><i className="fas fa-circle-exclamation" /> {error}</span>}
      {helper && !error && <span className="tn-field__helper">{helper}</span>}
    </div>
  );
}
