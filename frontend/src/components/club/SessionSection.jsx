/**
 * SessionSection — Session list in rail + session creation modal
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';

export function SessionList({ sessions, isMember, isAdmin, slug, socialService, setSessions, setShowSessionCreate, toast, handleApiError, t, i18n }) {
  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.upcomingSessions')}</div>
      {sessions.length > 0 ? (
        <div className="cc-sessions">
          {sessions.slice(0, 3).map((s, i) => {
            const d = new Date(s.scheduled_at);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={s.id} className="cc-session" style={{borderTop: i > 0 ? '1px dashed var(--fl-border-strong)' : 'none'}}>
                <div className="cc-session__date">
                  <div className={`cc-session__day ${isToday ? 'cc-session__day--active' : ''}`}>{d.getDate()}</div>
                  <div className="cc-session__month">{d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {month: 'short'})}</div>
                </div>
                <div className="cc-session__info">
                  <div className="cc-session__title">
                    {s.title}
                    {s.recurrence && s.recurrence !== 'NONE' && <span className="cc-session__rec-badge"><i className="fas fa-redo" /> {t(`pages.bookClubDetail.sessionRec${s.recurrence.charAt(0) + s.recurrence.slice(1).toLowerCase()}`, s.recurrence)}</span>}
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="cc-rail__empty">{t('pages.bookClubDetail.noSessions')}</p>
      )}
      {isAdmin && <button className="cc-session-create-btn" onClick={() => setShowSessionCreate(true)}><i className="fas fa-plus" /> {t('pages.bookClubDetail.createSession')}</button>}
    </div>
  );
}

export function SessionCreateModal({ show, onClose, club, slug, socialService, setSessions, toast, handleApiError, t }) {
  const [form, setForm] = useState({type: 'debate', date: '', time: '19:00', is_online: true, location: '', description: '', recurrence: 'NONE'});

  const createSession = async () => {
    if (!form.date || !form.time) return;
    const bookTitle = club?.current_book?.title || '';
    const typeLabel = form.type === 'debate' ? t('pages.bookClubDetail.sessionTypeDebate') : t('pages.bookClubDetail.sessionTypeAnalysis');
    const title = bookTitle ? `${typeLabel} — « ${bookTitle} »` : typeLabel;
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString();
    try {
      const r = await socialService.createClubSession(slug, {title, description: form.description, scheduled_at, is_online: form.is_online, location: form.location, recurrence: form.recurrence});
      setSessions(prev => [...prev, r.data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      onClose();
      setForm({type: 'debate', date: '', time: '19:00', is_online: true, location: '', description: '', recurrence: 'NONE'});
      toast.success(t('pages.bookClubDetail.sessionCreated'));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  if (!show) return null;

  return createPortal(
    <div className="cc-confirm-overlay" onClick={onClose}>
      <div className="cc-session-create" onClick={e => e.stopPropagation()}>
        <div className="cc-session-create__header">
          <button className="cc-session-create__close" onClick={onClose}><i className="fas fa-times" /></button>
          <h2>{t('pages.bookClubDetail.createSession')}</h2>
        </div>
        <div className="cc-session-create__body">
          {club?.current_book ? (
            <div className="cc-session-create__book-badge">
              {club.current_book.cover_image && <img src={club.current_book.cover_image} alt="" />}
              <div>
                <span className="cc-session-create__book-label">{t('pages.bookClubDetail.readingInProgress')}</span>
                <strong>{club.current_book.title}</strong>
              </div>
            </div>
          ) : (
            <div className="cc-session-create__no-book"><i className="fas fa-info-circle" /> {t('pages.bookClubDetail.sessionNoBook')}</div>
          )}

          <label className="cc-session-create__label">{t('pages.bookClubDetail.sessionTypeLabel')}</label>
          <div className="cc-session-create__types">
            <button className={`cc-session-create__type${form.type === 'debate' ? ' cc-session-create__type--active' : ''}`} onClick={() => setForm(f => ({...f, type: 'debate'}))}>
              <i className="fas fa-comments" /> {t('pages.bookClubDetail.sessionTypeDebate')}
              <span>{t('pages.bookClubDetail.sessionDebateDesc')}</span>
            </button>
            <button className={`cc-session-create__type${form.type === 'analysis' ? ' cc-session-create__type--active' : ''}`} onClick={() => setForm(f => ({...f, type: 'analysis'}))}>
              <i className="fas fa-microscope" /> {t('pages.bookClubDetail.sessionTypeAnalysis')}
              <span>{t('pages.bookClubDetail.sessionAnalysisDesc')}</span>
            </button>
          </div>

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
          <button className="cc-session-create__submit" disabled={!form.date || !form.time} onClick={createSession}>
            <i className="fas fa-calendar-plus" /> {t('pages.bookClubDetail.sessionPublish')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
