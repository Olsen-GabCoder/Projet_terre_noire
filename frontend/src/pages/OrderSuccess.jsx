import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import orderService from '../services/orderService';
import PageHero from '../components/PageHero';
import '../styles/OrderSuccess.css';

const OrderSuccess = () => {
  const { t } = useTranslation();
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
      <PageHero
        title={t('pages.orderSuccess.title')}
        subtitle={t('pages.orderSuccess.orderCreated', { id: orderId })}
        icon="fas fa-check-circle"
        className="os-hero"
      />

      <div className="os-content">
        <div className="os-card">

        <div className="os-info">
          <div className="os-info-row">
            <span className="os-info-label">{t('pages.orderSuccess.orderNumber')}</span>
            <span className="os-info-value">#{orderId}</span>
          </div>
          {orderData?.subtotal != null && (
            <div className="os-info-row">
              <span className="os-info-label">{t('pages.orderSuccess.subtotal')}</span>
              <span className="os-info-value">{formatPrice(orderData.subtotal)}</span>
            </div>
          )}
          {orderData?.shipping_cost != null && (
            <div className="os-info-row">
              <span className="os-info-label">{t('pages.orderSuccess.shipping')}</span>
              <span className="os-info-value">{Number(orderData.shipping_cost) === 0 ? t('pages.orderSuccess.free') : formatPrice(orderData.shipping_cost)}</span>
            </div>
          )}
          <div className="os-info-row">
            <span className="os-info-label">{t('pages.orderSuccess.totalAmount')}</span>
            <span className="os-info-value">{formatPrice(orderData?.total_amount || 0)}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">{t('pages.orderSuccess.shippingAddress')}</span>
            <span className="os-info-value">{orderData?.shipping_address}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">{t('pages.orderSuccess.phone')}</span>
            <span className="os-info-value">{orderData?.shipping_phone}</span>
          </div>
          <div className="os-info-row">
            <span className="os-info-label">{t('pages.orderSuccess.city')}</span>
            <span className="os-info-value">{orderData?.shipping_city}</span>
          </div>
        </div>

        <div className="os-steps">
          <h2><i className="fas fa-list-check" /> {t('pages.orderSuccess.nextSteps')}</h2>
          <ol>
            <li>
              <strong>{t('pages.orderSuccess.stepPaymentLabel')}</strong> {t('pages.orderSuccess.stepPaymentDesc')}
            </li>
            <li>
              <strong>{t('pages.orderSuccess.stepConfirmationLabel')}</strong> {t('pages.orderSuccess.stepConfirmationDesc')}
            </li>
            <li>
              <strong>{t('pages.orderSuccess.stepDeliveryLabel')}</strong> {t('pages.orderSuccess.stepDeliveryDesc')}
            </li>
          </ol>
        </div>

        <div className="os-payment">
          <h3><i className="fas fa-credit-card" /> {t('pages.orderSuccess.paymentMethods')}</h3>
          <div className="os-payment-icons">
            <span><i className="fas fa-mobile-alt" /> Mobicash</span>
            <span><i className="fas fa-mobile-alt" /> Airtel Money</span>
            <span><i className="fas fa-money-bill-wave" /> {t('pages.orderSuccess.cash')}</span>
            <span><i className="fab fa-cc-visa" /> {t('pages.orderSuccess.visaCards')}</span>
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
              <><i className="fas fa-spinner fa-spin" /> {t('pages.orderSuccess.downloading')}</>
            ) : (
              <><i className="fas fa-file-pdf" /> {t('pages.orderSuccess.downloadInvoice')}</>
            )}
          </button>
          <Link to="/orders" className="os-btn os-btn--primary">
            <i className="fas fa-list" /> {t('pages.orderSuccess.viewOrders')}
          </Link>
          <Link to="/catalog" className="os-btn os-btn--outline">
            <i className="fas fa-book" /> {t('pages.orderSuccess.continueShopping')}
          </Link>
        </div>

        <div className="os-support">
          <p>
            <i className="fas fa-headset"></i>
            {t('pages.orderSuccess.supportText')}{' '}
            <a href="tel:+24165348887">+241 65 34 88 87</a> {t('pages.orderSuccess.or')} <a href="tel:+24176593535">+241 76 59 35 35</a>
          </p>
        </div>
        </div>
      </div>
      <div className="os-footer-fade" />
    </div>
  );
};

export default OrderSuccess;
