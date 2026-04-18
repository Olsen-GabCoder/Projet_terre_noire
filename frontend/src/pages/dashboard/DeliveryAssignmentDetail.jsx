import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import marketplaceService from '../../services/marketplaceService';
import { handleApiError } from '../../services/api';

const STATUS_STYLES = {
  PENDING: { backgroundColor: '#fffbeb', color: '#92400e' },
  CONFIRMED: { backgroundColor: '#eff6ff', color: '#1e40af' },
  READY: { backgroundColor: '#f5f3ff', color: '#6d28d9' },
  SHIPPED: { backgroundColor: '#eff6ff', color: '#1e40af' },
  DELIVERED: { backgroundColor: '#ecfdf5', color: '#065f46' },
  ATTEMPTED: { backgroundColor: '#fff7ed', color: '#c2410c' },
  CANCELLED: { backgroundColor: '#fef2f2', color: '#991b1b' },
};

const DeliveryAssignmentDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [failReason, setFailReason] = useState('');
  const [showFailForm, setShowFailForm] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      // No dedicated detail endpoint — fetch list and filter client-side (MVP)
      const res = await marketplaceService.getMyDeliveries();
      const data = res.data.results || res.data;
      const found = data.find((a) => a.id === Number(id));
      if (!found) {
        setError(t('deliveryDetail.notFound', 'Mission non trouvée.'));
      } else {
        setAssignment(found);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status, extraData = {}) => {
    try {
      setActionLoading(status);
      await marketplaceService.updateDeliveryStatus(id, { status, ...extraData });
      await fetchAssignment();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setActionLoading('');
    }
  };

  const handleFailedAttempt = async () => {
    await handleStatusUpdate('ATTEMPTED', { attempt_reason: failReason });
    setShowFailForm(false);
    setFailReason('');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  if (error && !assignment) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>
      </div>
    );
  }

  const a = assignment;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/dashboard/delivery/assignments" style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" style={{ marginRight: '0.3rem' }} />
          {t('deliveryDetail.back', 'Retour aux missions')}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
          <h1 style={{ fontSize: '1.6rem' }}>
            {t('deliveryDetail.title', 'Mission')} #{a.id}
          </h1>
          <span style={{
            padding: '0.3rem 1rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            ...(STATUS_STYLES[a.status] || STATUS_STYLES.PENDING),
          }}>
            {a.status_display}
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {t('deliveryDetail.vendor', 'Vendeur')} : {a.vendor_name} — {new Date(a.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>
      )}

      {/* Articles */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'white',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ padding: '0.75rem 1rem', backgroundColor: '#f9fafb', margin: 0, fontSize: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <i className="fas fa-box" style={{ marginRight: '0.5rem' }} />
          {t('deliveryDetail.articles', 'Articles')}
        </h3>
        {a.items?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{t('deliveryDetail.bookTitle', 'Titre')}</th>
                <th style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{t('deliveryDetail.quantity', 'Qté')}</th>
                <th style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{t('deliveryDetail.price', 'Prix')}</th>
              </tr>
            </thead>
            <tbody>
              {a.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.6rem 1rem' }}>{item.book_title}</td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>{item.price} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '1rem', color: '#6b7280' }}>{t('deliveryDetail.noArticles', 'Aucun article.')}</p>
        )}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>
          {t('deliveryDetail.subtotal', 'Sous-total')} : {a.subtotal} FCFA
          {a.delivery_fee > 0 && (
            <span style={{ marginLeft: '1rem', color: '#6b7280', fontWeight: 400 }}>
              + {a.delivery_fee} FCFA ({t('deliveryDetail.deliveryFee', 'livraison')})
            </span>
          )}
        </div>
      </div>

      {/* Contacts + Adresse */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Client */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: 'white' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-user" style={{ marginRight: '0.5rem', color: '#2563eb' }} />
            {t('deliveryDetail.client', 'Client')}
          </h3>
          <p style={{ fontWeight: 600 }}>{a.client_full_name || '—'}</p>
          {a.client_phone && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}><i className="fas fa-phone" style={{ marginRight: '0.3rem' }} />{a.client_phone}</p>}
          {a.client_email && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}><i className="fas fa-envelope" style={{ marginRight: '0.3rem' }} />{a.client_email}</p>}
        </div>

        {/* Vendeur */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: 'white' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-store" style={{ marginRight: '0.5rem', color: '#7c3aed' }} />
            {t('deliveryDetail.vendorContact', 'Vendeur')}
          </h3>
          <p style={{ fontWeight: 600 }}>{a.vendor_name}</p>
          {a.vendor_phone && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}><i className="fas fa-phone" style={{ marginRight: '0.3rem' }} />{a.vendor_phone}</p>}
          {a.vendor_email && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}><i className="fas fa-envelope" style={{ marginRight: '0.3rem' }} />{a.vendor_email}</p>}
        </div>

        {/* Adresse de livraison */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: 'white' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem', color: '#dc2626' }} />
            {t('deliveryDetail.shippingAddress', 'Adresse de livraison')}
          </h3>
          <p style={{ fontWeight: 600 }}>{a.shipping_address || '—'}</p>
          {a.shipping_city && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{a.shipping_city}</p>}
        </div>
      </div>

      {/* Tentatives */}
      {(a.attempt_count > 0 || a.last_attempt_reason) && (
        <div style={{
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#fff7ed',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-history" style={{ marginRight: '0.5rem', color: '#c2410c' }} />
            {t('deliveryDetail.attempts', 'Tentatives de livraison')}
          </h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span><strong>{a.attempt_count}</strong> {t('deliveryDetail.attemptCount', 'tentative(s)')}</span>
            {a.last_attempt_at && (
              <span>{t('deliveryDetail.lastAttempt', 'Dernière')} : {new Date(a.last_attempt_at).toLocaleString('fr-FR')}</span>
            )}
          </div>
          {a.last_attempt_reason && (
            <p style={{ marginTop: '0.5rem', color: '#374151' }}>
              {t('deliveryDetail.reason', 'Motif')} : {a.last_attempt_reason}
            </p>
          )}
        </div>
      )}

      {/* Boutons d'action */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.25rem',
        backgroundColor: 'white',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {/* Prendre en charge */}
        {['READY', 'CONFIRMED'].includes(a.status) && (
          <button
            onClick={() => handleStatusUpdate('SHIPPED')}
            disabled={actionLoading === 'SHIPPED'}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: actionLoading === 'SHIPPED' ? 0.6 : 1,
            }}
          >
            <i className="fas fa-truck" style={{ marginRight: '0.3rem' }} />
            {actionLoading === 'SHIPPED' ? t('common.loading') : t('deliveryDetail.takeCharge', 'Prendre en charge')}
          </button>
        )}

        {/* Confirmer livraison */}
        {a.status === 'SHIPPED' && (
          <button
            onClick={() => handleStatusUpdate('DELIVERED')}
            disabled={actionLoading === 'DELIVERED'}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: actionLoading === 'DELIVERED' ? 0.6 : 1,
            }}
          >
            <i className="fas fa-check-circle" style={{ marginRight: '0.3rem' }} />
            {actionLoading === 'DELIVERED' ? t('common.loading') : t('deliveryDetail.confirmDelivery', 'Confirmer livraison')}
          </button>
        )}

        {/* Tentative échouée */}
        {a.status === 'SHIPPED' && !showFailForm && (
          <button
            onClick={() => setShowFailForm(true)}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: 'transparent',
              color: '#c2410c',
              border: '1px solid #c2410c',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.3rem' }} />
            {t('deliveryDetail.failedAttempt', 'Tentative échouée')}
          </button>
        )}

        {/* Réessayer */}
        {a.status === 'ATTEMPTED' && (
          <button
            onClick={() => handleStatusUpdate('SHIPPED')}
            disabled={actionLoading === 'SHIPPED'}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: actionLoading === 'SHIPPED' ? 0.6 : 1,
            }}
          >
            <i className="fas fa-redo" style={{ marginRight: '0.3rem' }} />
            {actionLoading === 'SHIPPED' ? t('common.loading') : t('deliveryDetail.retry', 'Réessayer')}
          </button>
        )}

        {a.delivery_notes && (
          <span style={{ color: '#6b7280', fontSize: '0.85rem', alignSelf: 'center' }}>
            <i className="fas fa-sticky-note" style={{ marginRight: '0.3rem' }} />
            {a.delivery_notes}
          </span>
        )}
      </div>

      {/* Formulaire tentative échouée */}
      {showFailForm && (
        <div style={{
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#fff7ed',
          marginTop: '1rem',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            {t('deliveryDetail.failReason', 'Motif de l\'échec')}
          </h3>
          <textarea
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            rows={2}
            placeholder={t('deliveryDetail.failPlaceholder', 'Client absent, adresse introuvable...')}
            style={{
              width: '100%',
              padding: '0.6rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleFailedAttempt}
              disabled={actionLoading === 'ATTEMPTED'}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#c2410c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: actionLoading === 'ATTEMPTED' ? 0.6 : 1,
              }}
            >
              {actionLoading === 'ATTEMPTED' ? t('common.loading') : t('deliveryDetail.confirmFail', 'Confirmer l\'échec')}
            </button>
            <button
              onClick={() => { setShowFailForm(false); setFailReason(''); }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {t('common.cancel', 'Annuler')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAssignmentDetail;
