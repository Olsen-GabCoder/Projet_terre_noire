import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryConfig } from '../context/DeliveryConfigContext';
import orderService from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Checkout.css';

const Checkout = () => {
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (cartItems.length === 0) {
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
  }, [isAuthenticated, cartItems, user, navigate]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const subtotal = getTotalPrice();
      const shipping = subtotal >= shippingFreeThreshold ? 0 : shippingCost;
      const discountPercent = appliedCoupon?.discountPercent ?? 0;
      const discountFixed = appliedCoupon?.discountAmount ?? 0;
      const discountAmt = discountPercent > 0
        ? (subtotal * discountPercent) / 100
        : Math.min(discountFixed, subtotal);

      const orderData = {
        items: cartItems.map((item) => ({
          book_id: item.id,
          quantity: item.quantity,
        })),
        shipping_address: formData.shipping_address,
        shipping_phone: formData.shipping_phone,
        shipping_city: formData.shipping_city,
        ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
      };

      const response = await orderService.createOrder(orderData);

      clearCart();

      navigate('/order-success', {
        state: {
          orderId: response.id,
          orderData: response,
        },
      });
    } catch (err) {
      console.error('Erreur lors de la création de la commande:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Une erreur est survenue lors de la création de la commande'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated || cartItems.length === 0) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="chk-page">
      <section className="chk-hero">
        <div className="chk-hero__orb" />
        <div className="chk-hero__grid-bg" />
        <div className="chk-hero__inner">
          <div className="chk-hero__line" />
          <h1 className="chk-hero__title">Finaliser la commande</h1>
          <p className="chk-hero__sub">
            Vérifiez vos informations de livraison avant de confirmer.
          </p>
        </div>
      </section>
      <div className="chk-hero-fade" />

      <form onSubmit={handleSubmit} className="chk-content">
        <div className="chk-layout">
        <div className="chk-main">
          <div className="chk-section">
            <span className="chk-section__tag">Livraison</span>
            <h2>Informations de livraison</h2>

            <div className="chk-form-group">
              <label htmlFor="shipping_address">
                Adresse Complète <span className="required">*</span>
              </label>
              <textarea
                id="shipping_address"
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder="Numéro, Rue, Avenue, Quartier..."
                required
                rows="3"
              />
            </div>

            <div className="chk-form-row">
              <div className="chk-form-group">
                <label htmlFor="shipping_city">
                  Ville <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="shipping_city"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleChange}
                  placeholder="Ex: Port-Gentil"
                  required
                />
              </div>

              <div className="chk-form-group">
                <label htmlFor="shipping_phone">
                  Numéro de Téléphone <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="shipping_phone"
                  name="shipping_phone"
                  value={formData.shipping_phone}
                  onChange={handleChange}
                  placeholder="+241 XX XX XX XX"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="chk-error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="chk-sidebar">
          <div className="chk-summary">
            <span className="chk-summary__tag">Récapitulatif</span>
            <h2>Votre commande</h2>

            <div className="chk-summary-items">
              {cartItems.map((item) => (
                <div key={item.id} className="chk-summary-item">
                  <img
                    src={item.cover_image || '/images/default-book-cover.jpg'}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="chk-item-info">
                    <h4>{item.title}</h4>
                    <p>{item.author?.full_name}</p>
                    <span className="chk-item-qty">Qté: {item.quantity}</span>
                  </div>
                  <div className="chk-item-price">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const subtotal = getTotalPrice();
              const shipping = subtotal >= shippingFreeThreshold ? 0 : shippingCost;
              const discountPercent = appliedCoupon?.discountPercent ?? 0;
              const discountFixed = appliedCoupon?.discountAmount ?? 0;
              const discountAmt = discountPercent > 0
                ? (subtotal * discountPercent) / 100
                : Math.min(discountFixed, subtotal);
              const total = subtotal - discountAmt + shipping;
              return (
                <div className="chk-totals">
                  <div className="chk-total-row">
                    <span>Sous-total ({getTotalItems()} article{getTotalItems() > 1 ? 's' : ''})</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="chk-total-row" style={{ color: 'var(--color-success)' }}>
                      <span>Réduction {appliedCoupon?.code && `(${appliedCoupon.code})`}</span>
                      <span>-{formatPrice(discountAmt)}</span>
                    </div>
                  )}
                  <div className="chk-total-row">
                    <span>Livraison {shipping === 0 && <em style={{ color: 'var(--color-success)' }}>Gratuit</em>}</span>
                    <span>{shipping === 0 ? 'Gratuit' : formatPrice(shipping)}</span>
                  </div>
                  <div className="chk-total-row chk-total-row--final">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              );
            })()}

            <button
              type="submit"
              disabled={isProcessing}
              className="chk-btn"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Traitement...
                </>
              ) : (
                <>
                  <span>Confirmer la Commande</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>

            <div className="chk-payment-info">
              <p className="chk-payment-title"><i className="fas fa-credit-card" /> Paiement après confirmation</p>
              <div className="chk-payment-methods">
                <span><i className="fas fa-mobile-alt" /> Mobicash</span>
                <span><i className="fas fa-mobile-alt" /> Airtel Money</span>
                <span><i className="fas fa-money-bill-wave" /> Espèces</span>
                <span><i className="fab fa-cc-visa" /> Cartes Visa</span>
              </div>
            </div>

            <div className="chk-badges">
              <div className="chk-badge">
                <i className="fas fa-lock" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="chk-badge">
                <i className="fas fa-truck" />
                <span>Livraison rapide</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </form>
      <div className="chk-footer-fade" />
    </div>
  );
};

export default Checkout;