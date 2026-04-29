import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import libraryService from '../../services/libraryService';
import aiService from '../../services/aiService';
import { handleApiError } from '../../services/api';

const TABS = [
  { key: 'overview', icon: 'fas fa-chart-pie', label: 'Tableau de bord' },
  { key: 'loans', icon: 'fas fa-hand-holding', label: 'Prêts' },
  { key: 'catalog', icon: 'fas fa-book', label: 'Catalogue' },
  { key: 'reservations', icon: 'fas fa-bookmark', label: 'Réservations' },
  { key: 'members', icon: 'fas fa-users', label: 'Membres' },
];

function AcquisitionSuggestionsPanel({ orgId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (data) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const result = await aiService.libraryAcquisitions(Number(orgId));
      setData(result);
      setOpen(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erreur suggestions IA');
    }
    setLoading(false);
  };

  const priorities = { haute: '#e74c3c', moyenne: '#f59e0b', basse: '#22c55e' };

  return (
    <div className="la__quick la__quick--ai">
      <button className="la__ai-btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> Analyse en cours...</>
          : open
            ? <><i className="fas fa-chevron-up" /> Masquer les suggestions</>
            : <><i className="fas fa-robot" /> Suggestions d'acquisitions (IA)</>
        }
      </button>
      {open && data?.suggestions?.length > 0 && (
        <div className="la__acq-list">
          {data.suggestions.map((s, i) => (
            <div key={i} className="la__acq-card">
              <div className="la__acq-card__header">
                <div>
                  <strong>{s.title}</strong>
                  {s.author && <span className="la__acq-card__author"> — {s.author}</span>}
                </div>
                {s.priority && (
                  <span className="la__acq-card__priority" style={{ color: priorities[s.priority] || 'inherit' }}>
                    {s.priority}
                  </span>
                )}
              </div>
              <p className="la__acq-card__reason"><i className="fas fa-comment-dots" /> {s.reason}</p>
            </div>
          ))}
        </div>
      )}
      {open && data && (!data.suggestions || data.suggestions.length === 0) && (
        <p className="la__acq-empty"><i className="fas fa-check-circle" /> Votre catalogue répond bien à la demande actuelle.</p>
      )}
    </div>
  );
}

const LibraryAdmin = () => {
  const { t } = useTranslation();
  const { id: orgId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null); // { loan_id -> prediction }
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const [loanFilter, setLoanFilter] = useState('all');
  const [resFilter, setResFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  // Member edit
  const [editingMember, setEditingMember] = useState(null);
  const [editType, setEditType] = useState('');
  const [editExpires, setEditExpires] = useState('');

  useEffect(() => {
    if (orgId) fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, pendingRes, activeRes, overdueRes, pendingResRes, allResRes, catalogRes, membersRes] = await Promise.all([
        libraryService.dashboard.get(orgId),
        libraryService.loans.list(orgId, { status: 'REQUESTED' }),
        libraryService.loans.list(orgId, { status: 'ACTIVE' }),
        libraryService.loans.list(orgId, { status: 'OVERDUE' }),
        libraryService.reservations.list(orgId, { status: 'PENDING' }),
        libraryService.reservations.list(orgId),
        libraryService.catalog.list(orgId),
        libraryService.members.list(orgId),
      ]);
      setStats(statsRes.data);
      setPendingLoans(pendingRes.data.results || pendingRes.data);
      setActiveLoans(activeRes.data.results || activeRes.data);
      setOverdueLoans(overdueRes.data.results || overdueRes.data);
      setReservations(pendingResRes.data.results || pendingResRes.data);
      setAllReservations(allResRes.data.results || allResRes.data);
      setCatalog(catalogRes.data.results || catalogRes.data);
      setMembers(membersRes.data.results || membersRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Search
  const match = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  // Actions
  const doAction = async (fn, successMsg) => {
    try { await fn(); toast.success(successMsg); await fetchAll(); }
    catch (err) { toast.error(handleApiError(err)); }
    finally { setActionLoading(null); }
  };

  const handleApprove = (id) => { setActionLoading(`approve-${id}`); doAction(() => libraryService.loans.approve(id), 'Prêt approuvé'); };
  const handleReject = (id) => { if (!window.confirm('Rejeter ce prêt ?')) return; setActionLoading(`reject-${id}`); doAction(() => libraryService.loans.reject(id), 'Prêt rejeté'); };
  const handleReturn = (id) => { setActionLoading(`return-${id}`); doAction(() => libraryService.loans.returnLoan(id), 'Livre retourné'); };
  const handleCancelRes = (id) => { if (!window.confirm('Annuler cette réservation ?')) return; setActionLoading(`cancel-${id}`); doAction(() => libraryService.reservations.cancel(id), 'Réservation annulée'); };

  const handleToggleMember = async (member) => {
    if (!window.confirm(member.is_active ? 'Désactiver ce membre ?' : 'Réactiver ce membre ?')) return;
    setActionLoading(`member-${member.id}`);
    doAction(() => libraryService.members.update(orgId, member.id, { is_active: !member.is_active }), member.is_active ? 'Membre désactivé' : 'Membre réactivé');
  };

  const handleSaveMember = async (member) => {
    setActionLoading(`save-${member.id}`);
    const data = {};
    if (editType) data.membership_type = editType;
    if (editExpires) data.expires_at = new Date(editExpires).toISOString();
    doAction(() => libraryService.members.update(orgId, member.id, data), 'Membre mis à jour');
    setEditingMember(null);
  };

  // Filtered data
  const fPending = useMemo(() => pendingLoans.filter(l => match(`${l.book_title} ${l.borrower_name}`)), [pendingLoans, searchQuery]);
  const fLoans = useMemo(() => {
    let all = [
      ...activeLoans.map(l => ({ ...l, _type: 'active' })),
      ...overdueLoans.map(l => ({ ...l, _type: 'overdue', is_overdue: true })),
    ];
    if (loanFilter === 'active') all = all.filter(l => l._type === 'active');
    if (loanFilter === 'overdue') all = all.filter(l => l._type === 'overdue');
    return all.filter(l => match(`${l.book_title} ${l.borrower_name}`));
  }, [activeLoans, overdueLoans, loanFilter, searchQuery]);
  const fCatalog = useMemo(() => catalog.filter(i => match(`${i.book_title} ${i.book_author || ''}`)), [catalog, searchQuery]);
  const fReservations = useMemo(() => {
    let list = allReservations;
    if (resFilter === 'pending') list = list.filter(r => r.status === 'PENDING');
    else if (resFilter === 'notified') list = list.filter(r => r.status === 'NOTIFIED');
    else if (resFilter === 'done') list = list.filter(r => ['FULFILLED', 'EXPIRED', 'CANCELLED'].includes(r.status));
    return list.filter(r => match(`${r.book_title} ${r.user_name}`));
  }, [allReservations, resFilter, searchQuery]);
  const fMembers = useMemo(() => {
    let list = members;
    if (memberFilter === 'active') list = list.filter(m => m.is_active && !m.is_expired);
    else if (memberFilter === 'expired') list = list.filter(m => m.is_expired);
    else if (memberFilter === 'inactive') list = list.filter(m => !m.is_active);
    return list.filter(m => match(`${m.user_name} ${m.user_email} ${m.membership_number}`));
  }, [members, memberFilter, searchQuery]);

  const isLoading = (key) => actionLoading === key;

  if (loading) {
    return <div className="la" style={{ textAlign: 'center', padding: '3rem' }}><i className="fas fa-spinner fa-spin" /> {t('common.loading')}</div>;
  }

  const resStatusBadge = (status) => {
    const map = {
      PENDING: { cls: 'la-badge--warning', label: 'En attente' },
      NOTIFIED: { cls: 'la-badge--success', label: 'Notifié' },
      FULFILLED: { cls: 'la-badge--info', label: 'Satisfaite' },
      EXPIRED: { cls: 'la-badge--muted', label: 'Expirée' },
      CANCELLED: { cls: 'la-badge--error', label: 'Annulée' },
    };
    const m = map[status] || map.PENDING;
    return <span className={`la-badge ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="la">
      <h1 className="la__title">
        <i className="fas fa-landmark" />
        {t('libraryAdmin.title', 'Gestion de la bibliothèque')}
      </h1>

      {error && <div className="la__error">{error}</div>}

      {/* ── Onglets ── */}
      <div className="la__tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`la__tab ${activeTab === tab.key ? 'la__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon} />
            <span className="la__tab-label">{t(`libraryAdmin.tab.${tab.key}`, tab.label)}</span>
            {tab.key === 'loans' && pendingLoans.length > 0 && <span className="la__tab-count la__tab-count--warn">{pendingLoans.length}</span>}
            {tab.key === 'loans' && overdueLoans.length > 0 && <span className="la__tab-count la__tab-count--error">{overdueLoans.length}</span>}
            {tab.key === 'reservations' && reservations.length > 0 && <span className="la__tab-count">{reservations.length}</span>}
            {tab.key === 'members' && <span className="la__tab-count">{members.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Recherche (visible sauf overview) — même pill que le Header ── */}
      {activeTab !== 'overview' && (
        <div className="la__search">
          <div className={`search-expand__field la__search-open ${searchFocused ? 'la__search-focused' : ''}`}>
            <input
              ref={searchRef}
              type="text"
              className="search-expand__input"
              placeholder={t('libraryAdmin.searchPlaceholder', 'Rechercher...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button type="button" className="search-expand__clear" onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}>
                <i className="fas fa-times" />
              </button>
            )}
            <button type="button" className="search-expand__submit" onClick={() => searchRef.current?.focus()} aria-label={t('common.search')}>
              <i className="fas fa-search" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="la__panel">
          <div className="la__stats">
            {[
              { label: 'Livres au catalogue', value: stats?.catalog_count, icon: 'fas fa-book', cls: 'la-stat--info' },
              { label: 'Prêts actifs', value: stats?.active_loans, icon: 'fas fa-handshake', cls: 'la-stat--success' },
              { label: 'En retard', value: stats?.overdue_loans, icon: 'fas fa-exclamation-triangle', cls: 'la-stat--error' },
              { label: 'Membres', value: stats?.total_members, icon: 'fas fa-users', cls: 'la-stat--purple' },
              { label: 'Réservations', value: stats?.pending_reservations, icon: 'fas fa-bookmark', cls: 'la-stat--warning' },
            ].map(s => (
              <div key={s.label} className={`la__stat ${s.cls}`}>
                <i className={s.icon} />
                <div className="la__stat-val">{s.value ?? 0}</div>
                <div className="la__stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Raccourcis rapides */}
          {pendingLoans.length > 0 && (
            <div className="la__quick">
              <h3 className="la__quick-title">
                <i className="fas fa-hourglass-half" /> {pendingLoans.length} prêt(s) en attente
              </h3>
              {pendingLoans.slice(0, 3).map(loan => (
                <div key={loan.id} className="la__quick-row">
                  <div>
                    <strong>{loan.book_title}</strong>
                    <span className="la__quick-meta"> — {loan.borrower_name}</span>
                  </div>
                  <div className="la__quick-actions">
                    <button className="la-btn la-btn--sm la-btn--success" disabled={isLoading(`approve-${loan.id}`)} onClick={() => handleApprove(loan.id)}>
                      <i className="fas fa-check" /> Approuver
                    </button>
                    <button className="la-btn la-btn--sm la-btn--danger" disabled={isLoading(`reject-${loan.id}`)} onClick={() => handleReject(loan.id)}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
              ))}
              {pendingLoans.length > 3 && (
                <button className="la__quick-more" onClick={() => setActiveTab('loans')}>
                  Voir tous les prêts <i className="fas fa-arrow-right" />
                </button>
              )}
            </div>
          )}

          {overdueLoans.length > 0 && (
            <div className="la__quick la__quick--alert">
              <h3 className="la__quick-title">
                <i className="fas fa-exclamation-triangle" /> {overdueLoans.length} prêt(s) en retard
              </h3>
              {overdueLoans.slice(0, 3).map(loan => (
                <div key={loan.id} className="la__quick-row">
                  <div>
                    <strong>{loan.book_title}</strong>
                    <span className="la__quick-meta"> — {loan.borrower_name} — retour {new Date(loan.due_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <button className="la-btn la-btn--sm la-btn--primary" disabled={isLoading(`return-${loan.id}`)} onClick={() => handleReturn(loan.id)}>
                    <i className="fas fa-undo" /> Retourner
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* AI Library Acquisition Suggestions */}
          <AcquisitionSuggestionsPanel orgId={orgId} />
        </div>
      )}

      {/* ═══ TAB: PRÊTS ═══ */}
      {activeTab === 'loans' && (
        <div className="la__panel">
          {/* Pending */}
          <h3 className="la__subtitle">
            <i className="fas fa-hourglass-half" /> En attente d'approbation
            {fPending.length > 0 && <span className="la-badge la-badge--warning">{fPending.length}</span>}
          </h3>
          {fPending.length === 0 ? (
            <p className="la__empty">Aucun prêt en attente.</p>
          ) : (
            <div className="la__list">
              {fPending.map(loan => (
                <div key={loan.id} className="la__card">
                  <div className="la__card-body">
                    <div className="la__card-title">{loan.book_title}</div>
                    <div className="la__card-meta">
                      <i className="fas fa-user" /> {loan.borrower_name} &middot; {new Date(loan.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="la__card-actions">
                    <button className="la-btn la-btn--success" disabled={isLoading(`approve-${loan.id}`)} onClick={() => handleApprove(loan.id)}>
                      {isLoading(`approve-${loan.id}`) ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Approuver</>}
                    </button>
                    <button className="la-btn la-btn--danger" disabled={isLoading(`reject-${loan.id}`)} onClick={() => handleReject(loan.id)}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active / Overdue */}
          <h3 className="la__subtitle" style={{ marginTop: '1.5rem' }}>
            <i className="fas fa-exchange-alt" /> Prêts en cours
            <span className="la-badge la-badge--info">{activeLoans.length + overdueLoans.length}</span>
          </h3>
          <div className="la__pills">
            {[{ key: 'all', label: 'Tous' }, { key: 'active', label: 'Actifs' }, { key: 'overdue', label: `En retard (${overdueLoans.length})` }].map(p => (
              <button key={p.key} className={`la__pill ${loanFilter === p.key ? 'la__pill--active' : ''} ${p.key === 'overdue' && overdueLoans.length > 0 ? 'la__pill--alert' : ''}`} onClick={() => setLoanFilter(p.key)}>
                {p.label}
              </button>
            ))}
            <button
              className="la__pill la__pill--ai"
              disabled={riskLoading}
              onClick={async () => {
                if (riskData) { setRiskData(null); return; }
                setRiskLoading(true);
                try {
                  const { predictions } = await aiService.predictLateReturn(Number(orgId));
                  const map = {};
                  (predictions || []).forEach(p => { if (p.loan_id) map[p.loan_id] = p; });
                  setRiskData(map);
                } catch { toast.error('Erreur analyse risques'); }
                setRiskLoading(false);
              }}
            >
              {riskLoading
                ? <><i className="fas fa-spinner fa-spin" /> Analyse...</>
                : riskData
                  ? <><i className="fas fa-times" /> Masquer risques</>
                  : <><i className="fas fa-robot" /> Risques IA</>
              }
            </button>
          </div>
          {fLoans.length === 0 ? (
            <p className="la__empty">Aucun prêt actif.</p>
          ) : (
            <div className="la__list">
              {fLoans.map(loan => (
                <div key={loan.id} className={`la__card ${loan.is_overdue ? 'la__card--alert' : ''}`}>
                  <div className="la__card-body">
                    <div className="la__card-title">
                      {loan.book_title}
                      {loan.is_overdue && <span className="la-badge la-badge--error">EN RETARD</span>}
                    </div>
                    <div className="la__card-meta">
                      <i className="fas fa-user" /> {loan.borrower_name}
                      {loan.borrowed_at && <> &middot; depuis le {new Date(loan.borrowed_at).toLocaleDateString('fr-FR')}</>}
                      {loan.due_date && <> &middot; <span className={loan.is_overdue ? 'la--danger-text' : ''}>retour {new Date(loan.due_date).toLocaleDateString('fr-FR')}</span></>}
                      {riskData?.[loan.id] && (() => {
                        const r = riskData[loan.id];
                        const colors = { 'faible': '#22c55e', 'moyen': '#f59e0b', 'élevé': '#e74c3c' };
                        return (
                          <span className="la__risk-badge" style={{ color: colors[r.risk_level] || '#8a857e' }} title={r.reasoning || ''}>
                            <i className="fas fa-chart-line" /> {r.risk_level} ({Math.round((r.probability || 0) * 100)}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="la__card-actions">
                    <button className="la-btn la-btn--primary" disabled={isLoading(`return-${loan.id}`)} onClick={() => handleReturn(loan.id)}>
                      {isLoading(`return-${loan.id}`) ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-undo" /> Retourner</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: CATALOGUE ═══ */}
      {activeTab === 'catalog' && (
        <div className="la__panel">
          <div className="la__table-wrap">
            <table className="la__table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Catégorie</th>
                  <th className="la--center">Stock</th>
                  <th className="la--center">Num.</th>
                  <th className="la--center">Durée</th>
                </tr>
              </thead>
              <tbody>
                {fCatalog.length === 0 ? (
                  <tr><td colSpan={6} className="la__empty-cell">Aucun résultat.</td></tr>
                ) : fCatalog.map(item => (
                  <tr key={item.id}>
                    <td className="la__td-title">{item.book_title}</td>
                    <td>{item.book_author || '—'}</td>
                    <td className="la--muted">{item.book_category || '—'}</td>
                    <td className="la--center">
                      <span className={item.available_copies > 0 ? 'la--success-text' : 'la--danger-text'}>{item.available_copies}</span>
                      <span className="la--muted"> / {item.total_copies}</span>
                    </td>
                    <td className="la--center">
                      {item.allows_digital_loan
                        ? <i className="fas fa-check-circle la--success-text" />
                        : <i className="fas fa-minus la--muted" />}
                    </td>
                    <td className="la--center la--muted">{item.max_loan_days}j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: RÉSERVATIONS ═══ */}
      {activeTab === 'reservations' && (
        <div className="la__panel">
          <div className="la__pills">
            {[
              { key: 'all', label: `Toutes (${allReservations.length})` },
              { key: 'pending', label: `En attente (${allReservations.filter(r => r.status === 'PENDING').length})` },
              { key: 'notified', label: `Notifiées (${allReservations.filter(r => r.status === 'NOTIFIED').length})` },
              { key: 'done', label: 'Terminées' },
            ].map(p => (
              <button key={p.key} className={`la__pill ${resFilter === p.key ? 'la__pill--active' : ''}`} onClick={() => setResFilter(p.key)}>{p.label}</button>
            ))}
          </div>
          {fReservations.length === 0 ? (
            <p className="la__empty">Aucune réservation.</p>
          ) : (
            <div className="la__list">
              {fReservations.map(res => (
                <div key={res.id} className="la__card">
                  <div className="la__card-body">
                    <div className="la__card-title">
                      {res.book_title}
                      {resStatusBadge(res.status)}
                    </div>
                    <div className="la__card-meta">
                      <i className="fas fa-user" /> {res.user_name} &middot; réservé le {new Date(res.created_at).toLocaleDateString('fr-FR')}
                      {res.notified_at && <> &middot; notifié le {new Date(res.notified_at).toLocaleDateString('fr-FR')}</>}
                      {res.expires_at && <> &middot; expire le {new Date(res.expires_at).toLocaleDateString('fr-FR')}</>}
                    </div>
                  </div>
                  {['PENDING', 'NOTIFIED'].includes(res.status) && (
                    <div className="la__card-actions">
                      <button className="la-btn la-btn--danger la-btn--sm" disabled={isLoading(`cancel-${res.id}`)} onClick={() => handleCancelRes(res.id)}>
                        <i className="fas fa-times" /> Annuler
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: MEMBRES ═══ */}
      {activeTab === 'members' && (
        <div className="la__panel">
          <div className="la__pills">
            {[
              { key: 'all', label: `Tous (${members.length})` },
              { key: 'active', label: `Actifs (${members.filter(m => m.is_active && !m.is_expired).length})` },
              { key: 'expired', label: `Expirés (${members.filter(m => m.is_expired).length})` },
              { key: 'inactive', label: `Désactivés (${members.filter(m => !m.is_active).length})` },
            ].map(p => (
              <button key={p.key} className={`la__pill ${memberFilter === p.key ? 'la__pill--active' : ''}`} onClick={() => setMemberFilter(p.key)}>{p.label}</button>
            ))}
          </div>
          {fMembers.length === 0 ? (
            <p className="la__empty">Aucun membre.</p>
          ) : (
            <div className="la__members-grid">
              {fMembers.map(member => (
                <div key={member.id} className={`la__mcard ${member.is_expired ? 'la__mcard--expired' : ''} ${!member.is_active ? 'la__mcard--inactive' : ''}`}>
                  <div className="la__mcard-top">
                    <div>
                      <div className="la__mcard-name">{member.user_name || '—'}</div>
                      <div className="la__mcard-email">{member.user_email || '—'}</div>
                    </div>
                    {!member.is_active
                      ? <span className="la-badge la-badge--muted">Désactivé</span>
                      : member.is_expired
                        ? <span className="la-badge la-badge--error">Expiré</span>
                        : <span className="la-badge la-badge--success">Actif</span>}
                  </div>
                  <div className="la__mcard-infos">
                    <span><i className="fas fa-id-card" /> {member.membership_number}</span>
                    <span><i className="fas fa-tag" /> {member.membership_type_display || member.membership_type}</span>
                    <span><i className="fas fa-calendar-alt" /> {member.expires_at ? new Date(member.expires_at).toLocaleDateString('fr-FR') : '—'}</span>
                  </div>

                  {/* Edit inline */}
                  {editingMember === member.id ? (
                    <div className="la__mcard-edit">
                      <select value={editType} onChange={e => setEditType(e.target.value)} className="la__mcard-select">
                        <option value="">Type...</option>
                        <option value="STANDARD">Standard</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="STUDENT">Étudiant</option>
                      </select>
                      <input type="date" value={editExpires} onChange={e => setEditExpires(e.target.value)} className="la__mcard-date" placeholder="Expiration" />
                      <div className="la__mcard-edit-btns">
                        <button className="la-btn la-btn--sm la-btn--success" onClick={() => handleSaveMember(member)} disabled={isLoading(`save-${member.id}`)}>
                          <i className="fas fa-save" /> Sauver
                        </button>
                        <button className="la-btn la-btn--sm la-btn--ghost" onClick={() => setEditingMember(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="la__mcard-actions">
                      <button className="la-btn la-btn--sm la-btn--ghost" onClick={() => { setEditingMember(member.id); setEditType(member.membership_type); setEditExpires(member.expires_at ? member.expires_at.slice(0, 10) : ''); }}>
                        <i className="fas fa-pen" /> Modifier
                      </button>
                      <button className={`la-btn la-btn--sm ${member.is_active ? 'la-btn--danger' : 'la-btn--success'}`} disabled={isLoading(`member-${member.id}`)} onClick={() => handleToggleMember(member)}>
                        <i className={`fas fa-${member.is_active ? 'user-slash' : 'user-check'}`} /> {member.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryAdmin;
