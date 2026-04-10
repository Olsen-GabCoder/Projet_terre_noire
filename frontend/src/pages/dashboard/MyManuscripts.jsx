import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import manuscriptService from '../../services/manuscriptService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING: { label: 'En attente', color: '#f59e0b', icon: 'fas fa-clock' },
  REVIEWING: { label: 'En cours d\'examen', color: '#3b82f6', icon: 'fas fa-search' },
  QUOTE_SENT: { label: 'Devis reçu', color: '#8b5cf6', icon: 'fas fa-file-invoice' },
  COUNTER_PROPOSAL: { label: 'Contre-proposition', color: '#6366f1', icon: 'fas fa-sync-alt' },
  ACCEPTED: { label: 'Accepté', color: '#10b981', icon: 'fas fa-check-circle' },
  REJECTED: { label: 'Rejeté', color: '#ef4444', icon: 'fas fa-times-circle' },
  QUOTE_REJECTED: { label: 'Devis refusés', color: '#94a3b8', icon: 'fas fa-ban' },
};

const MyManuscripts = () => {
  const [manuscripts, setManuscripts] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lockModal, setLockModal] = useState(null); // 'lock' | 'unlock' | null
  const [lockLoading, setLockLoading] = useState(false);

  const fetchList = useCallback(() => {
    manuscriptService.getMyManuscripts()
      .then((res) => setManuscripts(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => setError('Impossible de charger vos soumissions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const toggleExpand = (ms) => {
    if (expandedId === ms.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(ms.id);
    setDetailLoading(true);
    manuscriptService.getMyManuscript(ms.id)
      .then((res) => setDetail(res.data))
      .catch(() => toast.error('Erreur de chargement du détail.'))
      .finally(() => setDetailLoading(false));
  };

  const handleLock = async () => {
    if (!detail) return;
    setLockLoading(true);
    try {
      await manuscriptService.lockMarket(detail.id);
      toast.success('Marché ouvert verrouillé pour 15 jours.');
      // Refresh
      const res = await manuscriptService.getMyManuscript(detail.id);
      setDetail(res.data);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du verrouillage.');
    } finally {
      setLockLoading(false);
      setLockModal(null);
    }
  };

  const handleUnlock = async () => {
    if (!detail) return;
    setLockLoading(true);
    try {
      await manuscriptService.unlockMarket(detail.id);
      toast.success('Marché ouvert déverrouillé.');
      const res = await manuscriptService.getMyManuscript(detail.id);
      setDetail(res.data);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du déverrouillage.');
    } finally {
      setLockLoading(false);
      setLockModal(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

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
            <Link to="/submit-manuscript" className="dashboard-btn dashboard-btn--primary">
              <i className="fas fa-pen" /> Soumettre un manuscrit
            </Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2>{manuscripts.length} soumission{manuscripts.length > 1 ? 's' : ''}</h2>
            <Link to="/submit-manuscript" className="dashboard-card__link">
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
                  const isExpanded = expandedId === ms.id;
                  return (
                    <>
                      <tr key={ms.id} onClick={() => toggleExpand(ms)} style={{ cursor: 'pointer' }}>
                        <td className="org-manuscripts__ref">MS-{String(ms.id).padStart(5, '0')}</td>
                        <td className="org-manuscripts__title">{ms.title}</td>
                        <td>{ms.genre_display}</td>
                        <td>
                          {ms.target_organization_name
                            ? <span><i className="fas fa-building" /> {ms.target_organization_name}</span>
                            : ms.is_open_market
                            ? <span>
                                <i className="fas fa-globe" /> Marché ouvert
                                {ms.open_market_locked && (
                                  <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                                    <i className="fas fa-lock" /> Verrouillé
                                  </span>
                                )}
                              </span>
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td>
                          <span className="org-manuscripts__status" style={{ color: st.color }}>
                            <i className={st.icon} /> {st.label}
                          </span>
                        </td>
                        <td className="text-muted">{formatDate(ms.submitted_at)}</td>
                      </tr>

                      {/* Panneau de détail pour marché ouvert */}
                      {isExpanded && ms.is_open_market && (
                        <tr key={`detail-${ms.id}`}>
                          <td colSpan={6} style={{ padding: 0, background: 'var(--color-bg-section-alt)' }}>
                            {detailLoading ? (
                              <div style={{ padding: '1.5rem', textAlign: 'center' }}><i className="fas fa-spinner fa-spin" /> Chargement...</div>
                            ) : detail ? (
                              <div style={{ padding: '1.25rem 1.5rem' }}>
                                {/* État du verrou */}
                                {detail.open_market_locked ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, marginBottom: '1rem' }}>
                                    <i className="fas fa-lock" style={{ color: '#f59e0b', fontSize: '1.1rem' }} />
                                    <div style={{ flex: 1 }}>
                                      <strong style={{ fontSize: '0.88rem' }}>Marché verrouillé</strong>
                                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#92400e' }}>
                                        Fenêtre de comparaison jusqu'au {formatDate(detail.open_market_deadline)}. Aucun nouveau devis ne sera accepté.
                                      </p>
                                    </div>
                                    <button onClick={() => setLockModal('unlock')} className="dashboard-btn" style={{ fontSize: '0.82rem' }}>
                                      <i className="fas fa-unlock" /> Déverrouiller
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-card)', borderRadius: 8, marginBottom: '1rem' }}>
                                    <i className="fas fa-globe" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }} />
                                    <div style={{ flex: 1 }}>
                                      <strong style={{ fontSize: '0.88rem' }}>Marché ouvert</strong>
                                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted-ui)' }}>
                                        Les éditeurs peuvent encore soumettre des devis.
                                      </p>
                                    </div>
                                    {detail.quotes_summary && detail.quotes_summary.length > 0 && (
                                      <button onClick={() => setLockModal('lock')} className="dashboard-btn dashboard-btn--primary" style={{ fontSize: '0.82rem' }}>
                                        <i className="fas fa-lock" /> Verrouiller le marché
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Liste des devis reçus */}
                                {detail.quotes_summary && detail.quotes_summary.length > 0 ? (
                                  <div>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                      <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--color-text-muted-ui)' }} /> {detail.quotes_summary.length} devis reçu{detail.quotes_summary.length > 1 ? 's' : ''}
                                    </h4>
                                    {detail.quotes_summary.map((q) => (
                                      <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border-card)', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600, minWidth: 100 }}>{q.reference}</span>
                                        <span style={{ flex: 1, color: 'var(--color-text-muted-ui)' }}>{q.organization_name}</span>
                                        <span style={{ fontWeight: 600 }}>{q.total_ttc ? `${Math.round(q.total_ttc).toLocaleString('fr-FR')} FCFA` : '—'}</span>
                                        <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 8, background: q.status === 'SENT' ? '#dbeafe' : q.status === 'ACCEPTED' ? '#d1fae5' : '#f1f5f9', color: q.status === 'SENT' ? '#2563eb' : q.status === 'ACCEPTED' ? '#059669' : '#64748b' }}>
                                          {q.status_display}
                                        </span>
                                        <Link to={`/dashboard/my-quotes/${q.id}`} style={{ fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                                          Consulter <i className="fas fa-chevron-right" />
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted-ui)' }}>
                                    <i className="fas fa-hourglass-half" /> Aucun devis reçu pour le moment.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </>
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

      {/* ══ Modal de confirmation verrouillage ══ */}
      {lockModal === 'lock' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fef3c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <i className="fas fa-lock" style={{ fontSize: '1.5rem', color: '#f59e0b' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Verrouiller votre marché ouvert ?</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              En verrouillant, vous déclarez avoir reçu suffisamment d'offres. Pendant 15 jours :
            </p>
            <ul style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.85rem', lineHeight: 1.7, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
              <li>Aucun nouvel éditeur ne pourra soumettre de devis</li>
              <li>La validité de tous vos devis en cours sera prolongée jusqu'à la fin de cette fenêtre</li>
              <li>Vous pourrez comparer les offres sereinement et faire votre choix</li>
            </ul>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted-ui)', marginBottom: '1.25rem' }}>
              Cette action est réversible : vous pourrez déverrouiller à tout moment si vous souhaitez recevoir de nouvelles offres.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="dashboard-btn" onClick={() => setLockModal(null)}>Annuler</button>
              <button className="dashboard-btn" onClick={handleLock} disabled={lockLoading} style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                {lockLoading ? <><i className="fas fa-spinner fa-spin" /> Verrouillage...</> : <><i className="fas fa-lock" /> Verrouiller le marché</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal de confirmation déverrouillage ══ */}
      {lockModal === 'unlock' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#dbeafe', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <i className="fas fa-unlock" style={{ fontSize: '1.5rem', color: '#3b82f6' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Déverrouiller votre marché ouvert ?</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted-ui)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Les éditeurs pourront à nouveau soumettre des devis pour ce manuscrit. La fenêtre de comparaison de 15 jours sera annulée.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="dashboard-btn" onClick={() => setLockModal(null)}>Annuler</button>
              <button className="dashboard-btn" onClick={handleUnlock} disabled={lockLoading} style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>
                {lockLoading ? <><i className="fas fa-spinner fa-spin" /> Déverrouillage...</> : <><i className="fas fa-unlock" /> Déverrouiller</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyManuscripts;
