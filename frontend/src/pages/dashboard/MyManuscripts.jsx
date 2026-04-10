import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import manuscriptService from '../../services/manuscriptService';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES = {
  PENDING: { label: 'En attente', color: '#f59e0b', icon: 'fas fa-clock' },
  REVIEWING: { label: 'En cours d\'examen', color: '#3b82f6', icon: 'fas fa-search' },
  ACCEPTED: { label: 'Accepté', color: '#10b981', icon: 'fas fa-check-circle' },
  REJECTED: { label: 'Rejeté', color: '#ef4444', icon: 'fas fa-times-circle' },
};

const MyManuscripts = () => {
  const [manuscripts, setManuscripts] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    manuscriptService.getMyManuscripts()
      .then((res) => setManuscripts(res.data))
      .catch(() => setError('Impossible de charger vos soumissions.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="my-manuscripts">
      <div className="dashboard-home__header">
        <h1><i className="fas fa-file-alt" /> Mes Soumissions</h1>
        <p className="dashboard-home__subtitle">Suivez le statut de vos manuscrits soumis</p>
      </div>

      {manuscripts.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fas fa-inbox" style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
            <p style={{ color: '#64748b', marginBottom: 16 }}>Vous n'avez pas encore soumis de manuscrit.</p>
            <Link to="/soumettre-manuscrit" className="dashboard-btn dashboard-btn--primary">
              <i className="fas fa-pen" /> Soumettre un manuscrit
            </Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2>{manuscripts.length} soumission{manuscripts.length > 1 ? 's' : ''}</h2>
            <Link to="/soumettre-manuscrit" className="dashboard-card__link">
              <i className="fas fa-plus" /> Nouveau
            </Link>
          </div>
          <div className="dashboard-card__body" style={{ padding: 0 }}>
            <table className="org-manuscripts__table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Titre</th>
                  <th>Genre</th>
                  <th>Destination</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((ms) => {
                  const st = STATUS_STYLES[ms.status] || STATUS_STYLES.PENDING;
                  return (
                    <tr key={ms.id}>
                      <td className="org-manuscripts__ref">MS-{String(ms.id).padStart(5, '0')}</td>
                      <td className="org-manuscripts__title">{ms.title}</td>
                      <td>{ms.genre_display}</td>
                      <td>
                        {ms.target_organization_name
                          ? <span><i className="fas fa-building" /> {ms.target_organization_name}</span>
                          : ms.is_open_market
                          ? <span><i className="fas fa-globe" /> Marché ouvert</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>
                        <span className="org-manuscripts__status" style={{ color: st.color }}>
                          <i className={st.icon} /> {st.label}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(ms.submitted_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {manuscripts.some((ms) => ms.status === 'REJECTED' && ms.rejection_reason) && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ marginBottom: 8 }}>Retours reçus</h4>
                {manuscripts.filter((ms) => ms.status === 'REJECTED' && ms.rejection_reason).map((ms) => (
                  <div key={ms.id} style={{ background: '#fef2f2', borderLeft: '3px solid #ef4444', padding: '10px 14px', marginBottom: 8, borderRadius: 4 }}>
                    <strong>MS-{String(ms.id).padStart(5, '0')} — {ms.title}</strong>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>{ms.rejection_reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyManuscripts;
