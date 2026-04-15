import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { couponAPI } from '../services/api';
import '../styles/CouponWidget.css';

const CouponWidget = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { cartItems, appliedCoupon, applyCouponToContext } = useCart();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || cartItems.length === 0 || appliedCoupon) {
      setCoupons([]);
      return;
    }
    const bookIds = cartItems.map((item) => item.id);
    if (bookIds.length === 0) return;

    setLoading(true);
    couponAPI.getApplicable(bookIds)
      .then(({ data }) => setCoupons(data || []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, cartItems, appliedCoupon]);

  if (!isAuthenticated || coupons.length === 0 || appliedCoupon) return null;

  const handleApply = (coupon) => {
    applyCouponToContext({
      code: coupon.code,
      discountPercent: coupon.discount_type === 'PERCENT' ? parseFloat(coupon.discount_value) : 0,
      discountAmount: coupon.discount_type === 'FIXED' ? parseFloat(coupon.discount_value) : 0,
      freeShipping: coupon.discount_type === 'FREE_SHIPPING',
    });
  };

  const discountLabel = (c) => {
    if (c.discount_type === 'PERCENT') return `-${parseFloat(c.discount_value)}%`;
    if (c.discount_type === 'FIXED') return `-${parseInt(c.discount_value)} FCFA`;
    return t('coupons.type.FREE_SHIPPING');
  };

  if (loading) return null;

  return (
    <div className="coupon-widget">
      <div className="coupon-widget__header">
        <i className="fas fa-ticket-alt" />
        <span>{t('coupons.widget.title')}</span>
        <span className="coupon-widget__count">
          {t('coupons.widget.applicable', { count: coupons.length })}
        </span>
      </div>
      <div className="coupon-widget__list">
        {coupons.map((coupon) => {
          const accentHex = coupon.template_accent_color || '#5b5eea';
          const r = parseInt(accentHex.slice(1, 3), 16);
          const g = parseInt(accentHex.slice(3, 5), 16);
          const b = parseInt(accentHex.slice(5, 7), 16);
          const bgAlpha = `rgba(${r},${g},${b},0.1)`;
          return (
          <div key={coupon.id} className="coupon-widget__card" style={{ borderLeft: `3px solid ${accentHex}` }}>
            <div className="coupon-widget__info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: bgAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: accentHex, flexShrink: 0 }}>
                <i className={coupon.template_icon || 'fas fa-ticket-alt'} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="coupon-widget__discount" style={{ color: accentHex }}>{discountLabel(coupon)}</span>
                {coupon.template_commercial_title && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {coupon.template_commercial_title}
                  </div>
                )}
                {(coupon.emitter_name || coupon.organization_name) && (
                  <span className="coupon-widget__org">{coupon.emitter_name || coupon.organization_name}</span>
                )}
                {coupon.min_order_amount > 0 && (
                  <span className="coupon-widget__min">Min. {parseInt(coupon.min_order_amount)} FCFA</span>
                )}
              </div>
            </div>
            <button className="coupon-widget__apply" onClick={() => handleApply(coupon)}>
              {t('coupons.widget.apply')}
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default CouponWidget;
