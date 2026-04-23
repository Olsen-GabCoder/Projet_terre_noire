/**
 * ClubRail — Right sidebar with club info, progress, sessions, moderation
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SessionList } from './SessionSection';
import CheckpointSection from './CheckpointSection';
import { ini, CAT_KEYS, fmtDur } from './clubUtils';

export default function ClubRail({
  club, setClub, members, user, isMember, isAdmin, isMod, isFull,
  myProgress, setMyProgress, saveProgress,
  sessions, setSessions,
  activePoll, setActivePoll, myVote, setMyVote,
  votePollOption, closePollAction, openPollCreate,
  railOpen, setRailOpen,
  sidebarTab, setSidebarTab, editForm, setEditForm, saving, saveEdit,
  slug, socialService, toast, handleApiError,
  join, leave, deleteClub, showDeleteConfirm, setShowDeleteConfirm,
  shareClub, openQr,
  inviteUrl,
  reports, loadReports, handleReportAction,
  setShowSessionCreate,
  bookSearch, setBookSearch, bookResults, changeBook,
  approveMember, rejectMember,
  t, i18n,
}) {
  const [media, setMedia] = useState(null);

  const loadMedia = async () => { if (media) return; try { const r = await socialService.getClubMedia(slug); setMedia(Array.isArray(r.data) ? r.data : r.data.results || []); } catch { setMedia([]); } };

  const cats = Array.isArray(club.category) ? club.category : [];
  const topReader = members.reduce((top, m) => (!top || m.reading_progress > top.reading_progress) ? m : top, null);
  const moderator = members.find(m => m.role === 'MODERATOR') || members.find(m => m.role === 'ADMIN') || members.find(m => m.user?.id === club.creator?.id);

  return (
    <aside className={`cc-rail ${railOpen ? 'cc-rail--open' : ''}`}>
      <button className="cc-rail__close" onClick={() => setRailOpen(false)} aria-label="Fermer"><i className="fas fa-times" /></button>

      {/* Club profile */}
      <div className="cc-rail__profile">
        <div className="cc-rail__avatar">
          {club.cover_image ? <img src={club.cover_image} alt="" /> : <i className="fas fa-users" />}
        </div>
        <h2 className="cc-rail__club-name">{club.name}</h2>
        <div className="cc-rail__badges">
          <span className={`cc-rail__vis ${club.is_public ? '' : 'cc-rail__vis--priv'}`}><i className={`fas ${club.is_public ? 'fa-globe' : 'fa-lock'}`} /> {club.is_public ? 'Public' : 'Privé'}</span>
          <span className={isFull ? 'cc-rail__members--full' : ''}><i className="fas fa-users" /> {members.length}{club.max_members ? `/${club.max_members}` : ''}{isFull && ` · ${t('pages.bookClubDetail.clubFull', 'Complet')}`}</span>
        </div>
      </div>

      {/* Collective progress */}
      {club.current_book && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.collectiveProgress')}</div>
          <div className="cc-rail__big-num">{club.average_progress || 0}<span className="cc-rail__unit">%</span></div>
          <div className="cc-rail__sub">{t('pages.bookClubDetail.average')} {members.length} {t('pages.bookClubDetail.members')}</div>
          <div className="cc-progress__bar"><div className="cc-progress__fill" style={{width: `${club.average_progress || 0}%`}} /></div>

          {/* Reading goal */}
          {club.reading_goal_pages && (
            <div className="cc-reading-goal">
              <div className="cc-reading-goal__label">
                <i className="fas fa-bullseye" /> {t('pages.bookClubDetail.goalLabel', 'Objectif')}
              </div>
              <div className="cc-reading-goal__value">
                {club.reading_goal_pages} {t('pages.bookClubDetail.goalPagesPerWeek', 'pages / semaine')}
              </div>
              {club.reading_goal_deadline && (() => {
                const deadline = new Date(club.reading_goal_deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return (
                  <div className={`cc-reading-goal__deadline${daysLeft <= 3 ? ' cc-reading-goal__deadline--urgent' : ''}`}>
                    {daysLeft > 0
                      ? <><i className="fas fa-clock" /> {t('pages.bookClubDetail.goalDaysLeft', '{{count}} jour(s) restant(s)', {count: daysLeft})}</>
                      : <><i className="fas fa-flag-checkered" /> {t('pages.bookClubDetail.goalExpired', 'Objectif terminé')}</>
                    }
                  </div>
                );
              })()}
            </div>
          )}

          <div className="cc-rail__stats">
            {topReader && <div className="cc-rail__stat"><span>{t('pages.bookClubDetail.mostAdvanced')} — {topReader.user?.full_name || topReader.user?.username}</span><span>{topReader.reading_progress || 0}%</span></div>}
            {isMember && <div className="cc-rail__stat"><span>{t('pages.bookClubDetail.you')} ({user?.full_name || user?.username})</span><span style={{color: 'var(--fl-ink)'}}>{myProgress}%</span></div>}
          </div>
          {isMember && (
            <div className="cc-my-progress">
              <input type="range" min="0" max="100" step="5" value={myProgress}
                onChange={e => setMyProgress(+e.target.value)}
                onMouseUp={e => saveProgress(+e.target.value)}
                onTouchEnd={e => saveProgress(+e.target.value)}
                className="cc-my-progress__slider"
              />
            </div>
          )}

          {/* Admin: set reading goal */}
          {isAdmin && <ReadingGoalForm club={club} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} setClub={setClub} t={t} />}
        </div>
      )}

      {/* Checkpoints */}
      <CheckpointSection
        slug={slug} club={club} isAdmin={isAdmin}
        socialService={socialService} toast={toast} handleApiError={handleApiError} t={t}
      />

      {/* Sessions */}
      <SessionList
        sessions={sessions} isMember={isMember} isAdmin={isAdmin}
        slug={slug} socialService={socialService} setSessions={setSessions}
        setShowSessionCreate={setShowSessionCreate}
        toast={toast} handleApiError={handleApiError} t={t} i18n={i18n}
      />

      {/* Moderator */}
      {moderator && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.moderation')}</div>
          <div className="cc-moderator">
            <div className="cc-moderator__av">
              {moderator.user?.profile_image ? <img src={moderator.user.profile_image} alt="" /> : <span>{ini(moderator.user?.full_name || moderator.user?.username)}</span>}
            </div>
            <div>
              <div className="cc-moderator__name">{moderator.user?.full_name || moderator.user?.username}</div>
              <div className="cc-moderator__role">{moderator.role === 'ADMIN' ? t('pages.bookClubDetail.admin').toUpperCase() : t('pages.bookClubDetail.moderator').toUpperCase()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top members */}
      {members.length > 0 && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.topMembers', 'Top lecteurs')}</div>
          <div className="cc-top-members">
            {[...members].filter(m => m.membership_status !== 'PENDING').sort((a, b) => (b.reading_progress || 0) - (a.reading_progress || 0)).slice(0, 5).map(m => (
              <div key={m.id} className="cc-top-member">
                <div className="cc-top-member__av">{m.user?.profile_image ? <img src={m.user.profile_image} alt="" /> : <span>{ini(m.user?.full_name || m.user?.username)}</span>}</div>
                <div className="cc-top-member__info">
                  <div className="cc-top-member__name">{m.user?.full_name || m.user?.username}</div>
                  {club.current_book && <div className="cc-top-member__bar"><div className="cc-top-member__fill" style={{width: `${m.reading_progress || 0}%`}} /></div>}
                </div>
                <div className="cc-top-member__pct">{m.reading_progress || 0}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current book + change */}
      <div className="cc-rail__section">
        <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.readingInProgress')}</div>
        {club.current_book ? (
          <Link to={`/books/${club.current_book.id}`} className="cc-book-link">
            {club.current_book.cover_image && <img src={club.current_book.cover_image} alt="" />}
            <div><strong>{club.current_book.title}</strong>{club.current_book.author?.full_name && <span>{club.current_book.author.full_name}</span>}</div>
          </Link>
        ) : <p className="cc-rail__empty">Aucun livre sélectionné</p>}
        {isAdmin && <div className="cc-book-change">
          <div className="cc-book-search">
            <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Changer le livre..." />
            {bookResults.length > 0 && <div className="cc-book-results">{bookResults.map(b => (
              <button key={b.id} onClick={() => changeBook(b.id)}>
                {b.cover_image && <img src={b.cover_image} alt="" />}
                <div><strong>{b.title}</strong><span>{b.author?.full_name || ''}</span></div>
              </button>
            ))}</div>}
          </div>
        </div>}
      </div>

      {/* Description */}
      {club.description && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— Description</div>
          <p className="cc-rail__desc">{club.description}</p>
        </div>
      )}

      {cats.length > 0 && (
        <div className="cc-rail__section">
          <div className="cc-tags">{cats.map((c, i) => <span key={i} className="cc-tag cc-tag--pri">{CAT_KEYS[c] ? t(CAT_KEYS[c]) : c}</span>)}</div>
        </div>
      )}

      {club.rules && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— Règles</div>
          <div className="cc-rules">{club.rules}</div>
        </div>
      )}

      {/* Poll in rail */}
      {isMember && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— Sondage</div>
          {activePoll ? (() => {
            const totalVotes = activePoll.options?.reduce((s, o) => s + o.votes_count, 0) || 0;
            const isClosed = activePoll.status === 'CLOSED';
            return (
              <div className="cc-poll-rail">
                <div className="cc-poll-rail__title">{activePoll.title}</div>
                <div className="cc-poll-rail__meta">{t('pages.bookClubDetail.pollTotalVotes', {count: totalVotes})} · {t('pages.bookClubDetail.pollAnonymous')}</div>
                <div className="cc-poll-rail__options">
                  {activePoll.options?.map(opt => {
                    const pct = totalVotes > 0 ? Math.round(opt.votes_count / totalVotes * 100) : 0;
                    const isLeader = opt.votes_count === Math.max(...activePoll.options.map(o => o.votes_count)) && opt.votes_count > 0;
                    return (
                      <div key={opt.id} className={`cc-poll-rail__opt${isLeader ? ' cc-poll-rail__opt--leader' : ''}`}>
                        <div className="cc-poll-rail__opt-head">
                          {isLeader ? <i className="fas fa-check-circle" /> : <i className="far fa-circle" />}
                          <span className="cc-poll-rail__opt-title">{opt.text_label || opt.book?.title}</span>
                          <span className="cc-poll-rail__opt-votes">{opt.votes_count} · {pct}%</span>
                        </div>
                        <div className="cc-poll-rail__bar-wrap"><div className="cc-poll-rail__bar" style={{width: `${pct}%`}} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="cc-poll-rail__footer">
                  {isAdmin && <button className="cc-poll-rail__link" disabled>{t('pages.bookClubDetail.pollSeeVoters')}</button>}
                  {!isClosed && isAdmin && <button className="cc-btn cc-btn--poll-close" onClick={closePollAction}><i className="fas fa-check" /> {t('pages.bookClubDetail.closePoll')}</button>}
                </div>
              </div>
            );
          })() : (
            isAdmin ? <button className="cc-btn cc-btn--join" onClick={openPollCreate} style={{width: '100%'}}><i className="fas fa-poll" /> {t('pages.bookClubDetail.createPollTitle')}</button>
            : <p className="cc-rail__empty">{t('pages.bookClubDetail.pollNoOptions')}</p>
          )}
        </div>
      )}

      {/* Pending members (admin) */}
      {isAdmin && (() => {
        const pending = members.filter(m => m.membership_status === 'PENDING');
        return pending.length > 0 ? (
          <div className="cc-rail__section">
            <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.pendingMembers', 'Demandes en attente')} ({pending.length})</div>
            <div className="cc-pending">
              {pending.map(m => (
                <div key={m.id} className="cc-pending__item">
                  <div className="cc-pending__av">{m.user?.profile_image ? <img src={m.user.profile_image} alt="" /> : <span>{ini(m.user?.full_name || m.user?.username)}</span>}</div>
                  <div className="cc-pending__info">
                    <strong>{m.user?.full_name || m.user?.username}</strong>
                  </div>
                  <div className="cc-pending__actions">
                    <button className="cc-btn cc-btn--join" onClick={() => approveMember(m.id, m.user?.full_name || m.user?.username)}><i className="fas fa-check" /></button>
                    <button className="cc-btn cc-btn--danger" onClick={() => rejectMember(m.id, m.user?.full_name || m.user?.username)}><i className="fas fa-times" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Reports (admin/mod) */}
      {isMod && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.reportsTitle', 'Signalements')}</div>
          <button className="cc-btn cc-btn--outline" onClick={loadReports} style={{width: '100%', marginBottom: 8}}>
            <i className="fas fa-flag" /> {reports.length > 0 ? `${reports.length} en attente` : 'Charger'}
          </button>
          {reports.length > 0 && (
            <div className="cc-reports">
              {reports.map(rep => (
                <div key={rep.id} className="cc-report-card">
                  <div className="cc-report-card__header">
                    <span className="cc-report-card__reason">{rep.reason}</span>
                    <span className="cc-report-card__date">{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="cc-report-card__msg">
                    <strong>{rep.message_preview?.author?.full_name || 'Membre'}</strong>: {rep.message_preview?.content?.slice(0, 60) || '...'}
                  </div>
                  <div className="cc-report-card__by">Signalé par {rep.reporter?.full_name || rep.reporter?.username}</div>
                  {rep.details && <div className="cc-report-card__details">{rep.details}</div>}
                  <div className="cc-report-card__actions">
                    <button className="cc-btn cc-btn--join" onClick={() => handleReportAction(rep.id, 'REVIEWED')}><i className="fas fa-check" /> Traiter</button>
                    <button className="cc-btn cc-btn--leave" onClick={() => handleReportAction(rep.id, 'DISMISSED')}><i className="fas fa-times" /> Rejeter</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation log */}
      {isMod && (
        <ModerationLogSection slug={slug} socialService={socialService} t={t} />
      )}

      {/* Shared media */}
      <div className="cc-rail__section">
        <div className="cc-rail__eyebrow">— Médias</div>
        <button className="cc-btn cc-btn--outline" onClick={loadMedia} style={{width: '100%', marginBottom: 8}}>
          <i className="fas fa-photo-video" /> {media ? `${media.length} médias` : 'Charger'}
        </button>
        {media && media.length > 0 && (
          <div className="cc-media-grid">
            {media.slice(0, 6).map(m => (
              <a key={m.id} href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`cc-media-item cc-media-item--${m.message_type.toLowerCase()}`}>
                {m.message_type === 'IMAGE' ? <img src={m.attachment_url} alt="" /> :
                 m.message_type === 'VOICE' ? <><i className="fas fa-microphone" /><span>{fmtDur(m.voice_duration || 0)}</span></> :
                 <><i className="fas fa-file-alt" /><span>{m.attachment_name || 'Fichier'}</span></>}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Edit form (admin) */}
      {sidebarTab === 'edit' && editForm && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— Modifier le club</div>
          <div className="cc-edit-form">
            <label>Nom</label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            <label>Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} />
            <label>Règles</label><textarea value={editForm.rules} onChange={e => setEditForm({...editForm, rules: e.target.value})} rows={2} />
            <div className="cc-edit-actions">
              <button className="cc-btn cc-btn--join" onClick={saveEdit} disabled={saving}>{saving ? 'Enregistrer' : 'Enregistrer'}</button>
              <button className="cc-btn cc-btn--leave" onClick={() => setSidebarTab('info')}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation (admin) */}
      {isAdmin && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.invite', 'Invitation')}</div>
          <div className="cc-rail__invite-actions">
            <button className="cc-btn cc-btn--outline" onClick={shareClub}><i className="fas fa-share-alt" /> {t('pages.bookClubDetail.shareLink', 'Partager le lien')}</button>
            <button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode" /> {t('pages.bookClubDetail.qrTitle', 'QR Code')}</button>
          </div>
        </div>
      )}

      <div className="cc-rail__footer">
        {user && !isMember && (isFull
          ? <button className="cc-btn cc-btn--join cc-btn--disabled" disabled><i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
          : <button className="cc-btn cc-btn--join" onClick={join}><i className="fas fa-sign-in-alt" /> {t('pages.bookClubDetail.joinClub')}</button>
        )}
        {user && isMember && club.creator?.id !== user.id && <button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt" /> Quitter</button>}
        {isAdmin && <button className="cc-btn cc-btn--danger" onClick={() => setShowDeleteConfirm(true)}><i className="fas fa-trash" /> Supprimer</button>}
        <Link to="/clubs" className="cc-rail__back"><i className="fas fa-arrow-left" /> Tous les clubs</Link>
      </div>
    </aside>
  );
}

function ReadingGoalForm({ club, slug, socialService, toast, handleApiError, setClub, t }) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState(club.reading_goal_pages || '');
  const [deadline, setDeadline] = useState(club.reading_goal_deadline || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await socialService.updateClub(slug, {
        reading_goal_pages: pages ? parseInt(pages, 10) : null,
        reading_goal_deadline: deadline || null,
      });
      const r = await socialService.getClub(slug);
      setClub(r.data);
      setOpen(false);
      toast.success(t('pages.bookClubDetail.goalSaved', 'Objectif mis à jour'));
    } catch (e) { toast.error(handleApiError(e)); }
    setSaving(false);
  };

  const clear = async () => {
    setSaving(true);
    try {
      await socialService.updateClub(slug, { reading_goal_pages: null, reading_goal_deadline: null });
      const r = await socialService.getClub(slug);
      setClub(r.data);
      setPages(''); setDeadline(''); setOpen(false);
      toast.success(t('pages.bookClubDetail.goalCleared', 'Objectif retiré'));
    } catch (e) { toast.error(handleApiError(e)); }
    setSaving(false);
  };

  if (!open) {
    return (
      <button className="cc-reading-goal__edit-btn" onClick={() => setOpen(true)}>
        <i className="fas fa-bullseye" /> {club.reading_goal_pages ? t('pages.bookClubDetail.goalEdit', 'Modifier l\'objectif') : t('pages.bookClubDetail.goalSet', 'Définir un objectif')}
      </button>
    );
  }

  return (
    <div className="cc-reading-goal__form">
      <label className="cc-reading-goal__form-label">{t('pages.bookClubDetail.goalPagesLabel', 'Pages / semaine')}</label>
      <input type="number" min="1" max="9999" value={pages} onChange={e => setPages(e.target.value)} placeholder="50" className="cc-reading-goal__form-input" />
      <label className="cc-reading-goal__form-label">{t('pages.bookClubDetail.goalDeadlineLabel', 'Date limite')}</label>
      <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} className="cc-reading-goal__form-input" />
      <div className="cc-reading-goal__form-actions">
        <button className="cc-btn cc-btn--join" onClick={save} disabled={saving}>{saving ? '...' : t('pages.bookClubDetail.goalSaveBtn', 'Enregistrer')}</button>
        {club.reading_goal_pages && <button className="cc-btn cc-btn--leave" onClick={clear} disabled={saving}>{t('pages.bookClubDetail.goalClearBtn', 'Retirer')}</button>}
        <button className="cc-btn cc-btn--outline" onClick={() => setOpen(false)}>{t('common.cancel', 'Annuler')}</button>
      </div>
    </div>
  );
}

const ACTION_ICONS = {
  KICK: 'fa-user-slash', BAN: 'fa-ban', ROLE_CHANGE: 'fa-shield-alt',
  MSG_DELETE: 'fa-trash', MSG_PIN: 'fa-thumbtack', MSG_UNPIN: 'fa-thumbtack',
  MEMBER_APPROVE: 'fa-check', MEMBER_REJECT: 'fa-times', REPORT_REVIEW: 'fa-flag',
};

function ModerationLogSection({ slug, socialService, t }) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (logs) return;
    setLoading(true);
    try {
      const r = await socialService.getModerationLog(slug);
      setLogs(Array.isArray(r.data) ? r.data : []);
    } catch { setLogs([]); }
    setLoading(false);
  };

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.modLogTitle', 'Journal de modération')}</div>
      <button className="cc-btn cc-btn--outline" onClick={load} style={{width: '100%', marginBottom: 8}} disabled={loading}>
        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-history'}`} /> {logs ? `${logs.length} entrée(s)` : t('pages.bookClubDetail.modLogLoad', 'Charger')}
      </button>
      {logs && logs.length > 0 && (
        <div className="cc-mod-log">
          {logs.map(log => (
            <div key={log.id} className="cc-mod-log__entry">
              <i className={`fas ${ACTION_ICONS[log.action] || 'fa-circle'} cc-mod-log__icon`} />
              <div className="cc-mod-log__content">
                <div className="cc-mod-log__action">
                  <strong>{log.actor?.full_name || log.actor?.username || '—'}</strong>
                  {' '}{log.action_display}
                  {log.target_user && <> — {log.target_user.full_name || log.target_user.username}</>}
                </div>
                {log.details && <div className="cc-mod-log__details">{log.details}</div>}
                <div className="cc-mod-log__date">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {logs && logs.length === 0 && <p className="cc-rail__empty">{t('pages.bookClubDetail.modLogEmpty', 'Aucune action enregistrée')}</p>}
    </div>
  );
}
