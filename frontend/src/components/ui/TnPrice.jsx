/**
 * TnPrice — Price display for Terre Noire Editions (Vague 2.5 P2)
 *
 * Usage:
 *   <TnPrice amount={15000} />
 *   <TnPrice amount={15000} oldAmount={20000} size="lg" layout="vertical" />
 *   <TnPrice amount={0} />  // renders "Gratuit"
 *   <TnPrice amount={15000} rangeMax={25000} />
 */
import React from 'react';

function formatPrice(amount, locale = 'fr-FR') {
  if (typeof amount !== 'number') return amount;
  return Math.round(amount).toLocaleString(locale).replace(/\s/g, '\u00A0');
}

function calculateDiscount(original, current) {
  if (!original || !current || original <= current) return null;
  return `-${Math.round(((original - current) / original) * 100)}%`;
}

export default function TnPrice({
  amount,
  oldAmount,
  originalAmount,
  size = 'md',
  variant,
  rangeMax,
  layout = 'horizontal',
  showDiscount,
  currency = 'FCFA',
  locale = 'fr-FR',
  className = '',
  ...rest
}) {
  const original = originalAmount ?? oldAmount;

  const effectiveVariant = variant
    ?? (amount === 0 ? 'free'
       : rangeMax ? 'range'
       : original && original > amount ? 'promo'
       : 'default');

  const effectiveShowDiscount = showDiscount ?? (effectiveVariant === 'promo');

  const baseClasses = ['tn-price', `tn-price--${size}`, className]
    .filter(Boolean).join(' ');

  if (effectiveVariant === 'free') {
    return (
      <span className={`${baseClasses} tn-price--free`} {...rest}>
        Gratuit
      </span>
    );
  }

  if (effectiveVariant === 'range') {
    return (
      <span className={`${baseClasses} tn-price--muted`} {...rest}>
        {formatPrice(amount, locale)}
        <span className="tn-price__range-sep">—</span>
        {formatPrice(rangeMax, locale)}
        <span className="tn-price__currency">{currency}</span>
      </span>
    );
  }

  if (effectiveVariant === 'promo') {
    const discount = calculateDiscount(original, amount);
    const groupClass = layout === 'vertical'
      ? 'tn-price-group tn-price-group--vertical'
      : 'tn-price-group';

    return (
      <span className={groupClass} {...rest}>
        <span className={baseClasses}>
          {formatPrice(amount, locale)}
          <span className="tn-price__currency">{currency}</span>
        </span>
        {original && (
          <span className="tn-price--strike">
            {formatPrice(original, locale)}
            <span className="tn-price__strike-currency">{currency}</span>
          </span>
        )}
        {effectiveShowDiscount && discount && (
          <span className="tn-price__discount">{discount}</span>
        )}
      </span>
    );
  }

  const variantClass = effectiveVariant === 'muted' ? ' tn-price--muted' : '';
  return (
    <span className={baseClasses + variantClass} {...rest}>
      {formatPrice(amount, locale)}
      <span className="tn-price__currency">{currency}</span>
    </span>
  );
}
