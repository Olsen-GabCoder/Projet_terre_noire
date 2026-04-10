import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import manuscriptService from '../../services/manuscriptService';
import servicesService from '../../services/servicesService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  PENDING:           { label: 'En attente',           color: '#f59e0b', icon: 'fas fa-clock' },
  REVIEWING:         { label: 'En cours d\u2019examen', color: '#3b82f6', icon: 'fas fa-search' },
  QUOTE_SENT:        { label: 'Devis envoy\u00e9',    color: '#6366f1', icon: 'fas fa-paper-plane' },
  COUNTER_PROPOSAL:  { label: 'Contre-proposition',   color: '#f97316', icon: 'fas fa-exchange-alt' },
  QUOTE_REJECTED:    { label: 'Devis refus\u00e9',    color: '#991b1b', icon: 'fas fa-hand-paper' },
  ACCEPTED:          { label: 'Accept\u00e9',         color: '#10b981', icon: 'fas fa-check-circle' },
  REJECTED:          { label: 'Refus\u00e9',          color: '#ef4444', icon: 'fas fa-times-circle' },
};

const QUOTE_STATUS_LABELS = {
  DRAFT:              'Brouillon',
  SENT:               'Envoy\u00e9',
  ACCEPTED:           'Accept\u00e9',
  REJECTED:           'Refus\u00e9',
  REVISION_REQUESTED: 'R\u00e9vision demand\u00e9e',
  EXPIRED:            'Expir\u00e9',
  CANCELLED:          'Annul\u00e9',
};

const formatFCFA = (val) => {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
};

const OrgManuscripts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: orgId } = useParams();
  const { hasOrgRole } = useAuth();
  const canManage = hasOrgRole(Number(orgId), 'PROPRIETAIRE')
    || hasOrgRole(Number(orgId), 'ADMINISTRATEUR')
    || hasOrgRole(Number(orgId), 'EDITEUR');

  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchManuscripts = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    if (typeFilter) params.type = typeFilter;
    manuscriptService.getOrgManuscripts(orgId, params)
      .then((res) => setManuscripts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [orgId, filter, typeFilter]);

  useEffect(() => { fetchManuscripts(); }, [fetchManuscripts]);

  const openDetail = (ms) => {
    setDetailLoading(true);
    setActionMsg('');
    setRejectionReason('');
    manuscriptService.getOrgManuscript(orgId, ms.id)
      .then((res) => setSelected(res.data))
      .catch(() => setSelected(ms))
      .finally(() => setDetailLoading(false));
  };

  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const payload = { status: newStatus };
      if (newStatus === 'REJECTED' && rejectionReason.trim()) {
        payload.rejection_reason = rejectionReason.trim();
      }
      await manuscriptService.updateStatus(selected.id, payload);
      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      setActionMsg(`Statut mis \u00e0 jour : ${label}`);
      setSelected(null);
      fetchManuscripts();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Erreur lors de la mise \u00e0 jour.');
    } finally {
      setActionLoading(false);
    }
  };

  const buildQuoteUrl = (ms, parentQuoteId) => {
    const params = new URLSearchParams({
      manuscript: ms.id,
      client_name: ms.author_name,
      client_email: ms.email,
      title: `Devis \u00e9dition \u2014 ${ms.title}`,
    });
    if (ms.submitter) params.set('client_id', ms.submitter);
    if (parentQuoteId) params.set('parent_quote', parentQuoteId);
    return `/dashboard/services/quotes/create?${params.toString()}`;
  };

  if (loading && manuscripts.length === 0) {
    return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  }

  return (
    <div className="org-manuscripts">
      <div className="dashboard-home__header">
        <h1><i className="fas fa-inbox" /> Manuscrits</h1>
        <p className="dashboard-home__subtitle">Manuscrits reçus par votre organisation</p>
      </div>

      {error && <div className="dashboard-alert dashboard-alert--error">{error}</div>}
      {actionMsg && <div className="dashboard-alert dashboard-alert--success">{actionMsg}</div>}

      {/* Filtres */}
      <div className="org-manuscripts__filters">
        <div className="org-manuscripts__filter-group">
          <label>Statut</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="org-manuscripts__filter-group">
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous</option>
            <option value="targeted">{"Ciblé"}</option>
            <option value="open">{"Marché ouvert"}</option>
          </select>
        </div>
        <span className="org-manuscripts__count">
          {manuscripts.length} manuscrit{manuscripts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {manuscripts.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-card__body" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fas fa-inbox" style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
            <p style={{ color: '#64748b' }}>Aucun manuscrit pour le moment.</p>
          </div>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-card__body" style={{ padding: 0 }}>
            <table className="org-manuscripts__table">
              <thead>
                <tr>
                  <th>{"Réf."}</th>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Genre</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((ms) => {
                  const st = STATUS_CONFIG[ms.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={ms.id}>
                      <td className="org-manuscripts__ref">MS-{String(ms.id).padStart(5, '0')}</td>
                      <td className="org-manuscripts__title">{ms.title}</td>
                      <td>{ms.author_name}</td>
                      <td>{ms.genre_display}</td>
                      <td>
                        {ms.is_open_market && !ms.target_organization
                          ? <span className="org-manuscripts__badge org-manuscripts__badge--open"><i className="fas fa-globe" /> {"Marché ouvert"}</span>
                          : <span className="org-manuscripts__badge org-manuscripts__badge--targeted"><i className="fas fa-building" /> {"Ciblé"}</span>
                        }
                      </td>
                      <td>
                        <span className="org-manuscripts__status" style={{ color: st.color }}>
                          <i className={st.icon} /> {st.label}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(ms.submitted_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <button className="org-manuscripts__view-btn" onClick={() => openDetail(ms)}>
                          <i className="fas fa-eye" /> Consulter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ Modal détail ══════════ */}
      {selected && (
        <div className="org-manuscripts__overlay" onClick={() => setSelected(null)}>
          <div className="org-manuscripts__modal" onClick={(e) => e.stopPropagation()}>
            <div className="org-manuscripts__modal-header">
              <h2>{"MS-"}{String(selected.id).padStart(5, '0')} {" — "}{selected.title}</h2>
              <button onClick={() => setSelected(null)}><i className="fas fa-times" /></button>
            </div>

            {detailLoading ? (
              <div className="dashboard-loading"><div className="admin-spinner" /></div>
            ) : (
              <div className="org-manuscripts__modal-body">

                {/* Bandeau règle fondamentale */}
                <div className="org-manuscripts__rule-banner">
                  <i className="fas fa-info-circle" />
                  {"Sur Frollot, l'acceptation d'un manuscrit passe obligatoirement par l'envoi d'un devis à l'auteur."}
                </div>

                {/* Statut actuel */}
                {(() => {
                  const st = STATUS_CONFIG[selected.status] || STATUS_CONFIG.PENDING;
                  return (
                    <div className="org-manuscripts__current-status" style={{ borderLeftColor: st.color }}>
                      <i className={st.icon} style={{ color: st.color }} /> {st.label}
                    </div>
                  );
                })()}

                {/* Métadonnées */}
                <div className="org-manuscripts__detail-grid">
                  <div><strong>Auteur</strong><p>{selected.author_name}{selected.pen_name ? ` (${selected.pen_name})` : ''}</p></div>
                  <div><strong>Email</strong><p>{selected.email}</p></div>
                  <div><strong>{"Téléphone"}</strong><p>{selected.phone_number}</p></div>
                  {selected.country && <div><strong>Pays</strong><p>{selected.country}</p></div>}
                  <div><strong>Genre</strong><p>{selected.genre_display || selected.genre}</p></div>
                  <div><strong>Langue</strong><p>{selected.language_display || selected.language}</p></div>
                  {selected.page_count && <div><strong>Pages</strong><p>{selected.page_count}</p></div>}
                </div>
                <div className="org-manuscripts__description">
                  <strong>Description</strong>
                  <p>{selected.description}</p>
                </div>
                {selected.file_url && (
                  <button
                    type="button"
                    className="dashboard-btn dashboard-btn--secondary"
                    style={{ marginBottom: 16 }}
                    onClick={async () => {
                      try {
                        const res = await api.get(selected.file_url, { responseType: 'blob' });
                        const blobUrl = URL.createObjectURL(res.data);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `manuscrit-${selected.id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(blobUrl);
                      } catch (err) {
                        toast.error(err.response?.status === 403
                          ? "Vous n'avez pas accès à ce manuscrit."
                          : 'Erreur lors du téléchargement.');
                      }
                    }}
                  >
                    <i className="fas fa-download" /> {"Télécharger le manuscrit"}
                  </button>
                )}

                {/* ── Devis liés ── */}
                {selected.quotes_summary && selected.quotes_summary.length > 0 && (
                  <div className="org-manuscripts__quotes-section">
                    <h4><i className="fas fa-file-invoice-dollar" /> {"Devis liés à ce manuscrit"}</h4>
                    <div className="org-manuscripts__quotes-list">
                      {[...selected.quotes_summary]
                        .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
                        .map((q) => (
                          <div key={q.id} className="org-manuscripts__quote-card">
                            <div className="org-manuscripts__quote-card-header">
                              <span className="org-manuscripts__quote-ref">{q.reference}</span>
                              <span className={`org-manuscripts__quote-status org-manuscripts__quote-status--${q.status.toLowerCase()}`}>
                                {QUOTE_STATUS_LABELS[q.status] || q.status}
                              </span>
                            </div>
                            <div className="org-manuscripts__quote-card-body">
                              {q.publishing_model_display && (
                                <div><strong>{"Modèle :"}</strong> {q.publishing_model_display}</div>
                              )}
                              <div><strong>Total TTC :</strong> {formatFCFA(q.total_ttc)}</div>
                              {q.organization_name && <div><strong>{"Éditeur :"}</strong> {q.organization_name}</div>}
                              {q.sent_at && <div><strong>{"Envoyé le :"}</strong> {new Date(q.sent_at).toLocaleDateString('fr-FR')}</div>}
                              {q.valid_until && <div><strong>{"Valide jusqu'au :"}</strong> {new Date(q.valid_until).toLocaleDateString('fr-FR')}</div>}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* ── Actions selon le statut ── */}
                {canManage && (
                  <div className="org-manuscripts__actions">
                    <h4>Actions</h4>

                    {/* PENDING */}
                    {selected.status === 'PENDING' && (
                      <div className="org-manuscripts__action-buttons">
                        <button
                          className="dashboard-btn dashboard-btn--primary"
                          onClick={() => handleStatusChange('REVIEWING')}
                          disabled={actionLoading}
                        >
                          <i className="fas fa-search" /> Passer en examen
                        </button>
                        <div className="org-manuscripts__reject-section">
                          <textarea
                            placeholder="Motif du refus (optionnel)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                          <button
                            className="dashboard-btn dashboard-btn--danger"
                            onClick={() => handleStatusChange('REJECTED')}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-times" /> Refuser
                          </button>
                        </div>
                      </div>
                    )}

                    {/* REVIEWING */}
                    {selected.status === 'REVIEWING' && (
                      <div className="org-manuscripts__action-buttons">
                        <button
                          className="dashboard-btn dashboard-btn--primary"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => navigate(buildQuoteUrl(selected))}
                        >
                          <i className="fas fa-file-invoice-dollar" /> {"Préparer un devis pour l'auteur"}
                        </button>
                        <div className="org-manuscripts__reject-section">
                          <textarea
                            placeholder={"Motif du refus éditorial (optionnel)"}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                          <button
                            className="dashboard-btn dashboard-btn--danger"
                            onClick={() => handleStatusChange('REJECTED')}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-times" /> Refuser le manuscrit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* QUOTE_SENT */}
                    {selected.status === 'QUOTE_SENT' && (
                      <div className="org-manuscripts__waiting-banner">
                        <i className="fas fa-hourglass-half" />
                        <div>
                          <strong>{"En attente de la réponse de l'auteur."}</strong>
                          {(() => {
                            const sentQuote = selected.quotes_summary?.find(q => q.status === 'SENT');
                            if (sentQuote?.valid_until) {
                              return <p>{"Le devis est valide jusqu'au "}{new Date(sentQuote.valid_until).toLocaleDateString('fr-FR')}.</p>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}

                    {/* COUNTER_PROPOSAL */}
                    {selected.status === 'COUNTER_PROPOSAL' && (
                      <div className="org-manuscripts__action-buttons">
                        <div className="org-manuscripts__waiting-banner org-manuscripts__waiting-banner--action">
                          <i className="fas fa-exchange-alt" />
                          <div>
                            <strong>{"L'auteur demande une révision du devis."}</strong>
                            {(() => {
                              const revQuote = selected.quotes_summary?.find(q => q.status === 'REVISION_REQUESTED');
                              return revQuote ? <p>{"Devis concerné : "}{revQuote.reference}</p> : null;
                            })()}
                          </div>
                        </div>
                        <button
                          className="dashboard-btn dashboard-btn--primary"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            const revQuote = selected.quotes_summary?.find(q => q.status === 'REVISION_REQUESTED');
                            navigate(buildQuoteUrl(selected, revQuote?.id));
                          }}
                        >
                          <i className="fas fa-redo" /> {"Envoyer un devis révisé"}
                        </button>
                      </div>
                    )}

                    {/* QUOTE_REJECTED */}
                    {selected.status === 'QUOTE_REJECTED' && (
                      <div className="org-manuscripts__action-buttons">
                        <div className="org-manuscripts__waiting-banner org-manuscripts__waiting-banner--rejected">
                          <i className="fas fa-hand-paper" />
                          <div>
                            <strong>{"L'auteur a refusé toutes les offres."}</strong>
                            <p>{"Vous pouvez tenter une nouvelle proposition ou passer à un autre manuscrit."}</p>
                          </div>
                        </div>
                        <button
                          className="dashboard-btn"
                          style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                          onClick={() => navigate(buildQuoteUrl(selected))}
                        >
                          <i className="fas fa-plus" /> Soumettre une nouvelle offre
                        </button>
                      </div>
                    )}

                    {/* ACCEPTED */}
                    {selected.status === 'ACCEPTED' && (
                      <div className="org-manuscripts__action-buttons">
                        <div className="org-manuscripts__waiting-banner org-manuscripts__waiting-banner--success">
                          <i className="fas fa-check-circle" />
                          <div>
                            <strong>{"Manuscrit accepté — devis approuvé par l'auteur."}</strong>
                            <p>{"Le projet éditorial a été créé automatiquement. Vous pouvez le retrouver dans vos projets."}</p>
                          </div>
                        </div>
                        <button
                          className="dashboard-btn dashboard-btn--primary"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => navigate('/dashboard/projects')}
                        >
                          <i className="fas fa-project-diagram" /> {"Voir mes projets éditoriaux"}
                        </button>
                      </div>
                    )}

                    {/* REJECTED */}
                    {selected.status === 'REJECTED' && (
                      <div className="org-manuscripts__waiting-banner org-manuscripts__waiting-banner--rejected">
                        <i className="fas fa-times-circle" />
                        <div>
                          <strong>{"Manuscrit refusé."}</strong>
                          {selected.rejection_reason && <p>{selected.rejection_reason}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {actionMsg && <div className="dashboard-alert dashboard-alert--success" style={{ marginTop: 12 }}>{actionMsg}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgManuscripts;
