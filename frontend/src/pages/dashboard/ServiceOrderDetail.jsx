import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import servicesService from '../../services/servicesService';
import { handleApiError } from '../../services/api';

const STATUS_STYLES = {
  PENDING: { backgroundColor: '#fffbeb', color: '#92400e' },
  IN_PROGRESS: { backgroundColor: '#eff6ff', color: '#1e40af' },
  REVIEW: { backgroundColor: '#f5f3ff', color: '#6d28d9' },
  REVISION: { backgroundColor: '#fff7ed', color: '#c2410c' },
  COMPLETED: { backgroundColor: '#ecfdf5', color: '#065f46' },
  CANCELLED: { backgroundColor: '#fef2f2', color: '#991b1b' },
};

const ServiceOrderDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await servicesService.getOrder(id);
      setOrder(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const isProvider = order && user && order.provider === user.active_profile_id;
  const isClient = order && user && order.client === user.id;

  const handleDeliver = async () => {
    if (!fileRef.current?.files?.length) return;
    try {
      setActionLoading('deliver');
      const formData = new FormData();
      formData.append('deliverable', fileRef.current.files[0]);
      await servicesService.deliverOrder(id, formData);
      await fetchOrder();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setActionLoading('');
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      setActionLoading(status);
      await servicesService.updateOrderStatus(id, { status });
      await fetchOrder();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setActionLoading('');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionReason.trim()) return;
    try {
      setActionLoading('revision');
      await servicesService.requestRevision(id, { reason: revisionReason });
      setShowRevisionForm(false);
      setRevisionReason('');
      await fetchOrder();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setActionLoading('');
    }
  };

  const handleDownloadDeliverable = async () => {
    try {
      await servicesService.downloadDeliverable(id, order.deliverable_filename);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      await servicesService.downloadServiceOrderInvoice(id);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  if (error && !order) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link to={isProvider ? '/dashboard/services/orders' : '/dashboard/my-service-requests'} style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'none' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '0.3rem' }} />
            {t('serviceOrderDetail.back', 'Retour')}
          </Link>
          <h1 style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
            {t('serviceOrderDetail.title', 'Commande de service')} #{order.id}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '0.25rem' }}>{order.request_title}</p>
        </div>
        <span style={{
          padding: '0.3rem 1rem',
          borderRadius: '999px',
          fontSize: '0.85rem',
          fontWeight: 600,
          ...(STATUS_STYLES[order.status] || STATUS_STYLES.PENDING),
        }}>
          {order.status_display}
        </span>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Section info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {[
          { label: t('serviceOrderDetail.amount', 'Montant'), value: `${order.amount} FCFA`, icon: 'fas fa-coins' },
          { label: t('serviceOrderDetail.client', 'Client'), value: order.client_name, icon: 'fas fa-user' },
          { label: t('serviceOrderDetail.provider', 'Prestataire'), value: order.provider_name, icon: 'fas fa-user-tie' },
          { label: t('serviceOrderDetail.deadline', 'Échéance'), value: order.deadline ? new Date(order.deadline).toLocaleDateString('fr-FR') : '—', icon: 'fas fa-calendar' },
          { label: t('serviceOrderDetail.revisions', 'Révisions'), value: `${order.revision_count || 0} / ${order.max_revision_rounds || '—'}`, icon: 'fas fa-sync' },
          { label: t('serviceOrderDetail.created', 'Créée le'), value: new Date(order.created_at).toLocaleDateString('fr-FR'), icon: 'fas fa-clock' },
        ].map((info) => (
          <div key={info.label} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: 'white',
          }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              <i className={info.icon} style={{ marginRight: '0.3rem' }} />{info.label}
            </div>
            <div style={{ fontWeight: 600 }}>{info.value}</div>
          </div>
        ))}
      </div>

      {/* Section livrable */}
      {order.has_deliverable && (
        <div style={{
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-file-download" style={{ marginRight: '0.5rem', color: '#059669' }} />
            {t('serviceOrderDetail.deliverable', 'Livrable')}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#374151' }}>
              {order.deliverable_filename}
              {order.deliverable_size && (
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                  ({(order.deliverable_size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </span>
            <button
              onClick={handleDownloadDeliverable}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <i className="fas fa-download" style={{ marginRight: '0.3rem' }} />
              {t('serviceOrderDetail.download', 'Télécharger')}
            </button>
          </div>
        </div>
      )}

      {/* Section révision */}
      {order.last_revision_reason && (
        <div style={{
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#fff7ed',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem', color: '#c2410c' }} />
            {t('serviceOrderDetail.lastRevision', 'Dernière demande de révision')}
          </h3>
          <p style={{ color: '#374151' }}>{order.last_revision_reason}</p>
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
        alignItems: 'center',
      }}>
        {/* Prestataire — Livrer */}
        {isProvider && order.status === 'IN_PROGRESS' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" ref={fileRef} style={{ fontSize: '0.85rem' }} />
            <button
              onClick={handleDeliver}
              disabled={actionLoading === 'deliver'}
              style={{
                padding: '0.5rem 1.2rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                opacity: actionLoading === 'deliver' ? 0.6 : 1,
              }}
            >
              <i className="fas fa-upload" style={{ marginRight: '0.3rem' }} />
              {actionLoading === 'deliver' ? t('common.loading') : t('serviceOrderDetail.deliver', 'Livrer')}
            </button>
          </div>
        )}

        {/* Prestataire — Livrer (mode REVISION) */}
        {isProvider && order.status === 'REVISION' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" ref={fileRef} style={{ fontSize: '0.85rem' }} />
            <button
              onClick={handleDeliver}
              disabled={actionLoading === 'deliver'}
              style={{
                padding: '0.5rem 1.2rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                opacity: actionLoading === 'deliver' ? 0.6 : 1,
              }}
            >
              <i className="fas fa-upload" style={{ marginRight: '0.3rem' }} />
              {actionLoading === 'deliver' ? t('common.loading') : t('serviceOrderDetail.reDeliver', 'Re-livrer')}
            </button>
          </div>
        )}

        {/* Client — Valider */}
        {isClient && order.status === 'REVIEW' && (
          <button
            onClick={() => handleStatusUpdate('COMPLETED')}
            disabled={actionLoading === 'COMPLETED'}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: actionLoading === 'COMPLETED' ? 0.6 : 1,
            }}
          >
            <i className="fas fa-check" style={{ marginRight: '0.3rem' }} />
            {actionLoading === 'COMPLETED' ? t('common.loading') : t('serviceOrderDetail.validate', 'Valider')}
          </button>
        )}

        {/* Client — Demander révision */}
        {isClient && order.status === 'REVIEW' && !showRevisionForm && (
          <button
            onClick={() => setShowRevisionForm(true)}
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
            <i className="fas fa-redo" style={{ marginRight: '0.3rem' }} />
            {t('serviceOrderDetail.requestRevision', 'Demander révision')}
          </button>
        )}

        {/* Annuler */}
        {(isClient || isProvider) && ['PENDING', 'IN_PROGRESS'].includes(order.status) && (
          <button
            onClick={() => handleStatusUpdate('CANCELLED')}
            disabled={actionLoading === 'CANCELLED'}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: 'transparent',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: actionLoading === 'CANCELLED' ? 0.6 : 1,
            }}
          >
            <i className="fas fa-times" style={{ marginRight: '0.3rem' }} />
            {actionLoading === 'CANCELLED' ? t('common.loading') : t('serviceOrderDetail.cancel', 'Annuler')}
          </button>
        )}

        {/* Facture */}
        {['COMPLETED', 'REVIEW'].includes(order.status) && (
          <button
            onClick={handleDownloadInvoice}
            style={{
              padding: '0.5rem 1.2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <i className="fas fa-file-pdf" style={{ marginRight: '0.3rem' }} />
            {t('serviceOrderDetail.invoice', 'Facture PDF')}
          </button>
        )}
      </div>

      {/* Formulaire révision */}
      {showRevisionForm && (
        <div style={{
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#fff7ed',
          marginTop: '1rem',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            {t('serviceOrderDetail.revisionReason', 'Motif de la révision')}
          </h3>
          <textarea
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            rows={3}
            placeholder={t('serviceOrderDetail.revisionPlaceholder', 'Décrivez les modifications souhaitées...')}
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
              onClick={handleRequestRevision}
              disabled={actionLoading === 'revision' || !revisionReason.trim()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#c2410c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: actionLoading === 'revision' ? 0.6 : 1,
              }}
            >
              {actionLoading === 'revision' ? t('common.loading') : t('serviceOrderDetail.sendRevision', 'Envoyer')}
            </button>
            <button
              onClick={() => { setShowRevisionForm(false); setRevisionReason(''); }}
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

      {/* Discount/coupon info */}
      {order.discount_amount > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: 'white',
          marginTop: '1rem',
          fontSize: '0.9rem',
          color: '#6b7280',
        }}>
          <i className="fas fa-tag" style={{ marginRight: '0.3rem', color: '#059669' }} />
          {t('serviceOrderDetail.discount', 'Réduction coupon')} : -{order.discount_amount} FCFA
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDetail;
