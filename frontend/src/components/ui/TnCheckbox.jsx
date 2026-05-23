/**
 * TnCheckbox — Custom checkbox (Vague 2.5 P5)
 *
 * Usage:
 *   <TnCheckbox label="J'accepte les CGV" checked={agreed}
 *     onChange={(checked) => setAgreed(checked)} required error={errors.cgv} />
 */
import React from 'react';

const cn = (...c) => c.filter(Boolean).join(' ');

export default function TnCheckbox({
  label,
  checked,
  onChange,
  name,
  required = false,
  error,
  helper,
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <>
      <label className={cn('tn-checkbox', disabled && 'tn-checkbox--disabled', error && 'tn-checkbox--error', className)}>
        <input
          type="checkbox"
          className="tn-checkbox__input"
          checked={checked}
          onChange={e => onChange?.(e.target.checked)}
          name={name}
          disabled={disabled}
          required={required}
          {...rest}
        />
        <span className="tn-checkbox__box">
          <svg className="tn-checkbox__check" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {label && <span className={cn('tn-checkbox__label', required && 'tn-checkbox__label--required')}>{label}</span>}
      </label>
      {error && <span className="tn-checkbox__error" role="alert"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {error}</span>}
      {!error && helper && <span className="tn-checkbox__helper">{helper}</span>}
    </>
  );
}
