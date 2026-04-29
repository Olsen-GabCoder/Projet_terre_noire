/**
 * SessionSection — Session list in rail + session creation modal
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmModal } from './ClubModals';
import aiService from '../../services/aiService';

export function SessionList({ sessions, isMember, isAdmin, isMod, user, slug, club, socialService, setSessions, setShowSessionCreate, onJoinSession, videoPeakRef, toast, handleApiError, t, i18n }) {
  const [showInstant, setShowInstant] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(null);
  const [expandedSummary, setExpandedSummary] = useState(null);
  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.upcomingSessions')}</div>
      {(() => { const scheduled = sessions.filter(s => s.session_type !== 'PERMANENT'); return scheduled.length > 0 ? (
        <div className="cc-sessions">
          {scheduled.slice(0, 3).map((s, i) => {
            const d = new Date(s.scheduled_at);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={s.id} className={`cc-session${s.meeting_active ? ' cc-session--live' : ''}`} style={{borderTop: i > 0 ? '1px dashed var(--fl-border-strong)' : 'none'}}>
                <div className="cc-session__date">
                  <div className={`cc-session__day ${isToday ? 'cc-session__day--active' : ''}`}>{d.getDate()}</div>
                  <div className="cc-session__month">{d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {month: 'short'})}</div>
                </div>
                <div className="cc-session__info">
                  <div className="cc-session__title-row">
                    <div className="cc-session__title">
                      {s.title}
                      {s.recurrence && s.recurrence !== 'NONE' && <span className="cc-session__rec-badge"><i className="fas fa-redo" /> {t(`pages.bookClubDetail.sessionRec${s.recurrence.charAt(0) + s.recurrence.slice(1).toLowerCase()}`, s.recurrence)}</span>}
                    </div>
                    {isAdmin && !s.meeting_active && (
                      <div className="cc-session__admin-actions">
                        {s.session_type === 'SCHEDULED' && (
                          <button className="cc-session__action-icon" title={t('pages.bookClubDetail.editSession', 'Modifier')} onClick={() => setEditSession(s)}>
                            <i className="fas fa-pen" />
                          </button>
                        )}
                        <button className="cc-session__action-icon cc-session__action-icon--danger" title={t('pages.bookClubDetail.sessionDelete', 'Supprimer')} onClick={() => setDeleteSessionId(s.id)}>
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="cc-session__time">{d.toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {hour: '2-digit', minute: '2-digit'})} · {s.is_online ? t('pages.bookClubDetail.online') : (s.location || '')}</div>
                  {isMember && (
                    <div className="cc-session__rsvp">
                      {[['GOING', 'fa-check', t('pages.bookClubDetail.rsvpGoing', 'Présent')], ['MAYBE', 'fa-question', t('pages.bookClubDetail.rsvpMaybe', 'Peut-être')], ['NOT_GOING', 'fa-times', t('pages.bookClubDetail.rsvpNotGoing', 'Absent')]].map(([st, icon, label]) => (
                        <button key={st} className={`cc-rsvp-btn${s.my_rsvp === st ? ' cc-rsvp-btn--active cc-rsvp-btn--' + st.toLowerCase() : ''}`} onClick={async () => {
                          try { const r = await socialService.rsvpSession(slug, s.id, st); setSessions(prev => prev.map(x => x.id === s.id ? r.data : x)); } catch (e) { toast.error(handleApiError(e)); }
                        }}><i className={`fas ${icon}`} /> {label}</button>
                      ))}
                    </div>
                  )}
                  {s.rsvp_counts && (s.rsvp_counts.going > 0 || s.rsvp_counts.maybe > 0) && (
                    <div className="cc-session__counts">
                      {s.rsvp_counts.going > 0 && <span className="cc-session__count cc-session__count--going"><i className="fas fa-check" /> {s.rsvp_counts.going}</span>}
                      {s.rsvp_counts.maybe > 0 && <span className="cc-session__count cc-session__count--maybe"><i className="fas fa-question" /> {s.rsvp_counts.maybe}</span>}
                    </div>
                  )}
                  {/* Video meeting controls */}
                  {s.is_online && s.meeting_active && (
                    <div className="cc-session__live-badge"><span /> {t('pages.bookClubDetail.sessionLive', 'EN DIRECT')}</div>
                  )}
                  {s.is_online && s.meeting_active && isMember && (
                    <button className="cc-session__join-btn" onClick={() => onJoinSession(s)}>
                      <i className="fas fa-video" /> {t('pages.bookClubDetail.sessionJoin', 'Rejoindre')}
                    </button>
                  )}
                  {s.is_online && !s.meeting_active && (() => {
                    const canStart = isAdmin || (
                      s.my_rsvp === 'GOING' &&
                      Math.abs(new Date(s.scheduled_at) - Date.now()) < 15 * 60 * 1000
                    );
                    return canStart ? (
                      <button className="cc-session__start-btn" onClick={async () => {
                        try { const r = await socialService.startSession(slug, s.id); setSessions(prev => prev.map(x => x.id === s.id ? r.data : x)); onJoinSession(r.data); } catch (e) { toast.error(handleApiError(e)); }
                      }}>
                        <i className="fas fa-video" /> {t('pages.bookClubDetail.sessionStart', 'Démarrer la visio')}
                      </button>
                    ) : null;
                  })()}
                  {s.is_online && s.meeting_active && isAdmin && (
                    <button className="cc-session__end-btn" onClick={async () => {
                      try {
                        const peak = videoPeakRef?.current || undefined;
                        const r = await socialService.endSession(slug, s.id, peak);
                        if (videoPeakRef) videoPeakRef.current = 0;
                        setSessions(prev => prev.map(x => x.id === s.id ? r.data : x));
                      } catch (e) { toast.error(handleApiError(e)); }
                    }}>
                      <i className="fas fa-stop-circle" /> {t('pages.bookClubDetail.sessionEndMeeting', 'Terminer la visio')}
                    </button>
                  )}
                  {/* AI Meeting Summary */}
                  {s.meeting_ended_at && !s.meeting_active && (() => {
                    const hasSummary = !!s.meeting_summary;
                    const isExpanded = expandedSummary === s.id;
                    return (
                      <div className="cc-session__summary-section">
                        {hasSummary ? (
                          <>
                            <button className="cc-session__summary-toggle" onClick={() => setExpandedSummary(isExpanded ? null : s.id)}>
                              <i className={`fas fa-${isExpanded ? 'chevron-up' : 'robot'}`} /> {isExpanded ? t('pages.bookClubDetail.hideSummary', 'Masquer le résumé') : t('pages.bookClubDetail.showSummary', 'Résumé IA')}
                            </button>
                            {isExpanded && (
                              <div className="cc-session__summary-content">
                                <p className="cc-session__summary-text">{s.meeting_summary}</p>
                                {s.summary_key_points?.length > 0 && (
                                  <div className="cc-session__summary-points">
                                    <strong>{t('pages.bookClubDetail.keyPoints', 'Points clés')} :</strong>
                                    <ul>{s.summary_key_points.map((p, idx) => <li key={idx}>{p}</li>)}</ul>
                                  </div>
                                )}
                                {s.summary_next_steps && (
                                  <div className="cc-session__summary-next">
                                    <strong>{t('pages.bookClubDetail.nextSteps', 'Prochaines étapes')} :</strong>
                                    <p>{s.summary_next_steps}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : isMember && (
                          <button
                            className="cc-session__summary-btn"
                            disabled={summaryLoading === s.id}
                            onClick={async () => {
                              setSummaryLoading(s.id);
                              try {
                                const result = await aiService.summarizeMeeting(s.id);
                                setSessions(prev => prev.map(x => x.id === s.id ? {
                                  ...x,
                                  meeting_summary: result.summary,
                                  summary_key_points: result.key_points,
                                  summary_next_steps: result.next_steps,
                                  summary_generated_at: new Date().toISOString(),
                                } : x));
                                setExpandedSummary(s.id);
                                toast.success(t('pages.bookClubDetail.summaryGenerated', 'Résumé généré !'));
                              } catch (e) {
                                const msg = e?.response?.data?.code === 'quota_exceeded'
                                  ? t('pages.bookClubDetail.quotaExceeded', 'Quota IA journalier atteint')
                                  : handleApiError(e);
                                toast.error(msg);
                              }
                              setSummaryLoading(null);
                            }}
                          >
                            {summaryLoading === s.id
                              ? <><i className="fas fa-spinner fa-spin" /> {t('pages.bookClubDetail.generatingSummary', 'Génération...')}</>
                              : <><i className="fas fa-robot" /> {t('pages.bookClubDetail.generateSummary', 'Générer le résumé IA')}</>
                            }
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cc-empty cc-empty--compact">
          <div className="cc-empty__icon"><i className="fas fa-calendar-alt" /></div>
          <p>{t('pages.bookClubDetail.sessionsEmptySub', 'Aucune séance planifiée pour le moment.')}</p>
        </div>
      ); })()}
      {isAdmin && (
        <div className="cc-session__actions">
          <button className="cc-session-create-btn cc-session-create-btn--instant" onClick={() => setShowInstant(true)}>
            <i className="fas fa-video" /> {t('pages.bookClubDetail.instantMeeting', 'Réunion maintenant')}
          </button>
          <button className="cc-session-create-btn" onClick={() => setShowSessionCreate(true)}>
            <i className="fas fa-plus" /> {t('pages.bookClubDetail.createSession')}
          </button>
        </div>
      )}
      {showInstant && <InstantMeetingModal show={showInstant} onClose={() => setShowInstant(false)} club={club} slug={slug} socialService={socialService} setSessions={setSessions} onJoinSession={onJoinSession} toast={toast} handleApiError={handleApiError} t={t} />}
      {editSession && <SessionCreateModal show={true} onClose={() => setEditSession(null)} club={club} slug={slug} socialService={socialService} setSessions={setSessions} toast={toast} handleApiError={handleApiError} t={t} editSession={editSession} />}
      <ConfirmModal
        show={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={async () => {
          try { await socialService.deleteSession(slug, deleteSessionId); setSessions(prev => prev.filter(x => x.id !== deleteSessionId)); toast.success(t('pages.bookClubDetail.sessionDeleted', 'Séance supprimée')); } catch (e) { toast.error(handleApiError(e)); }
          setDeleteSessionId(null);
        }}
        icon="fa-calendar-times"
        title={t('pages.bookClubDetail.sessionDelete', 'Supprimer la séance')}
        message={t('pages.bookClubDetail.sessionDeleteConfirm', 'Supprimer cette séance ? Cette action est irréversible.')}
        confirmLabel={t('pages.bookClubDetail.sessionDelete', 'Supprimer')}
        danger
      />
    </div>
  );
}

export function SessionCreateModal({ show, onClose, club, slug, socialService, setSessions, toast, handleApiError, t, editSession }) {
  const isEdit = !!editSession;
  const [form, setForm] = useState({
    title: '', date: '', time: '19:00',
    is_online: true, location: '', description: '', recurrence: 'NONE',
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editSession) {
      const d = new Date(editSession.scheduled_at);
      setForm({
        title: editSession.title || '',
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().slice(0, 5),
        is_online: editSession.is_online ?? true,
        location: editSession.location || '',
        description: editSession.description || '',
        recurrence: editSession.recurrence || 'NONE',
      });
    }
  }, [editSession]);

  const submit = async () => {
    if (!form.title.trim() || !form.date || !form.time) return;
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString();
    const payload = { title: form.title.trim(), description: form.description, scheduled_at, is_online: form.is_online, location: form.location, recurrence: form.recurrence };
    try {
      if (isEdit) {
        const r = await socialService.updateSession(slug, editSession.id, payload);
        setSessions(prev => prev.map(x => x.id === editSession.id ? r.data : x));
      } else {
        const r = await socialService.createClubSession(slug, payload);
        setSessions(prev => [...prev, r.data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      }
      onClose();
      setForm({ title: '', date: '', time: '19:00', is_online: true, location: '', description: '', recurrence: 'NONE' });
      toast.success(isEdit ? t('pages.bookClubDetail.sessionUpdated', 'Séance modifiée') : t('pages.bookClubDetail.sessionCreated'));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  if (!show) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-session-create" onClick={e => e.stopPropagation()}>
        <div className="cc-session-create__header">
          <button className="cc-session-create__close" onClick={onClose}><i className="fas fa-times" /></button>
          <h2>{isEdit ? t('pages.bookClubDetail.editSession', 'Modifier la séance') : t('pages.bookClubDetail.createSession')}</h2>
        </div>
        <div className="cc-session-create__body">
          {club?.current_book && (
            <div className="cc-session-create__book-badge">
              {club.current_book.cover_image && <img src={club.current_book.cover_image} alt="" />}
              <div>
                <span className="cc-session-create__book-label">{t('pages.bookClubDetail.readingInProgress')}</span>
                <strong>{club.current_book.title}</strong>
              </div>
            </div>
          )}

          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionTitleLabel', 'Titre de la séance')}</label>
          <input className="cc-session-create__input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder={t('pages.bookClubDetail.sessionTitlePlaceholder', 'Ex : Discussion chapitre 5, Analyse des personnages, Échange libre…')} />

          <div className="cc-session-create__row">
            <div className="cc-session-create__field">
              <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionDate')}</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="cc-session-create__field">
              <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionTime')}</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} />
            </div>
          </div>

          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionFormat')}</label>
          <div className="cc-session-create__format">
            <button className={`cc-session-create__fmt-btn${form.is_online ? ' cc-session-create__fmt-btn--active' : ''}`} onClick={() => setForm(f => ({...f, is_online: true, location: ''}))}>
              <i className="fas fa-video" /> {t('pages.bookClubDetail.online')}
            </button>
            <button className={`cc-session-create__fmt-btn${!form.is_online ? ' cc-session-create__fmt-btn--active' : ''}`} onClick={() => setForm(f => ({...f, is_online: false}))}>
              <i className="fas fa-map-marker-alt" /> {t('pages.bookClubDetail.sessionInPerson')}
            </button>
          </div>
          {!form.is_online && (
            <input className="cc-session-create__input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder={t('pages.bookClubDetail.sessionLocationPlaceholder')} />
          )}

          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionRecurrence', 'Récurrence')}</label>
          <div className="cc-session-create__format">
            {[['NONE', 'sessionRecNone', 'Aucune'], ['WEEKLY', 'sessionRecWeekly', 'Hebdo'], ['BIWEEKLY', 'sessionRecBiweekly', 'Bimensuel'], ['MONTHLY', 'sessionRecMonthly', 'Mensuel']].map(([val, key, fallback]) => (
              <button key={val} className={`cc-session-create__fmt-btn${form.recurrence === val ? ' cc-session-create__fmt-btn--active' : ''}`} onClick={() => setForm(f => ({...f, recurrence: val}))}>
                {t(`pages.bookClubDetail.${key}`, fallback)}
              </button>
            ))}
          </div>

          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionDescLabel')}</label>
          <textarea className="cc-session-create__textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder={t('pages.bookClubDetail.sessionDescPlaceholder')} rows={3} />
        </div>
        <div className="cc-session-create__footer">
          <button className="cc-session-create__cancel" onClick={onClose}>{t('pages.bookClubDetail.sessionCancel')}</button>
          <button className="cc-session-create__submit" disabled={!form.title.trim() || !form.date || !form.time} onClick={submit}>
            <i className={`fas fa-${isEdit ? 'save' : 'calendar-plus'}`} /> {isEdit ? t('pages.bookClubDetail.sessionSave', 'Enregistrer') : t('pages.bookClubDetail.sessionPublish')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InstantMeetingModal({ show, onClose, club, slug, socialService, setSessions, onJoinSession, toast, handleApiError, t }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [launching, setLaunching] = useState(false);

  const launch = async () => {
    setLaunching(true);
    try {
      const r = await socialService.createInstantMeeting(slug, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      setSessions(prev => [r.data, ...prev]);
      onJoinSession(r.data);
      onClose();
      setTitle(''); setDescription('');
    } catch (e) { toast.error(handleApiError(e)); }
    setLaunching(false);
  };

  if (!show) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-session-create" onClick={e => e.stopPropagation()}>
        <div className="cc-session-create__header">
          <button className="cc-session-create__close" onClick={onClose}><i className="fas fa-times" /></button>
          <h2>{t('pages.bookClubDetail.instantMeeting', 'Réunion maintenant')}</h2>
        </div>
        <div className="cc-session-create__body">
          {club?.current_book && (
            <div className="cc-session-create__book-badge">
              {club.current_book.cover_image && <img src={club.current_book.cover_image} alt="" />}
              <div>
                <span className="cc-session-create__book-label">{t('pages.bookClubDetail.readingInProgress')}</span>
                <strong>{club.current_book.title}</strong>
              </div>
            </div>
          )}
          <label className="cc-session-create__label">{t('pages.bookClubDetail.instantMeetingTitle', 'Titre (optionnel)')}</label>
          <input className="cc-session-create__input" value={title} onChange={e => setTitle(e.target.value)} placeholder={club?.current_book ? `Réunion — « ${club.current_book.title} »` : `Réunion — ${club?.name || ''}`} />
          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionDescLabel')}</label>
          <textarea className="cc-session-create__textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('pages.bookClubDetail.sessionDescPlaceholder')} rows={2} />
        </div>
        <div className="cc-session-create__footer">
          <button className="cc-session-create__cancel" onClick={onClose}>{t('pages.bookClubDetail.sessionCancel')}</button>
          <button className="cc-session-create__submit" disabled={launching} onClick={launch}>
            {launching ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-video" /> {t('pages.bookClubDetail.instantMeetingLaunch', 'Lancer')}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// SessionHistory removed — absorbed by ChronicleSection (Lot C4)

export function PermanentRoomSection({ club, slug, isMember, isAdmin, socialService, onJoinSession, sessions, setSessions, toast, handleApiError, t }) {
  const permanentSession = sessions.find(s => s.session_type === 'PERMANENT');
  const [participantCount, setParticipantCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Poll participant count every 15s for the permanent room
  useEffect(() => {
    if (!permanentSession) { setParticipantCount(0); return; }
    let active = true;
    const poll = async () => {
      try {
        const r = await socialService.getPermanentRoomParticipants(slug);
        if (active) setParticipantCount(r.data?.count || 0);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 15000);
    return () => { active = false; clearInterval(iv); };
  }, [permanentSession, slug, socialService]);

  const createRoom = async () => {
    setCreating(true);
    try {
      const r = await socialService.createPermanentRoom(slug, { title: createTitle.trim() || undefined });
      setSessions(prev => [r.data, ...prev]);
      setShowCreate(false);
      setCreateTitle('');
    } catch (e) { toast.error(handleApiError(e)); }
    setCreating(false);
  };

  const [showDeleteRoom, setShowDeleteRoom] = useState(false);
  const deleteRoom = async () => {
    try {
      await socialService.deletePermanentRoom(slug);
      setSessions(prev => prev.filter(s => s.session_type !== 'PERMANENT'));
      setShowDeleteRoom(false);
      toast.success(t('pages.bookClubDetail.permanentRoomDeleted', 'Salle supprimée'));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  // Don't render the section at all if no room exists and user can't create one
  if (!permanentSession && !isAdmin) return null;

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.permanentRoom', 'Salle du club')}</div>
      {permanentSession ? (
        <div className="cc-permanent-room">
          <div className="cc-permanent-room__header">
            <i className="fas fa-circle cc-permanent-room__icon" />
            <div className="cc-permanent-room__info">
              <strong>{permanentSession.title}</strong>
              {participantCount > 0 ? (
                <span className="cc-permanent-room__online"><span className="cc-permanent-room__dot" /> {participantCount} {t('pages.bookClubDetail.permanentRoomOnline', 'en ligne')}</span>
              ) : (
                <span className="cc-permanent-room__empty">{t('pages.bookClubDetail.permanentRoomEmpty', 'Aucun participant')}</span>
              )}
            </div>
          </div>
          {isMember && (
            <button className="cc-permanent-room__join" onClick={() => onJoinSession(permanentSession)}>
              <i className="fas fa-video" /> {t('pages.bookClubDetail.permanentRoomJoin', 'Rejoindre')}
            </button>
          )}
          {isAdmin && (
            <button className="cc-permanent-room__delete" onClick={() => setShowDeleteRoom(true)}>
              <i className="fas fa-trash-alt" /> {t('pages.bookClubDetail.permanentRoomDelete', 'Supprimer la salle')}
            </button>
          )}
          <ConfirmModal
            show={showDeleteRoom}
            onClose={() => setShowDeleteRoom(false)}
            onConfirm={deleteRoom}
            icon="fa-trash-alt"
            title={t('pages.bookClubDetail.permanentRoomDelete', 'Supprimer la salle')}
            message={t('pages.bookClubDetail.permanentRoomDeleteConfirm', 'Supprimer la salle permanente du club ? Les membres ne pourront plus y accéder.')}
            confirmLabel={t('pages.bookClubDetail.permanentRoomDelete', 'Supprimer')}
            danger
          />
        </div>
      ) : isAdmin ? (
        showCreate ? (
          <div className="cc-permanent-room__create-form">
            <input className="cc-session-create__input" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder={t('pages.bookClubDetail.permanentRoomTitlePlaceholder', 'Salle du club (optionnel)')} />
            <div className="cc-permanent-room__create-actions">
              <button className="cc-session-create__cancel" onClick={() => setShowCreate(false)}>{t('pages.bookClubDetail.sessionCancel')}</button>
              <button className="cc-session-create__submit" disabled={creating} onClick={createRoom}>
                {creating ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus" /> {t('pages.bookClubDetail.permanentRoomCreate', 'Créer')}</>}
              </button>
            </div>
          </div>
        ) : (
          <button className="cc-session-create-btn" onClick={() => setShowCreate(true)}>
            <i className="fas fa-plus" /> {t('pages.bookClubDetail.permanentRoomSetup', 'Créer la salle du club')}
          </button>
        )
      ) : null}
    </div>
  );
}
