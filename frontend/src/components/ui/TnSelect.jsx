/**
 * TnSelect — React wrapper for elevated .tn-input on <select>
 *
 * Usage:
 *   <TnSelect label="Categorie" name="category" required
 *     options={[{ value: '1', label: 'Roman' }, { value: '2', label: 'Poesie' }]}
 *     error={errors.category} />
 */
import React, { useId } from 'react';

export default function TnSelect({
  label,
  name,
  options = [],
  placeholder,
  size,
  variant,
  required = false,
  disabled = false,
  error,
  helper,
  leftIcon,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const selectId = rest.id || `tn-select-${autoId}`;
  const errorId = error ? `${selectId}-error` : undefined;

  const selectClasses = [
    'tn-input',
    size && `tn-input--${size}`,
    variant && `tn-input--${variant}`,
    error && 'tn-input--error',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="tn-field">
      {label && (
        <label className={`tn-field__label${required ? ' tn-field__label--required' : ''}`} htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className={`tn-field__wrap tn-field__wrap--has-right${leftIcon ? ' tn-field__wrap--has-left' : ''}`}>
        {leftIcon && <span className="tn-field__icon tn-field__icon--left" aria-hidden="true">{leftIcon}</span>}
        <select
          id={selectId}
          name={name}
          className={selectClasses}
          disabled={disabled}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={errorId}
          style={{ cursor: 'pointer', appearance: 'none', paddingRight: 40 }}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="tn-field__icon tn-field__icon--right" aria-hidden="true">
          <i className="fas fa-chevron-down" style={{ fontSize: 12 }} />
        </span>
      </div>
      {error && <span className="tn-field__error" id={errorId} role="alert"><i className="fas fa-circle-exclamation" /> {error}</span>}
      {helper && !error && <span className="tn-field__helper">{helper}</span>}
    </div>
  );
}
