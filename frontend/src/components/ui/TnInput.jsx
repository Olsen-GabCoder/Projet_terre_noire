/**
 * TnInput — React wrapper for elevated .tn-input CSS (Vague 2 P2.3)
 *
 * Usage:
 *   <TnInput label="Email" name="email" type="email" required
 *     error={errors.email} leftIcon={<i className="fas fa-envelope" />} />
 */
import React, { useId } from 'react';

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
  className = '',
  ...rest
}) {
  const autoId = useId();
  const inputId = rest.id || `tn-input-${autoId}`;
  const errorId = error ? `${inputId}-error` : undefined;

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
    rightIcon && 'tn-field__wrap--has-right',
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
          type={type}
          className={inputClasses}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={errorId}
          {...rest}
        />
        {rightIcon && <span className="tn-field__icon tn-field__icon--right" aria-hidden="true">{rightIcon}</span>}
      </div>
      {error && <span className="tn-field__error" id={errorId} role="alert"><i className="fas fa-circle-exclamation" /> {error}</span>}
      {helper && !error && <span className="tn-field__helper">{helper}</span>}
    </div>
  );
}
