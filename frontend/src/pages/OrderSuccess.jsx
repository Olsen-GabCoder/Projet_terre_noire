import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import orderService from '../services/orderService';
import '../styles/OrderSuccess.css';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderData } = location.state || {};
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate('/catalog');
    }
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
  }

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    setDownloading(true);
    try {
      await orderService.downloadInvoice(orderId);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' FCFA';
  };

  return (
    <div className="os-page">
      <section className="os-hero">
        <div className="os-hero__orb" />
        <div className="os-hero__grid-bg" />
        <div className="os-hero__inner">
          <div className="os-hero__icon">
            <i className="fas fa-check-circle" />
          </div>
          <div className="os-hero__line" />
          <h1 className="os-hero__title">Commande confirmée</h1>
          <p className="os-hero__sub">
            Votre commande <strong>#{orderId}</strong> a été créée avec succès.
          </p>
        </div>
      </section>
      <div className="os-hero-fade" />

      <div className="os-content">
        <div className="os-card">

        <div className="os-info">
          <div className="os-info-row">
            <span className="os-info-label">📦 Numéro de commande :</span>
            <span className="os-info-value">#{orderId}</span>
          </div>
          {orderData?.subtotal != null && (
            <div className="os-info-row">
              <span className="os-info-label">Sous-total :</span>
              <span className="os-info-value">{formatPrice(orderData.subtotal)}</span>
            </div>
          )}
          {orderData?.shipping_cost != null && (
            <div className="os-info-row">
              <span className="os-info-label">Livraison :</span>
              <span className="os-info-value">{Number(orderData.shipping_cost) === 0 ? 'Gratuit' : formatPrice(orderData.shipping_cost)}</span>
            </div>
          )}
          <div className="os-info-row">
            <span className="os-info-label">💰 Montant total :</span>
            <span className="os-info-value">{formatPrice(orderData?.total_amount || 0)}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">📍 Adresse de livraison :</span>
            <span className="os-info-value">{orderData?.shipping_address}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">📱 Téléphone :</span>
            <span className="os-info-value">{orderData?.shipping_phone}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">🏙️ Ville :</span>
            <span className="os-info-value">{orderData?.shipping_city}</span>
          </div>
        </div>

        <div className="os-steps">
          <h2><i className="fas fa-list-check" /> Prochaines étapes</h2>
          <ol>
            <li>
              <strong>Paiement :</strong> Vous recevrez les instructions selon votre moyen de paiement (Mobicash, Airtel Money, espèces ou carte Visa)
            </li>
            <li>
              <strong>Confirmation :</strong> Une fois le paiement effectué, vous recevrez une confirmation
            </li>
            <li>
              <strong>Livraison :</strong> Votre commande sera livrée sous 5-10 jours ouvrés
            </li>
          </ol>
        </div>

        <div className="os-payment">
          <h3><i className="fas fa-credit-card" /> Moyens de paiement acceptés</h3>
          <div className="os-payment-icons">
            <span><i className="fas fa-mobile-alt" /> Mobicash</span>
            <span><i className="fas fa-mobile-alt" /> Airtel Money</span>
            <span><i className="fas fa-money-bill-wave" /> Espèces</span>
            <span><i className="fab fa-cc-visa" /> Cartes Visa</span>
          </div>
        </div>

        <div className="os-actions">
          <button
            type="button"
            className="os-btn os-btn--primary"
            onClick={handleDownloadInvoice}
            disabled={downloading}
          >
            {downloading ? (
              <><i className="fas fa-spinner fa-spin" /> Téléchargement…</>
            ) : (
              <><i className="fas fa-file-pdf" /> Télécharger la facture</>
            )}
          </button>
          <Link to="/orders" className="os-btn os-btn--primary">
            <i className="fas fa-list" /> Voir mes commandes
          </Link>
          <Link to="/catalog" className="os-btn os-btn--outline">
            <i className="fas fa-book" /> Continuer mes achats
          </Link>
        </div>

        <div className="os-support">
          <p>
            <i className="fas fa-headset"></i>
            Une question ? Contactez notre service client au{' '}
            <a href="tel:+24165348887">+241 65 34 88 87</a> ou <a href="tel:+24176593535">+241 76 59 35 35</a>
          </p>
        </div>
        </div>
      </div>
      <div className="os-footer-fade" />
    </div>
  );
};

export default OrderSuccess;