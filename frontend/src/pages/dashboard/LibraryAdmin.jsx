import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import libraryService from '../../services/libraryService';
import { handleApiError } from '../../services/api';

const LibraryAdmin = () => {
  const { t } = useTranslation();
  const { id: orgId } = useParams();
  const [stats, setStats] = useState(null);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(null);
  const [returning, setReturning] = useState(null);

  useEffect(() => {
    if (orgId) fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, pendingRes, activeRes, catalogRes] = await Promise.all([
        libraryService.dashboard.get(orgId),
        libraryService.loans.list(orgId, { status: 'REQUESTED' }),
        libraryService.loans.list(orgId, { status: 'ACTIVE' }),
        libraryService.catalog.list(orgId),
      ]);
      setStats(statsRes.data);
      setPendingLoans(pendingRes.data.results || pendingRes.data);
      setActiveLoans(activeRes.data.results || activeRes.data);
      setCatalog(catalogRes.data.results || catalogRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      setApproving(loanId);
      await libraryService.loans.approve(loanId);
      await fetchAll();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setApproving(null);
    }
  };

  const handleReturn = async (loanId) => {
    try {
      setReturning(loanId);
      await libraryService.loans.returnLoan(loanId);
      await fetchAll();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setReturning(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        <i className="fas fa-book-reader" style={{ marginRight: '0.5rem' }} />
        {t('libraryAdmin.title', 'Gestion de la bibliothèque')}
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

      {/* ── Section 1 : Statistiques ── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {[
            { label: t('libraryAdmin.catalogCount', 'Livres au catalogue'), value: stats.catalog_count, icon: 'fas fa-book', color: '#2563eb' },
            { label: t('libraryAdmin.activeLoans', 'Prêts actifs'), value: stats.active_loans, icon: 'fas fa-handshake', color: '#059669' },
            { label: t('libraryAdmin.overdueLoans', 'En retard'), value: stats.overdue_loans, icon: 'fas fa-exclamation-triangle', color: '#dc2626' },
            { label: t('libraryAdmin.totalMembers', 'Membres'), value: stats.total_members, icon: 'fas fa-users', color: '#7c3aed' },
            { label: t('libraryAdmin.pendingReservations', 'Réservations'), value: stats.pending_reservations, icon: 'fas fa-clock', color: '#d97706' },
          ].map((stat) => (
            <div key={stat.label} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: 'white',
              textAlign: 'center',
            }}>
              <i className={stat.icon} style={{ fontSize: '1.5rem', color: stat.color, marginBottom: '0.5rem', display: 'block' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 2 : Prêts en attente d'approbation ── */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
        <i className="fas fa-hourglass-half" style={{ marginRight: '0.5rem', color: '#d97706' }} />
        {t('libraryAdmin.pendingLoans', 'Prêts en attente d\'approbation')}
        {pendingLoans.length > 0 && (
          <span style={{
            marginLeft: '0.5rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            backgroundColor: '#fffbeb',
            color: '#92400e',
          }}>
            {pendingLoans.length}
          </span>
        )}
      </h2>

      {pendingLoans.length === 0 ? (
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          {t('libraryAdmin.noPendingLoans', 'Aucun prêt en attente.')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {pendingLoans.map((loan) => (
            <div key={loan.id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div>
                <strong>{loan.book_title}</strong>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {t('libraryAdmin.borrower', 'Emprunteur')} : {loan.borrower_name || loan.borrower}
                  {' — '}
                  {new Date(loan.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <button
                onClick={() => handleApprove(loan.id)}
                disabled={approving === loan.id}
                style={{
                  padding: '0.5rem 1.2rem',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  opacity: approving === loan.id ? 0.6 : 1,
                }}
              >
                <i className="fas fa-check" style={{ marginRight: '0.3rem' }} />
                {approving === loan.id
                  ? t('common.loading')
                  : t('libraryAdmin.approve', 'Approuver')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 3 : Prêts actifs / en retard ── */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
        <i className="fas fa-exchange-alt" style={{ marginRight: '0.5rem', color: '#059669' }} />
        {t('libraryAdmin.activeLoansTitle', 'Prêts actifs')}
        {activeLoans.length > 0 && (
          <span style={{
            marginLeft: '0.5rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
          }}>
            {activeLoans.length}
          </span>
        )}
      </h2>

      {activeLoans.length === 0 ? (
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          {t('libraryAdmin.noActiveLoans', 'Aucun prêt actif.')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {activeLoans.map((loan) => {
            const isOverdue = loan.is_overdue || (loan.due_date && new Date(loan.due_date) < new Date());
            return (
              <div key={loan.id} style={{
                border: `1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: isOverdue ? '#fff5f5' : 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{loan.book_title}</strong>
                    {isOverdue && (
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#fef2f2',
                        color: '#991b1b',
                      }}>
                        {t('libraryAdmin.overdue', 'EN RETARD')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {loan.borrower_name || loan.borrower}
                    {loan.borrowed_at && (
                      <span> — {t('libraryAdmin.since', 'depuis le')} {new Date(loan.borrowed_at).toLocaleDateString('fr-FR')}</span>
                    )}
                    {loan.due_date && (
                      <span style={isOverdue ? { color: '#dc2626', fontWeight: 600 } : {}}>
                        {' — '}{t('libraryAdmin.dueDate', 'retour')} {new Date(loan.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleReturn(loan.id)}
                  disabled={returning === loan.id}
                  style={{
                    padding: '0.5rem 1.2rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    opacity: returning === loan.id ? 0.6 : 1,
                  }}
                >
                  <i className="fas fa-undo" style={{ marginRight: '0.3rem' }} />
                  {returning === loan.id
                    ? t('common.loading')
                    : t('libraryAdmin.returnBook', 'Retourner')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 4 : Catalogue ── */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
        <i className="fas fa-th-list" style={{ marginRight: '0.5rem', color: '#2563eb' }} />
        {t('libraryAdmin.catalogTitle', 'Catalogue')}
        {catalog.length > 0 && (
          <span style={{
            marginLeft: '0.5rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            backgroundColor: '#eff6ff',
            color: '#1e40af',
          }}>
            {catalog.length}
          </span>
        )}
      </h2>

      {catalog.length === 0 ? (
        <p style={{ color: '#6b7280' }}>
          {t('libraryAdmin.emptyCatalog', 'Le catalogue est vide.')}
        </p>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'white',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {t('libraryAdmin.bookTitle', 'Titre')}
                </th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {t('libraryAdmin.author', 'Auteur')}
                </th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {t('libraryAdmin.stock', 'Stock')}
                </th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {t('libraryAdmin.digital', 'Numérique')}
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.6rem 1rem' }}>{item.book_title}</td>
                  <td style={{ padding: '0.6rem 1rem', color: '#6b7280' }}>{item.book_author || '—'}</td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 600,
                      color: item.available_copies > 0 ? '#059669' : '#dc2626',
                    }}>
                      {item.available_copies}
                    </span>
                    <span style={{ color: '#9ca3af' }}> / {item.total_copies}</span>
                  </td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                    {item.allows_digital_loan ? (
                      <i className="fas fa-check-circle" style={{ color: '#059669' }} />
                    ) : (
                      <i className="fas fa-times-circle" style={{ color: '#d1d5db' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LibraryAdmin;
