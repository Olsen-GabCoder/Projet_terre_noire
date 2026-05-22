/**
 * TnTextarea — React wrapper for elevated .tn-input on <textarea>
 *
 * Usage:
 *   <TnTextarea label="Message" name="message" rows={5} required
 *     error={errors.message} />
 */
import React, { useId, useRef, useCallback } from 'react';

export default function TnTextarea({
  label,
  name,
  rows = 4,
  autoResize = false,
  size,
  variant,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helper,
  className = '',
  onChange,
  ...rest
}) {
  const autoId = useId();
  const inputId = rest.id || `tn-textarea-${autoId}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const ref = useRef(null);

  const handleChange = useCallback((e) => {
    if (autoResize && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
    onChange?.(e);
  }, [autoResize, onChange]);

  const inputClasses = [
    'tn-input',
    size && `tn-input--${size}`,
    variant && `tn-input--${variant}`,
    error && 'tn-input--error',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="tn-field">
      {label && (
        <label className={`tn-field__label${required ? ' tn-field__label--required' : ''}`} htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        rows={rows}
        className={inputClasses}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={errorId}
        onChange={handleChange}
        style={autoResize ? { resize: 'none', overflow: 'hidden' } : undefined}
        {...rest}
      />
      {error && <span className="tn-field__error" id={errorId} role="alert"><i className="fas fa-circle-exclamation" /> {error}</span>}
      {helper && !error && <span className="tn-field__helper">{helper}</span>}
    </div>
  );
}
