import { useState, useEffect } from 'react';
import libraryService from '../../services/libraryService';
import { handleApiError } from '../../services/api';
import { useTranslation } from 'react-i18next';

const MyLoans = () => {
  const [loans, setLoans] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extending, setExtending] = useState(null);
  const [extendDays, setExtendDays] = useState(7);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await libraryService.loans.myLoans();
      setLoans(res.data.results || res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async (loanId) => {
    try {
      await libraryService.loans.extend(loanId, { extended_days: extendDays });
      setExtending(null);
      await fetchLoans();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const getStatusStyle = (status, isOverdue) => {
    if (isOverdue) return { backgroundColor: '#fef2f2', color: '#991b1b' };
    const styles = {
      REQUESTED: { backgroundColor: '#fffbeb', color: '#92400e' },
      ACTIVE: { backgroundColor: '#ecfdf5', color: '#065f46' },
      RETURNED: { backgroundColor: '#f3f4f6', color: '#374151' },
      CANCELLED: { backgroundColor: '#fef2f2', color: '#991b1b' },
      OVERDUE: { backgroundColor: '#fef2f2', color: '#991b1b' },
    };
    return styles[status] || { backgroundColor: '#f3f4f6', color: '#374151' };
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Mes prêts</h1>

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

      {loans.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Vous n'avez aucun prêt en cours.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map((loan) => (
            <div
              key={loan.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{loan.book_title}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{loan.library_name}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.2rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    ...getStatusStyle(loan.status, loan.is_overdue),
                  }}>
                    {loan.is_overdue ? 'En retard' : loan.status_display}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    backgroundColor: '#eff6ff',
                    color: '#1e40af',
                  }}>
                    {loan.loan_type_display}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.9rem', color: '#6b7280', flexWrap: 'wrap' }}>
                {loan.borrowed_at && (
                  <span>
                    <i className="fas fa-calendar" /> Emprunté le {new Date(loan.borrowed_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {loan.due_date && (
                  <span style={loan.is_overdue ? { color: '#dc2626', fontWeight: 600 } : {}}>
                    <i className="fas fa-clock" /> Retour prévu {new Date(loan.due_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {loan.returned_at && (
                  <span>
                    <i className="fas fa-check" /> Retourné le {new Date(loan.returned_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Bouton prolongation pour les prêts actifs */}
              {loan.status === 'ACTIVE' && (
                <div style={{ marginTop: '0.75rem' }}>
                  {extending === loan.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={extendDays}
                        onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                        style={{
                          width: '80px',
                          padding: '0.4rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>jours</span>
                      <button
                        onClick={() => handleExtend(loan.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setExtending(null)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExtending(loan.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: 'transparent',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      <i className="fas fa-clock" /> Demander une prolongation
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLoans;
