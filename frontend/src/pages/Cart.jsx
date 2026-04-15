import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../services/api';
import { useReveal } from '../hooks/useReveal';
import '../styles/Cart.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import CouponWidget from '../components/CouponWidget';

const Cart = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  // eslint-disable-next-line no-unused-vars
  const _deliveryConfig = useDeliveryConfig();
  const {
    cartItems,
    appliedCoupon,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCouponToContext,
    clearCoupon,
    getTotalPrice,
    getTotalItems
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState(null);
  const [notes, setNotes] = useState('');
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);

  const fmt = (p) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(p) + ' FCFA';

  // Auto-apply pending coupon from MyCoupons page
  useState(() => {
    const pending = localStorage.getItem('pending_coupon_code');
    if (pending && !appliedCoupon) {
      setCouponCode(pending);
      localStorage.removeItem('pending_coupon_code');
    }
  });

  const subtotal = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const allEbooks = cartItems.every(i => i.format === 'EBOOK');
  const discountPercent = appliedCoupon?.discountPercent ?? 0;
  const discountFixed = appliedCoupon?.discountAmount ?? 0;
  const discountAmt = discountPercent > 0
    ? (subtotal * discountPercent) / 100
    : Math.min(discountFixed, subtotal);
  const total = subtotal - discountAmt; // Livraison calculee au checkout

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ ok: false, text: t('cart.enterCoupon') });
      return;
    }
    setApplying(true);
    setCouponMsg(null);
    try {
      const res = await couponAPI.validate(code);
      const data = res.data;
      if (data.valid) {
        applyCouponToContext({
          code: code,
          discountPercent: data.discount_type === 'PERCENT' ? (data.discount_value ?? data.discount_percent ?? 0) : 0,
          discountAmount: data.discount_type === 'FIXED' ? (data.discount_value ?? data.discount_amount ?? 0) : 0,
          freeShipping: data.discount_type === 'FREE_SHIPPING',
        });
        setCouponMsg({ ok: true, text: data.message });
      } else {
        clearCoupon();
        setCouponMsg({ ok: false, text: data.message || t('cart.invalidCoupon') });
      }
    } catch (err) {
      clearCoupon();
      const msg = err.response?.data?.message || t('cart.invalidCoupon');
      setCouponMsg({ ok: false, text: msg });
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    clearCoupon();
    setCouponCode('');
    setCouponMsg(null);
  };

  const checkout = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: '/cart' } }); return; }
    if (!cartItems.length) return;
    setChecking(true);
    setTimeout(() => {
      navigate('/checkout', { state: { orderNotes: notes } });
    }, 500);
  };

  /* ── PANIER VIDE ── */
  if (!cartItems.length) {
    return (
      <div className="crt-page">
        <SEO title={t('cart.pageTitle')} />
        <PageHero
          title={t('cart.pageTitle')}
          subtitle={t('cart.emptyText')}
        />

        <div className="crt-content">
          <div className="crt-empty">
            <div className="crt-empty__ico"><i className="fas fa-shopping-bag" /></div>
            <h2>{t('cart.emptyTitle')}</h2>
            <p>{t('cart.emptyText')}</p>
            <div className="crt-empty__actions">
              <Link to="/catalog" className="crt-btn crt-btn--primary">
                <i className="fas fa-book" /> {t('cart.browseCatalog')}
              </Link>
            </div>
            <div className="crt-empty__features">
              {[
                { ico: 'fas fa-truck', t: 'Livraison rapide', d: '2-5 jours au Gabon' },
                { ico: 'fas fa-mobile-alt', t: 'Paiement', d: 'Mobicash, Airtel, Espèces, Visa' },
                { ico: 'fas fa-lock', t: 'Paiement sécurisé', d: 'Transactions protégées' },
              ].map((f) => (
                <div className="crt-feat" key={f.t}>
                  <div className="crt-feat__ico"><i className={f.ico} /></div>
                  <strong>{f.t}</strong>
                  <span>{f.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="crt-footer-fade" />
      </div>
    );
  }

  /* ── PANIER REMPLI ── */
  return (
    <div className="crt-page">
      <PageHero
        title={t('cart.pageTitle')}
        subtitle={t('cart.itemCount', { count: getTotalItems(), s: getTotalItems() > 1 ? 's' : '' })}
      />

      <div className="crt-content reveal-section" ref={revealRef}>
        <div className="crt-layout">

          {/* ── COLONNE ARTICLES ── */}
          <div className="crt-items">
            <div className="crt-items__head">
              <h2>{t('cart.articles')}</h2>
              <button onClick={clearCart} className="crt-clear">
                <i className="fas fa-trash-alt" /> {t('cart.clear')}
              </button>
            </div>

            {cartItems.map((item) => (
              <div className="crt-card" key={item._cartKey || item.id}>
                <div
                  className="crt-card__img"
                  onClick={() => navigate(`/books/${item.id}`)}
                >
                  <img
                    src={item.cover_image || '/images/default-book-cover.svg'}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="crt-card__body">
                  <div className="crt-card__top">
                    <h3
                      className="crt-card__title"
                      onClick={() => navigate(`/books/${item.id}`)}
                    >
                      {item.title}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.id, item.listing_id)}
                      className="crt-card__rm"
                      aria-label="Retirer"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                  <p className="crt-card__author">
                    {item.author?.full_name || 'Auteur inconnu'}
                  </p>
                  <div className="crt-card__meta">
                    {item.format && (
                      <span className="crt-card__format">
                        {item.format === 'EBOOK' ? 'Ebook' : 'Papier'}
                      </span>
                    )}
                    {item.vendor_name && (
                      <span className="crt-card__vendor">
                        <i className="fas fa-store" /> {item.vendor_name}
                      </span>
                    )}
                    {item.condition && (
                      <span className={`crt-card__condition crt-card__condition--${item.condition === 'NEW' ? 'new' : 'used'}`}>
                        {item.condition === 'NEW' ? 'Neuf' : item.condition === 'USED_GOOD' ? 'Occasion — Bon état' : 'Occasion'}
                      </span>
                    )}
                  </div>
                  <div className="crt-card__bottom">
                    <div className="crt-qty">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.listing_id)}
                        disabled={item.quantity <= 1}
                      >−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1), item.listing_id)}
                        disabled={item.quantity >= 99}
                      >+</button>
                    </div>
                    <div className="crt-card__price">
                      <span className="crt-card__unit">{fmt(item.price)} × {item.quantity}</span>
                      <strong>{fmt(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── COLONNE RÉSUMÉ ── */}
          <div className="crt-summary">
            <div className="crt-sum-card">
              <h2>{t('cart.summary')}</h2>

              {/* Widget coupons applicables */}
              <CouponWidget />

              {/* Coupon */}
              <div className="crt-coupon">
                <label>{t('cart.couponLabel')}</label>
                <div className="crt-coupon__row">
                  <input
                    type="text"
                    placeholder="Ex: MAISON10"
                    value={appliedCoupon?.code ?? couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    readOnly={!!appliedCoupon}
                  />
                  <button onClick={applyCoupon} disabled={applying || !couponCode.trim()}>
                    {applying ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : t('cart.couponApply')}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`crt-coupon__msg ${couponMsg.ok ? 'ok' : 'err'}`}>
                    <i className={`fas fa-${couponMsg.ok ? 'check' : 'times'}-circle`} />
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Prix */}
              <div className="crt-prices">
                <div className="crt-row">
                  <span>{t('cart.subtotal')}</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="crt-row crt-row--discount">
                    <span>
                      Réduction {appliedCoupon?.code && `(${appliedCoupon.code})`}
                      {discountPercent > 0 ? ` (${discountPercent}%)` : ''}
                      <button type="button" onClick={removeCoupon} className="crt-coupon-remove" aria-label={t('cart.removeCoupon')}>×</button>
                    </span>
                    <span>-{fmt(discountAmt)}</span>
                  </div>
                )}
                <div className="crt-row">
                  <span>{t('cart.shipping', 'Livraison')}</span>
                  {allEbooks ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Gratuit (ebook)</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>
                      <i className="fas fa-truck" style={{ marginRight: '0.25rem' }} />
                      Au checkout
                    </span>
                  )}
                </div>
                {!allEbooks && (
                  <div className="crt-delivery-notice">
                    <i className="fas fa-info-circle" />
                    <span>Les frais de livraison seront calcules selon le livreur que vous choisirez au checkout.</span>
                  </div>
                )}
                <div className="crt-row crt-row--total">
                  <span>{t('cart.total')} {!allEbooks && <em style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--color-text-muted-ui)' }}>(hors livraison)</em>}</span>
                  <strong>{fmt(total)}</strong>
                </div>
              </div>

              {/* Notes */}
              <div className="crt-notes">
                <label>Notes (optionnel)</label>
                <textarea
                  rows="3"
                  placeholder="Instructions spéciales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Actions */}
              <div className="crt-actions">
                <button onClick={checkout} disabled={checking} className="crt-btn crt-btn--primary crt-btn--full">
                  {checking ? 'Traitement...' : <>{t('cart.checkout')} <span>{fmt(total)}</span></>}
                </button>
                <button onClick={() => navigate('/catalog')} className="crt-btn crt-btn--outline crt-btn--full">
                  {t('cart.continueShopping')}
                </button>
              </div>

              {/* Garanties */}
              <div className="crt-guarantees">
                {[
                  { ico: 'fas fa-lock', t: 'Paiement sécurisé' },
                  { ico: 'fas fa-mobile-alt', t: 'Mobicash, Airtel, Espèces, Visa' },
                  { ico: 'fas fa-truck', t: 'Livraison rapide' },
                ].map((g) => (
                  <div className="crt-guar" key={g.t}>
                    <i className={g.ico} /> {g.t}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
      <div className="crt-footer-fade" />
    </div>
  );
};

export default Cart;
