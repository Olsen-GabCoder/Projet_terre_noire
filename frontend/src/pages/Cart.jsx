import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import { useTranslation } from 'react-i18next';
import { couponAPI } from '../services/api';
import { useReveal } from '../hooks/useReveal';
import aiService from '../services/aiService';
import { BookItem } from '../components/home';
import '../styles/Cart.css';
import '../styles/Home.css';
import SEO from '../components/SEO';
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
  const [crossSell, setCrossSell] = useState([]);
  const [crossSellLoaded, setCrossSellLoaded] = useState(false);

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

  // Cross-sell IA — fetch once when cart has items
  useEffect(() => {
    if (cartItems.length && isAuthenticated && !crossSellLoaded) {
      const bookIds = cartItems.map(i => i.id);
      aiService.crossSell(bookIds).then(data => {
        setCrossSell(data.suggestions || []);
      }).catch(() => {}).finally(() => setCrossSellLoaded(true));
    }
  }, [cartItems.length, isAuthenticated, crossSellLoaded]);

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
        <header className="crt-topbar">
          <div>
            <span className="crt-topbar__eyebrow">— {t('cart.pageTitle')}</span>
            <h1 className="crt-topbar__title">{t('cart.emptyTitle')}</h1>
          </div>
        </header>

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
                { ico: 'fas fa-truck', t: t('cart.fastDelivery'), d: t('cart.deliveryTime') },
                { ico: 'fas fa-mobile-alt', t: t('cart.paymentLabel', 'Paiement'), d: t('cart.paymentMethods') },
                { ico: 'fas fa-lock', t: t('cart.securePayment'), d: t('cart.secureDesc', 'Transactions protégées') },
              ].map((f, idx) => (
                <div className="crt-feat" key={idx}>
                  <div className="crt-feat__ico"><i className={f.ico} /></div>
                  <strong>{f.t}</strong>
                  <span>{f.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── PANIER REMPLI ── */
  return (
    <div className="crt-page">
      <header className="crt-topbar">
        <div>
          <span className="crt-topbar__eyebrow">— {t('cart.pageTitle')} · {getTotalItems()} {t('cart.itemCount', { count: getTotalItems(), s: getTotalItems() > 1 ? 's' : '' })}</span>
          <h1 className="crt-topbar__title">{t('cart.pageTitle')}</h1>
        </div>
      </header>

      <div className="crt-content reveal-section" ref={revealRef}>
        {/* Stepper */}
        <div className="crt-stepper">
          {[
            { n: '01', label: t('cart.pageTitle', 'Panier'), sub: t('checkout.stepInProgress', 'En cours'), active: true },
            { n: '02', label: t('checkout.stepShippingPayment', 'Livraison & paiement'), sub: '—' },
            { n: '03', label: t('checkout.stepConfirmation', 'Confirmation'), sub: '—' },
          ].map((step) => (
            <div key={step.n} className={`crt-step${step.active ? ' crt-step--active' : ''}`}>
              <span className="crt-step__num">{step.n}</span>
              <div>
                <div className="crt-step__label">{step.label}</div>
                <div className="crt-step__sub">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>

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
                      aria-label={t('cart.remove')}
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
                        {item.format === 'EBOOK' ? t('cart.ebook', 'Ebook') : t('cart.paper', 'Papier')}
                      </span>
                    )}
                    {item.vendor_name && (
                      <span className="crt-card__vendor">
                        <i className="fas fa-store" /> {item.vendor_name}
                      </span>
                    )}
                    {item.condition && (
                      <span className={`crt-card__condition crt-card__condition--${item.condition === 'NEW' ? 'new' : 'used'}`}>
                        {item.condition === 'NEW' ? t('cart.conditionNew', 'Neuf') : item.condition === 'USED_GOOD' ? t('cart.conditionUsedGood', 'Occasion — Bon état') : t('cart.conditionUsed', 'Occasion')}
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

          {/* ── CROSS-SELL IA ── */}
          {crossSell.length > 0 && (
            <div className="crt-crosssell">
              <h3 className="crt-crosssell__title">
                <i className="fas fa-wand-magic-sparkles" /> Vous pourriez aussi aimer
              </h3>
              <div className="home-book-rack">
                {crossSell.slice(0, 4).map((sug, i) => {
                  const b = sug.book;
                  if (!b) return null;
                  return (
                    <BookItem
                      key={b.id || i}
                      book={{ ...b, ai_reason: sug.reason }}
                      showAiReason
                    />
                  );
                })}
              </div>
            </div>
          )}

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
                      {t('cart.discount')} {appliedCoupon?.code && `(${appliedCoupon.code})`}
                      {discountPercent > 0 ? ` (${discountPercent}%)` : ''}
                      <button type="button" onClick={removeCoupon} className="crt-coupon-remove" aria-label={t('cart.removeCoupon')}>×</button>
                    </span>
                    <span>-{fmt(discountAmt)}</span>
                  </div>
                )}
                <div className="crt-row">
                  <span>{t('cart.shipping', 'Livraison')}</span>
                  {allEbooks ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{t('cart.freeEbook', 'Gratuit (ebook)')}</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted-ui)' }}>
                      <i className="fas fa-truck" style={{ marginRight: '0.25rem' }} />
                      {t('cart.atCheckout', 'Au checkout')}
                    </span>
                  )}
                </div>
                {!allEbooks && (
                  <div className="crt-delivery-notice">
                    <i className="fas fa-info-circle" />
                    <span>{t('cart.deliveryNotice', 'Les frais de livraison seront calculés selon le livreur que vous choisirez au checkout.')}</span>
                  </div>
                )}
                <div className="crt-row crt-row--total">
                  <span>{t('cart.total')} {!allEbooks && <em style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--color-text-muted-ui)' }}>(hors livraison)</em>}</span>
                  <strong>{fmt(total)}</strong>
                </div>
              </div>

              {/* Notes */}
              <div className="crt-notes">
                <label>{t('cart.notesLabel')}</label>
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
                  {checking ? t('cart.processing') : <>{t('cart.checkout')} <span>{fmt(total)}</span></>}
                </button>
                <button onClick={() => navigate('/catalog')} className="crt-btn crt-btn--outline crt-btn--full">
                  {t('cart.continueShopping')}
                </button>
              </div>

              {/* Garanties */}
              <div className="crt-guarantees">
                {[
                  { ico: 'fas fa-lock', label: t('cart.securePayment') },
                  { ico: 'fas fa-mobile-alt', label: t('cart.paymentMethods') },
                  { ico: 'fas fa-truck', label: t('cart.fastDelivery') },
                ].map((g, idx) => (
                  <div className="crt-guar" key={idx}>
                    <i className={g.ico} /> {g.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
