import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import orderService from '../services/orderService';
import marketplaceService from '../services/marketplaceService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useReveal } from '../hooks/useReveal';
import '../styles/Checkout.css';
import PageHero from '../components/PageHero';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback pour navigateurs anciens
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const Checkout = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const navigate = useNavigate();
  const { cartItems, appliedCoupon, clearCart, getTotalPrice, getTotalItems } = useCart();
  const { shippingFreeThreshold, shippingCost } = useDeliveryConfig();
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_phone: '',
    shipping_city: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [error, setError] = useState('');
  const [isTimeoutError, setIsTimeoutError] = useState(false);

  // ── Payment state ──
  const [paymentProvider, setPaymentProvider] = useState('MOBICASH');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentPending, setPaymentPending] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [pollingPayment, setPollingPayment] = useState(false);

  // UUID unique par tentative de commande — régénéré si le panier change
  const [clientRequestId, setClientRequestId] = useState(() => generateUUID());
  const isFirstCartRender = useRef(true);

  // Livreurs disponibles
  const [availableRates, setAvailableRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [searchingRates, setSearchingRates] = useState(false);
  const [citySearched, setCitySearched] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (cartItems.length === 0 && !orderCompleted) {
      navigate('/cart');
      return;
    }

    if (user) {
      setFormData({
        shipping_address: user.address || '',
        shipping_phone: user.phone_number || '',
        shipping_city: user.city || '',
      });
    }
  }, [isAuthenticated, cartItems, user, navigate, orderCompleted]);

  // Régénérer le client_request_id si le panier, le coupon ou le livreur change
  useEffect(() => {
    if (isFirstCartRender.current) {
      isFirstCartRender.current = false;
      return;
    }
    setClientRequestId(generateUUID());
    setIsTimeoutError(false);
    setError('');
  }, [cartItems, appliedCoupon, selectedRate]);

  // Rechercher les livreurs quand la ville change (avec debounce)
  const searchRates = useCallback(async (city) => {
    if (!city || city.trim().length < 2) {
      setAvailableRates([]);
      setSelectedRate(null);
      setCitySearched('');
      return;
    }
    const trimmed = city.trim();
    if (trimmed === citySearched) return;

    setSearchingRates(true);
    try {
      const res = await marketplaceService.searchDeliveryRates({ city: trimmed });
      const rates = Array.isArray(res.data) ? res.data : [];
      setAvailableRates(rates);
      setCitySearched(trimmed);
      // Pre-selectionner le moins cher
      if (rates.length > 0) {
        setSelectedRate(rates[0]);
      } else {
        setSelectedRate(null);
      }
    } catch {
      setAvailableRates([]);
      setSelectedRate(null);
    } finally {
      setSearchingRates(false);
    }
  }, [citySearched]);

  // Debounce la recherche (pas pour les ebooks)
  const hasPhysical = cartItems.some(i => i.format !== 'EBOOK');
  useEffect(() => {
    if (!hasPhysical) return;
    const timer = setTimeout(() => {
      searchRates(formData.shipping_city);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.shipping_city, searchRates, hasPhysical]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  // Calcul du shipping
  const getShippingCost = () => {
    if (selectedRate) return parseFloat(selectedRate.price);
    const subtotal = getTotalPrice();
    return subtotal >= shippingFreeThreshold ? 0 : shippingCost;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsTimeoutError(false);
    setIsProcessing(true);
    let isTimeout = false;

    try {
      const orderData = {
        items: cartItems.map((item) => ({
          book_id: item.id,
          quantity: item.quantity,
          ...(item.listing_id && { listing_id: item.listing_id }),
        })),
        shipping_address: formData.shipping_address,
        shipping_phone: formData.shipping_phone,
        shipping_city: formData.shipping_city,
        ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
        ...(selectedRate && { delivery_rate_id: selectedRate.id }),
        client_request_id: clientRequestId,
      };

      const response = await orderService.createOrder(orderData);
      const orderId = response.id;
      setCreatedOrderId(orderId);

      // ── Initiate payment ──
      if (paymentProvider === 'CASH') {
        setOrderCompleted(true);
        clearCart();
        toast.success(t('pages.checkout.orderCreated', `Commande #${orderId} créée !`));
        navigate(`/order-success/${orderId}`, { state: { orderId, orderData: response } });
        return;
      }

      if (!paymentPhone.trim()) {
        setError(t('checkout.phoneRequired', 'Numéro de téléphone requis pour le paiement mobile.'));
        setIsProcessing(false);
        return;
      }

      try {
        const payResult = await orderService.initiatePayment({
          orderId,
          provider: paymentProvider,
          phoneNumber: paymentPhone.trim(),
        });

        if (payResult.status === 'PENDING') {
          setPaymentPending(true);
          toast.success(t('checkout.pendingMessage', 'Confirmez le paiement sur votre téléphone.'));
        } else if (payResult.status === 'SUCCESS') {
          setOrderCompleted(true);
          clearCart();
          navigate(`/order-success/${orderId}`, { state: { orderId, orderData: response } });
        } else {
          setError(payResult.message || t('checkout.paymentFailed', 'Le paiement a échoué.'));
        }
      } catch (payErr) {
        // Order created but payment failed — still redirect to order-success
        const payMsg = payErr.response?.data?.error || payErr.response?.data?.message || '';
        toast.error(payMsg || t('checkout.paymentFailed', 'Erreur lors du paiement.'));
        setOrderCompleted(true);
        clearCart();
        navigate(`/order-success/${orderId}`, { state: { orderId, orderData: response } });
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        isTimeout = true;
        setIsTimeoutError(true);
        setError(t(
          'pages.checkout.errorTimeout',
          "La commande met plus de temps que prévu. Vérifiez 'Mes commandes' avant de réessayer pour éviter un doublon."
        ));
        // Ne pas réactiver le bouton avant 30 secondes
        setTimeout(() => setIsProcessing(false), 30000);
      } else if (err.response?.data?.error || err.response?.data?.detail) {
        setError(err.response.data.error || err.response.data.detail);
      } else {
        setError(t(
          'pages.checkout.errorGeneric',
          'Une erreur est survenue lors de la création de la commande.'
        ));
      }
    } finally {
      if (!isTimeout) {
        setIsProcessing(false);
      }
    }
  };

  if (!isAuthenticated || (cartItems.length === 0 && !orderCompleted)) {
    return <LoadingSpinner fullPage={true} />;
  }

  const allEbooks = cartItems.every(i => i.format === 'EBOOK');
  const subtotal = getTotalPrice();
  const shipping = allEbooks ? 0 : getShippingCost();
  const discountPercent = appliedCoupon?.discountPercent ?? 0;
  const discountFixed = appliedCoupon?.discountAmount ?? 0;
  const discountAmt = discountPercent > 0
    ? (subtotal * discountPercent) / 100
    : Math.min(discountFixed, subtotal);
  const total = subtotal - discountAmt + shipping;

  return (
    <div className="chk-page">
      <PageHero
        title={t('pages.checkout.title', 'Finaliser la commande')}
        subtitle={t('pages.checkout.heroSub', 'Vérifiez vos informations de livraison avant de confirmer.')}
      />

      <form onSubmit={handleSubmit} className="chk-content reveal-section" ref={revealRef}>
        <div className="chk-layout">
        <div className="chk-main">
          <div className="chk-section">
            <span className="chk-section__tag">{t('checkout.shippingTag', 'Livraison')}</span>
            <h2>{t('pages.checkout.shippingInfo', 'Informations de livraison')}</h2>

            <div className="chk-form-group">
              <label htmlFor="shipping_address">
                {t('pages.checkout.fullAddress', 'Adresse Complete')} <span className="required">*</span>
              </label>
              <textarea
                id="shipping_address"
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder="Numero, Rue, Avenue, Quartier..."
                required
                aria-required="true"
                rows="3"
              />
            </div>

            <div className="chk-form-row">
              <div className="chk-form-group">
                <label htmlFor="shipping_city">
                  {t('pages.checkout.city', 'Ville')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="shipping_city"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleChange}
                  placeholder="Ex: Port-Gentil"
                  required
                  aria-required="true"
                />
              </div>

              <div className="chk-form-group">
                <label htmlFor="shipping_phone">
                  {t('pages.checkout.phone', 'Numero de Telephone')} <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="shipping_phone"
                  name="shipping_phone"
                  value={formData.shipping_phone}
                  onChange={handleChange}
                  placeholder="+241 XX XX XX XX"
                  required
                  aria-required="true"
                />
              </div>
            </div>

            {/* Selection du livreur (pas pour les ebooks) */}
            {!allEbooks && formData.shipping_city.trim().length >= 2 && (
              <div className="chk-delivery-section">
                <h3 className="chk-delivery-title">
                  <i className="fas fa-truck" /> {t('checkout.chooseDriver', 'Choisir un livreur')}
                </h3>

                {searchingRates ? (
                  <div className="chk-delivery-loading">
                    <i className="fas fa-spinner fa-spin" /> {t('checkout.searchingDrivers', 'Recherche des livreurs disponibles...')}
                  </div>
                ) : availableRates.length > 0 ? (
                  <div className="chk-delivery-rates">
                    {availableRates.map((rate) => (
                      <label
                        key={rate.id}
                        className={`chk-rate-card ${selectedRate?.id === rate.id ? 'chk-rate-card--selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="delivery_rate"
                          checked={selectedRate?.id === rate.id}
                          onChange={() => setSelectedRate(rate)}
                          className="chk-rate-radio"
                        />
                        <div className="chk-rate-info">
                          <div className="chk-rate-agent">
                            <span className="chk-rate-name">{rate.agent_name}</span>
                            {rate.agent_verified && (
                              <i className="fas fa-check-circle chk-rate-verified" title="Verifie" />
                            )}
                            {rate.agent_rating && (
                              <span className="chk-rate-rating">{rate.agent_rating.toFixed(1)} <i className="fas fa-star" /></span>
                            )}
                          </div>
                          <div className="chk-rate-details">
                            <span className="chk-rate-zone"><i className="fas fa-map-pin" /> {rate.zone_name}</span>
                            <span className="chk-rate-delay"><i className="fas fa-clock" /> {rate.estimated_days_min}-{rate.estimated_days_max} jours</span>
                          </div>
                        </div>
                        <div className="chk-rate-price">
                          {parseFloat(rate.price).toLocaleString('fr-FR')} {rate.currency}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : citySearched ? (
                  <div className="chk-delivery-empty">
                    <i className="fas fa-info-circle" />
                    <span>{t('checkout.noDrivers', 'Aucun livreur disponible pour {{city}}. Les frais de livraison par défaut seront appliqués.', { city: citySearched })}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* ── Section paiement ── */}
            <div className="chk-section" style={{ marginTop: '1.5rem' }}>
              <span className="chk-section__tag">{t('checkout.paymentMethod', 'Paiement')}</span>
              <h2>{t('checkout.paymentMethod', 'Méthode de paiement')}</h2>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {[
                  { key: 'MOBICASH', label: 'Mobicash', icon: 'fas fa-mobile-alt', prefix: '074/076/066' },
                  { key: 'AIRTEL', label: 'Airtel Money', icon: 'fas fa-mobile-alt', prefix: '077/074' },
                  { key: 'CASH', label: t('checkout.cash', 'Espèces'), icon: 'fas fa-money-bill-wave', prefix: '' },
                ].map((p) => (
                  <label
                    key={p.key}
                    style={{
                      flex: '1',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: `2px solid ${paymentProvider === p.key ? 'var(--color-primary)' : 'var(--color-gray-300, #d1d5db)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: paymentProvider === p.key ? 'rgba(var(--color-primary-rgb), 0.05)' : 'transparent',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      value={p.key}
                      checked={paymentProvider === p.key}
                      onChange={() => setPaymentProvider(p.key)}
                      style={{ display: 'none' }}
                    />
                    <i className={p.icon} style={{ fontSize: '1.2rem', color: paymentProvider === p.key ? 'var(--color-primary)' : 'var(--color-text-muted-ui)' }} />
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{p.label}</strong>
                      {p.prefix && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>{p.prefix}</div>}
                    </div>
                  </label>
                ))}
              </div>

              {paymentProvider !== 'CASH' && (
                <div className="chk-form-group">
                  <label htmlFor="payment_phone">
                    {t('checkout.phoneNumber', 'Numéro de paiement')} <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="payment_phone"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder={paymentProvider === 'MOBICASH' ? '074 XX XX XX' : '077 XX XX XX'}
                    required={paymentProvider !== 'CASH'}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', marginTop: '0.25rem', display: 'block' }}>
                    {t('checkout.phoneHint', 'Le numéro qui recevra la demande de paiement USSD.')}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="chk-error" role="alert" aria-live="polite">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
                {isTimeoutError && (
                  <Link to="/orders" className="chk-error__link">
                    <i className="fas fa-list-ul" />
                    {' '}{t('pages.checkout.errorCheckOrders', 'Vérifier mes commandes')}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="chk-sidebar">
          <div className="chk-summary">
            <span className="chk-summary__tag">{t('cart.summary')}</span>
            <h2>{t('pages.checkout.yourOrder', 'Votre commande')}</h2>

            <div className="chk-summary-items">
              {(() => {
                const groups = {};
                cartItems.forEach((item) => {
                  const key = item.vendor_name || 'Frollot';
                  if (!groups[key]) groups[key] = { items: [], subtotal: 0 };
                  groups[key].items.push(item);
                  groups[key].subtotal += parseFloat(item.price) * item.quantity;
                });
                return Object.entries(groups).map(([vendor, { items, subtotal: vSub }]) => (
                  <div key={vendor} className="chk-vendor-group">
                    <div className="chk-vendor-header">
                      <i className={`fas fa-${vendor === 'Frollot' ? 'book-open' : 'store'}`} />
                      <span>{vendor}</span>
                      <span className="chk-vendor-count">{formatPrice(vSub)}</span>
                    </div>
                    {items.map((item) => (
                      <div key={item._cartKey || item.id} className="chk-summary-item">
                        <img
                          src={item.cover_image || '/images/default-book-cover.svg'}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="chk-item-info">
                          <h4>{item.title}</h4>
                          <p>{item.author?.full_name}</p>
                          <span className="chk-item-qty">{t('checkout.qty', 'Qté')}: {item.quantity}</span>
                          {item.condition && (
                            <span className="chk-item-condition">
                              {item.condition === 'NEW' ? t('cart.conditionNew', 'Neuf') : t('cart.conditionUsed', 'Occasion')}
                            </span>
                          )}
                        </div>
                        <div className="chk-item-price">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            <div className="chk-totals">
              <div className="chk-total-row">
                <span>{t('cart.subtotal')} ({getTotalItems()} {t('checkout.itemCount', 'article{{s}}', { s: getTotalItems() > 1 ? 's' : '' })})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="chk-total-row" style={{ color: 'var(--color-success)' }}>
                  <span>{t('cart.discount')} {appliedCoupon?.code && `(${appliedCoupon.code})`}</span>
                  <span>-{formatPrice(discountAmt)}</span>
                </div>
              )}
              <div className="chk-total-row">
                <span>
                  {t('cart.shipping')}
                  {selectedRate && <em style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', marginLeft: '0.35rem' }}>({selectedRate.agent_name})</em>}
                  {!selectedRate && shipping === 0 && <em style={{ color: 'var(--color-success)', marginLeft: '0.35rem' }}>{t('cart.free')}</em>}
                </span>
                <span>{shipping === 0 ? t('cart.free') : formatPrice(shipping)}</span>
              </div>
              <div className="chk-total-row chk-total-row--final">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="chk-btn"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> {t('pages.checkout.processing', 'Traitement...')}
                </>
              ) : (
                <>
                  <span>{t('pages.checkout.confirmOrder', 'Confirmer la Commande')}</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>

            <div className="chk-payment-info">
              <p className="chk-payment-title"><i className="fas fa-shield-alt" /> {t('checkout.secureNote', 'Paiement sécurisé via Mobile Money')}</p>
              <div className="chk-payment-methods">
                <span style={{ fontWeight: paymentProvider === 'MOBICASH' ? 700 : 400 }}><i className="fas fa-mobile-alt" /> Mobicash</span>
                <span style={{ fontWeight: paymentProvider === 'AIRTEL' ? 700 : 400 }}><i className="fas fa-mobile-alt" /> Airtel Money</span>
                <span style={{ fontWeight: paymentProvider === 'CASH' ? 700 : 400 }}><i className="fas fa-money-bill-wave" /> {t('checkout.cash', 'Espèces')}</span>
              </div>
            </div>

            <div className="chk-badges">
              <div className="chk-badge">
                <i className="fas fa-lock" />
                <span>{t('pages.checkout.securePayment', 'Paiement securise')}</span>
              </div>
              <div className="chk-badge">
                <i className="fas fa-truck" />
                <span>{t('pages.checkout.fastDelivery', 'Livraison rapide')}</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </form>

      {/* ── Payment pending overlay ── */}
      {paymentPending && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            background: 'var(--color-bg-card, #fff)', borderRadius: 16, padding: '2rem',
            maxWidth: 420, width: '90%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <i className="fas fa-mobile-alt" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              {t('checkout.pendingTitle', 'En attente de confirmation')}
            </h2>
            <p style={{ color: 'var(--color-text-muted-ui)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {t('checkout.pendingMessage', 'Validez le paiement sur votre téléphone.')}
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }} />
            </div>
            <button
              onClick={async () => {
                if (!createdOrderId || pollingPayment) return;
                setPollingPayment(true);
                try {
                  const order = await orderService.getOrderById(createdOrderId);
                  if (['PAID', 'DELIVERED', 'SHIPPED'].includes(order.status)) {
                    setPaymentPending(false);
                    setOrderCompleted(true);
                    clearCart();
                    toast.success(t('checkout.paymentConfirmed', 'Paiement confirmé !'));
                    navigate(`/order-success/${createdOrderId}`, { state: { orderId: createdOrderId, orderData: order } });
                  } else {
                    toast(t('checkout.stillPending', 'Paiement toujours en attente...'));
                  }
                } catch {
                  toast.error(t('checkout.checkError', 'Impossible de vérifier le statut.'));
                } finally {
                  setPollingPayment(false);
                }
              }}
              disabled={pollingPayment}
              style={{
                padding: '0.6rem 1.5rem', backgroundColor: 'var(--color-primary)', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
                opacity: pollingPayment ? 0.6 : 1,
              }}
            >
              {pollingPayment
                ? <><i className="fas fa-spinner fa-spin" /> {t('common.loading', 'Vérification...')}</>
                : <><i className="fas fa-sync" /> {t('checkout.checkStatus', 'Vérifier le statut')}</>
              }
            </button>
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => {
                  setPaymentPending(false);
                  setOrderCompleted(true);
                  clearCart();
                  navigate(`/order-success/${createdOrderId}`);
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-text-muted-ui)',
                  cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline',
                }}
              >
                {t('checkout.skipWait', 'Continuer sans attendre')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chk-footer-fade" />
    </div>
  );
};

export default Checkout;
