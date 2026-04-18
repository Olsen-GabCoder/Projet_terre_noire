import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import libraryService from '../../services/libraryService';
import { handleApiError } from '../../services/api';

const STATUS_STYLES = {
  PENDING: { backgroundColor: '#fffbeb', color: '#92400e' },
  NOTIFIED: { backgroundColor: '#ecfdf5', color: '#065f46' },
  FULFILLED: { backgroundColor: '#eff6ff', color: '#1e40af' },
  EXPIRED: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  CANCELLED: { backgroundColor: '#fef2f2', color: '#991b1b' },
};

const MyReservations = () => {
  const { t } = useTranslation();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await libraryService.reservations.myReservations();
      setReservations(res.data.results || res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId) => {
    try {
      setCancelling(reservationId);
      await libraryService.reservations.cancel(reservationId);
      await fetchReservations();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        <i className="fas fa-bookmark" style={{ marginRight: '0.5rem' }} />
        {t('myReservations.title', 'Mes réservations')}
      </h1>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {reservations.length === 0 ? (
        <p style={{ color: '#6b7280' }}>
          {t('myReservations.empty', 'Vous n\'avez aucune réservation.')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              style={{
                border: `1px solid ${reservation.status === 'NOTIFIED' ? '#a7f3d0' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: reservation.status === 'NOTIFIED' ? '#f0fdf4' : 'white',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    {reservation.book_title}
                  </h3>
                  {reservation.library_name && (
                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      {reservation.library_name}
                    </p>
                  )}
                </div>
                <span style={{
                  padding: '0.2rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  ...(STATUS_STYLES[reservation.status] || STATUS_STYLES.PENDING),
                }}>
                  {reservation.status === 'PENDING' && t('myReservations.statusPending', 'En attente')}
                  {reservation.status === 'NOTIFIED' && t('myReservations.statusNotified', 'Disponible !')}
                  {reservation.status === 'FULFILLED' && t('myReservations.statusFulfilled', 'Satisfaite')}
                  {reservation.status === 'EXPIRED' && t('myReservations.statusExpired', 'Expirée')}
                  {reservation.status === 'CANCELLED' && t('myReservations.statusCancelled', 'Annulée')}
                </span>
              </div>

              <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginTop: '0.75rem',
                fontSize: '0.9rem',
                color: '#6b7280',
                flexWrap: 'wrap',
              }}>
                <span>
                  <i className="fas fa-calendar" style={{ marginRight: '0.3rem' }} />
                  {t('myReservations.createdAt', 'Réservé le')} {new Date(reservation.created_at).toLocaleDateString('fr-FR')}
                </span>
                {reservation.notified_at && (
                  <span style={{ color: '#059669' }}>
                    <i className="fas fa-bell" style={{ marginRight: '0.3rem' }} />
                    {t('myReservations.notifiedAt', 'Notifié le')} {new Date(reservation.notified_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Message spécial NOTIFIED */}
              {reservation.status === 'NOTIFIED' && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '6px',
                  color: '#065f46',
                  fontSize: '0.9rem',
                }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }} />
                  {t('myReservations.notifiedMessage', 'Le livre est disponible ! Rendez-vous à la bibliothèque pour l\'emprunter.')}
                  {reservation.expires_at && (
                    <span style={{ fontWeight: 600 }}>
                      {' '}{t('myReservations.expiresAt', 'Expire le')} {new Date(reservation.expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              )}

              {/* Bouton annuler — seulement PENDING */}
              {reservation.status === 'PENDING' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleCancel(reservation.id)}
                    disabled={cancelling === reservation.id}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      opacity: cancelling === reservation.id ? 0.6 : 1,
                    }}
                  >
                    <i className="fas fa-times" style={{ marginRight: '0.3rem' }} />
                    {cancelling === reservation.id
                      ? t('common.loading')
                      : t('myReservations.cancel', 'Annuler la réservation')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservations;
