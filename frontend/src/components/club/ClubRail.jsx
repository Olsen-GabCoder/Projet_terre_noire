/**
 * ClubRail — Right sidebar with club info, progress, sessions, moderation
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SessionList, PermanentRoomSection } from './SessionSection';
import CheckpointSection from './CheckpointSection';
import WishlistSection from './WishlistSection';
import { ConfirmModal } from './ClubModals';
import { ini, CAT_KEYS, fmtDur } from './clubUtils';
import aiService from '../../services/aiService';

function MediaGallery({ slug, socialService, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState('ALL');
  const [viewIdx, setViewIdx] = useState(null); // index in modalFiltered for single-item view

  useEffect(() => {
    (async () => {
      try {
        const r = await socialService.getClubMedia(slug);
        setItems(Array.isArray(r.data) ? r.data : r.data.results || []);
      } catch {}
      setLoading(false);
    })();
  }, [slug]);

  // Keyboard navigation in viewer — must be unconditional (Rules of Hooks)
  useEffect(() => {
    if (viewIdx === null) return;
    const len = items.length;
    const filteredLen = modalFilter === 'ALL' ? len : items.filter(m => m.message_type === modalFilter).length;
    if (filteredLen === 0) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') setViewIdx(prev => (prev - 1 + filteredLen) % filteredLen);
      else if (e.key === 'ArrowRight') setViewIdx(prev => (prev + 1) % filteredLen);
      else if (e.key === 'Escape') setViewIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewIdx, items, modalFilter]);

  if (loading || items.length === 0) return null;

  const preview = items.slice(0, 6);
  const counts = {
    ALL: items.length,
    IMAGE: items.filter(m => m.message_type === 'IMAGE').length,
    VOICE: items.filter(m => m.message_type === 'VOICE').length,
    FILE: items.filter(m => m.message_type === 'FILE').length,
  };
  const modalFiltered = modalFilter === 'ALL' ? items : items.filter(m => m.message_type === modalFilter);
  const viewItem = viewIdx !== null ? modalFiltered[viewIdx] : null;

  const openItem = (idx) => setViewIdx(idx);
  const closeItem = () => setViewIdx(null);
  const prevItem = () => setViewIdx(prev => (prev - 1 + modalFiltered.length) % modalFiltered.length);
  const nextItem = () => setViewIdx(prev => (prev + 1) % modalFiltered.length);

  const renderThumb = (m) => {
    if (m.message_type === 'IMAGE') return <img src={m.attachment_url} alt="" loading="lazy" />;
    if (m.message_type === 'VOICE') return <><i className="fas fa-microphone" /><span>{fmtDur(m.voice_duration || 0)}</span></>;
    return <><i className="fas fa-file-alt" /><span>{m.attachment_name || 'Fichier'}</span></>;
  };

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.mediaTitle', 'Médias')} <span className="cc-media__count">{items.length}</span></div>

      {/* Rail preview — max 6 items */}
      <div className="cc-media-grid">
        {preview.map((m, idx) => (
          <div
            key={m.id}
            className={`cc-media-item cc-media-item--${m.message_type.toLowerCase()}`}
            onClick={() => { setModalOpen(true); setModalFilter('ALL'); openItem(items.indexOf(m)); }}
            role="button" tabIndex={0}
          >
            {renderThumb(m)}
            <div className="cc-media-item__overlay">
              <span className="cc-media-item__author">{m.author?.full_name || m.author?.username || ''}</span>
            </div>
          </div>
        ))}
      </div>

      {items.length > 6 && (
        <button className="cc-media__more" onClick={() => { setModalOpen(true); setModalFilter('ALL'); setViewIdx(null); }}>
          {t('pages.bookClubDetail.mediaShowAll', 'Voir tout')} ({items.length})
        </button>
      )}

      {/* ── Full-screen media modal (portal) ── */}
      {modalOpen && createPortal(
        <div className="cc-media-modal">
          <div className="cc-media-modal__header">
            <h2>{t('pages.bookClubDetail.mediaTitle', 'Médias')}</h2>
            <div className="cc-media__filters">
              {[['ALL', 'fa-th', t('pages.bookClubDetail.mediaAll', 'Tout')],
                ['IMAGE', 'fa-image', t('pages.bookClubDetail.mediaImages', 'Photos')],
                ['VOICE', 'fa-microphone', t('pages.bookClubDetail.mediaVoice', 'Voix')],
                ['FILE', 'fa-file-alt', t('pages.bookClubDetail.mediaFiles', 'Fichiers')]
              ].map(([key, icon, label]) => counts[key] > 0 && (
                <button
                  key={key}
                  className={`cc-media__filter${modalFilter === key ? ' cc-media__filter--active' : ''}`}
                  onClick={() => { setModalFilter(key); setViewIdx(null); }}
                >
                  <i className={`fas ${icon}`} /> {label} <span>{counts[key]}</span>
                </button>
              ))}
            </div>
            <button className="cc-media-modal__close" onClick={() => { setModalOpen(false); setViewIdx(null); }}>
              <i className="fas fa-times" />
            </button>
          </div>

          {viewIdx === null ? (
            /* Grid view */
            <div className="cc-media-modal__grid">
              {modalFiltered.map((m, idx) => (
                <div
                  key={m.id}
                  className={`cc-media-item cc-media-item--${m.message_type.toLowerCase()}`}
                  onClick={() => openItem(idx)}
                  role="button" tabIndex={0}
                >
                  {renderThumb(m)}
                  <div className="cc-media-item__overlay">
                    <span className="cc-media-item__author">{m.author?.full_name || m.author?.username || ''}</span>
                  </div>
                </div>
              ))}
              {modalFiltered.length === 0 && (
                <div className="cc-media-modal__empty">
                  <i className="fas fa-folder-open" />
                  <p>{t('pages.bookClubDetail.mediaEmpty', 'Aucun média dans cette catégorie.')}</p>
                </div>
              )}
            </div>
          ) : viewItem && (
            /* Single item viewer */
            <div className="cc-media-viewer">
              {modalFiltered.length > 1 && (
                <>
                  <button className="cc-lightbox__nav cc-lightbox__nav--prev" onClick={prevItem}><i className="fas fa-chevron-left" /></button>
                  <button className="cc-lightbox__nav cc-lightbox__nav--next" onClick={nextItem}><i className="fas fa-chevron-right" /></button>
                </>
              )}

              <div className="cc-media-viewer__content">
                {viewItem.message_type === 'IMAGE' && (
                  <img src={viewItem.attachment_url} alt="" className="cc-media-viewer__img" />
                )}
                {viewItem.message_type === 'VOICE' && (
                  <div className="cc-media-viewer__audio">
                    <i className="fas fa-microphone" />
                    <audio src={viewItem.attachment_url} controls autoPlay />
                    <span>{fmtDur(viewItem.voice_duration || 0)}</span>
                  </div>
                )}
                {viewItem.message_type === 'FILE' && (
                  <div className="cc-media-viewer__file">
                    <i className="fas fa-file-alt" />
                    <span>{viewItem.attachment_name || 'Fichier'}</span>
                    <a href={viewItem.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-btn cc-btn--join">
                      <i className="fas fa-download" /> {t('pages.bookClubDetail.mediaDownload', 'Télécharger')}
                    </a>
                  </div>
                )}
              </div>

              <div className="cc-media-viewer__meta">
                <span>{viewItem.author?.full_name || viewItem.author?.username || ''}</span>
                {viewItem.created_at && <span> · {new Date(viewItem.created_at).toLocaleDateString()}</span>}
                <span className="cc-media-viewer__counter">{viewIdx + 1} / {modalFiltered.length}</span>
              </div>
              <button className="cc-media-viewer__back" onClick={closeItem}>
                <i className="fas fa-th" /> {t('pages.bookClubDetail.mediaBackToGrid', 'Grille')}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── AI Club Section — résumé + questions ── */
function AiClubSection({ club, slug, t, toast }) {
  const [aiLoading, setAiLoading] = useState(null); // 'summary' | 'questions'
  const [aiSummary, setAiSummary] = useState(null);
  const [aiQuestions, setAiQuestions] = useState(null);

  const handleSummarize = async () => {
    setAiLoading('summary');
    try {
      const { summary } = await aiService.summarizeDiscussion(club.id);
      setAiSummary(summary);
    } catch {
      toast.error('Impossible de résumer la discussion');
    } finally {
      setAiLoading(null);
    }
  };

  const handleQuestions = async () => {
    if (!club.current_book) {
      toast.error('Aucun livre en cours pour générer des questions');
      return;
    }
    setAiLoading('questions');
    try {
      const data = await aiService.discussionQuestions(club.current_book.id);
      setAiQuestions(data.questions || []);
    } catch {
      toast.error('Impossible de générer les questions');
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— <i className="fas fa-wand-magic-sparkles" style={{fontSize: 10, marginRight: 4}} /> {t('pages.bookClubDetail.aiAssistant', 'Assistant IA')}</div>
      <div className="cc-ai-btns">
        <button className="cc-btn cc-btn--ai" onClick={handleSummarize} disabled={!!aiLoading}>
          {aiLoading === 'summary' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-file-lines" />}
          <span>{t('pages.bookClubDetail.aiSummarize', 'Résumer la discussion')}</span>
        </button>
        <button className="cc-btn cc-btn--ai" onClick={handleQuestions} disabled={!!aiLoading}>
          {aiLoading === 'questions' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-comments" />}
          <span>{t('pages.bookClubDetail.aiQuestions', 'Questions de discussion')}</span>
        </button>
      </div>

      {aiSummary && (
        <div className="cc-ai-result">
          <div className="cc-ai-result__head">
            <i className="fas fa-file-lines" /> Résumé
            <button className="cc-ai-result__close" onClick={() => setAiSummary(null)}><i className="fas fa-times" /></button>
          </div>
          <p className="cc-ai-result__text">{aiSummary}</p>
        </div>
      )}

      {aiQuestions && aiQuestions.length > 0 && (
        <div className="cc-ai-result">
          <div className="cc-ai-result__head">
            <i className="fas fa-comments" /> Questions
            <button className="cc-ai-result__close" onClick={() => setAiQuestions(null)}><i className="fas fa-times" /></button>
          </div>
          <ol className="cc-ai-result__list">
            {aiQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function ClubRail({
  club, setClub, members, user, isMember, isAdmin, isMod, isFull,
  myProgress, setMyProgress, saveProgress,
  sessions, setSessions,
  activePoll, setActivePoll, myVotes, setMyVotes,
  votePollOption, closePollAction, openPollCreate,
  railOpen, setRailOpen,
  sidebarTab, setSidebarTab, editForm, setEditForm, saving, saveEdit,
  slug, socialService, toast, handleApiError,
  join, leave, deleteClub, showDeleteConfirm, setShowDeleteConfirm,
  shareClub, shareWhatsApp, openQr,
  inviteUrl,
  reports, loadReports, handleReportAction,
  setShowSessionCreate, onJoinSession, videoPeakRef,
  bookSearch, setBookSearch, bookResults, changeBook,
  approveMember, rejectMember,
  t, i18n,
}) {
  const [stats, setStats] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    socialService.getClubStats(slug).then(r => setStats(r.data)).catch(() => {});
  }, [slug]);

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

      {/* Club stats */}
      {stats && (
        <div className="cc-rail__section">
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.statsTitle', 'Statistiques')}</div>
          <div className="cc-stats">
            <div className="cc-stats__item">
              <div className="cc-stats__value">{stats.books_read}</div>
              <div className="cc-stats__label">{t('pages.bookClubDetail.statsBooksRead', 'Livres lus')}</div>
            </div>
            <div className="cc-stats__item">
              <div className="cc-stats__value">{stats.active_members}<span className="cc-stats__unit">/{stats.total_members}</span></div>
              <div className="cc-stats__label">{t('pages.bookClubDetail.statsActiveMembers', 'Actifs (30j)')}</div>
            </div>
            <div className="cc-stats__item">
              <div className="cc-stats__value">{stats.participation_rate}<span className="cc-stats__unit">%</span></div>
              <div className="cc-stats__label">{t('pages.bookClubDetail.statsParticipation', 'Participation')}</div>
            </div>
            <div className="cc-stats__item">
              <div className="cc-stats__value">{stats.total_messages}</div>
              <div className="cc-stats__label">{t('pages.bookClubDetail.statsMessages', 'Messages')}</div>
            </div>
          </div>

          {/* Activity chart — messages per day (7 days) */}
          {stats.activity_days && stats.activity_days.some(d => d.count > 0) && (() => {
            const max = Math.max(...stats.activity_days.map(d => d.count), 1);
            return (
              <div className="cc-stats__chart">
                <div className="cc-stats__chart-label">{t('pages.bookClubDetail.statsActivity', 'Activité (7j)')}</div>
                <div className="cc-stats__bars">
                  {stats.activity_days.map((d, i) => (
                    <div key={i} className="cc-stats__bar-col">
                      <div className="cc-stats__bar-wrap">
                        <div
                          className="cc-stats__bar"
                          style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0)}%` }}
                          title={`${d.count} msg`}
                        />
                      </div>
                      <span className="cc-stats__bar-day">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Reading progress distribution */}
          {stats.progress_distribution && stats.total_members > 0 && (() => {
            const dist = stats.progress_distribution;
            const max = Math.max(...dist, 1);
            const labels = ['0%', '1-25', '26-50', '51-75', '76-100'];
            return (
              <div className="cc-stats__chart">
                <div className="cc-stats__chart-label">{t('pages.bookClubDetail.statsProgressDist', 'Répartition lecture')}</div>
                <div className="cc-stats__bars">
                  {dist.map((count, i) => (
                    <div key={i} className="cc-stats__bar-col">
                      <div className="cc-stats__bar-wrap">
                        <div
                          className="cc-stats__bar cc-stats__bar--progress"
                          style={{ height: `${Math.max((count / max) * 100, count > 0 ? 8 : 0)}%` }}
                          title={`${count} membre${count > 1 ? 's' : ''}`}
                        />
                      </div>
                      <span className="cc-stats__bar-day">{labels[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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

      {/* Permanent room — above scheduled sessions */}
      <PermanentRoomSection
        club={club} slug={slug} isMember={isMember} isAdmin={isAdmin}
        socialService={socialService} onJoinSession={onJoinSession}
        sessions={sessions} setSessions={setSessions}
        toast={toast} handleApiError={handleApiError} t={t}
      />

      {/* Sessions */}
      <SessionList
        sessions={sessions} isMember={isMember} isAdmin={isAdmin} isMod={isMod} user={user}
        slug={slug} club={club} socialService={socialService} setSessions={setSessions}
        setShowSessionCreate={setShowSessionCreate} onJoinSession={onJoinSession} videoPeakRef={videoPeakRef}
        toast={toast} handleApiError={handleApiError} t={t} i18n={i18n}
      />

      {/* ── AI Assistant Section ── */}
      {isMember && (
        <AiClubSection club={club} slug={slug} t={t} toast={toast} />
      )}

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
        ) : <div className="cc-empty cc-empty--compact"><div className="cc-empty__icon"><i className="fas fa-book-open" /></div><p>{t('pages.bookClubDetail.noBookSub', 'Aucun livre sélectionné. L\'admin peut en choisir un.')}</p></div>}
        {isAdmin && club.current_book && (
          <button className="cc-btn cc-btn--outline" style={{width: '100%', marginTop: 8}} onClick={() => setConfirmAction({
            icon: 'fa-check-circle',
            title: t('pages.bookClubDetail.finishBook', 'Terminer la lecture'),
            message: t('pages.bookClubDetail.finishBookConfirm', 'Terminer la lecture de ce livre et l\'archiver ?'),
            confirmLabel: t('pages.bookClubDetail.finishBook', 'Terminer'),
            action: async () => {
              try {
                const r = await socialService.updateClub(slug, { current_book: null });
                setClub(r.data);
                toast.success(t('pages.bookClubDetail.finishBookDone', 'Lecture terminée et archivée'));
              } catch (e) { toast.error(handleApiError(e)); }
            },
          })}>
            <i className="fas fa-check-circle" /> {t('pages.bookClubDetail.finishBook', 'Terminer la lecture')}
          </button>
        )}
        {isAdmin && <div className="cc-book-change">
          <div className="cc-book-search">
            <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder={t('pages.bookClubDetail.changeBookPlaceholder', 'Changer le livre...')} />
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
          <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.pollRailTitle', 'Sondages')}</div>
          {activePoll && <RailPollCard poll={activePoll} isAdmin={isAdmin} closePollAction={closePollAction} t={t} />}
          {!activePoll && isAdmin && <button className="cc-btn cc-btn--join" onClick={openPollCreate} style={{width: '100%', marginBottom: 8}}><i className="fas fa-poll" /> {t('pages.bookClubDetail.createPollTitle')}</button>}
          {!activePoll && !isAdmin && <div className="cc-empty cc-empty--compact"><div className="cc-empty__icon"><i className="fas fa-poll" /></div><p>{t('pages.bookClubDetail.pollEmptySub', 'Aucun sondage en cours.')}</p></div>}
          {/* Closed polls are now in the Chronicle tab */}
        </div>
      )}

      {/* Wishlist (suggestions de lecture) */}
      {isMember && (
        <WishlistSection slug={slug} isMember={isMember} isAdmin={isAdmin} user={user} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
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

      {/* Shared media gallery */}
      {isMember && <MediaGallery slug={slug} socialService={socialService} t={t} />}

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
            <button className="cc-btn cc-btn--whatsapp" onClick={shareWhatsApp}><i className="fab fa-whatsapp" /> {t('pages.bookClubDetail.shareWhatsApp', 'WhatsApp')}</button>
            <button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode" /> {t('pages.bookClubDetail.qrTitle', 'QR Code')}</button>
          </div>
        </div>
      )}

      <div className="cc-rail__footer">
        {user && !isMember && (isFull
          ? <button className="cc-btn cc-btn--join cc-btn--disabled" disabled><i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
          : <button className="cc-btn cc-btn--join" onClick={join}><i className="fas fa-sign-in-alt" /> {t('pages.bookClubDetail.joinClub')}</button>
        )}
        {user && isMember && club.creator?.id !== user.id && <button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt" /> {t('pages.bookClubDetail.leave')}</button>}
        {user && club.creator?.id === user.id && (
          <button className="cc-btn" onClick={async () => {
            try {
              const r = await socialService.exportClubData(slug);
              const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `${club.slug}-export.json`; a.click();
              URL.revokeObjectURL(url);
            } catch (e) { toast.error(handleApiError(e)); }
          }}><i className="fas fa-download" /> {t('pages.bookClubDetail.exportData', 'Exporter les données')}</button>
        )}
        {isAdmin && <button className="cc-btn cc-btn--danger" onClick={() => setShowDeleteConfirm(true)}><i className="fas fa-trash" /> {t('pages.bookClubDetail.deleteClub', 'Supprimer')}</button>}
        <Link to="/clubs" className="cc-rail__back"><i className="fas fa-arrow-left" /> {t('pages.bookClubs.allClubs')}</Link>
      </div>
      <ConfirmModal
        show={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => { await confirmAction?.action?.(); setConfirmAction(null); }}
        icon={confirmAction?.icon}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        danger={confirmAction?.danger}
      />
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

function RailPollCard({ poll, isAdmin, closePollAction, t }) {
  const totalVotes = poll.options?.reduce((s, o) => s + o.votes_count, 0) || 0;
  const isExpired = poll.expires_at && new Date(poll.expires_at) <= Date.now();
  const isClosed = poll.status === 'CLOSED' || isExpired;
  const expiresAt = poll.expires_at ? new Date(poll.expires_at) : null;
  const remaining = (() => {
    if (!expiresAt || isClosed) return '';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '';
    const d = Math.floor(diff / 86400e3);
    const h = Math.floor((diff % 86400e3) / 3600e3);
    const m = Math.floor((diff % 3600e3) / 60e3);
    if (d > 0) return `${d}j ${h}h`;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  })();
  return (
    <div className={`cc-poll-rail${isClosed ? ' cc-poll-rail--closed' : ''}`}>
      <div className="cc-poll-rail__title">{poll.title}</div>
      <div className="cc-poll-rail__meta">
        {t('pages.bookClubDetail.pollTotalVotes', {count: totalVotes})} · {isClosed ? t('pages.bookClubDetail.pollClosed', 'Terminé') : t('pages.bookClubDetail.pollAnonymous')}
        {remaining && <> · <i className="fas fa-clock" /> {remaining}</>}
      </div>
      <div className="cc-poll-rail__options">
        {poll.options?.map(opt => {
          const pct = totalVotes > 0 ? Math.round(opt.votes_count / totalVotes * 100) : 0;
          const isLeader = opt.votes_count === Math.max(...poll.options.map(o => o.votes_count)) && opt.votes_count > 0;
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
      {isAdmin && !isClosed && closePollAction && (
        <div className="cc-poll-rail__footer">
          <button className="cc-btn cc-btn--poll-close" onClick={() => closePollAction()}><i className="fas fa-check" /> {t('pages.bookClubDetail.closePoll')}</button>
        </div>
      )}
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
  const [open, setOpen] = useState(false);

  const toggle = async () => {
    if (!logs && !open) {
      // First click: load + open
      setLoading(true);
      try {
        const r = await socialService.getModerationLog(slug);
        setLogs(Array.isArray(r.data) ? r.data : []);
      } catch { setLogs([]); }
      setLoading(false);
      setOpen(true);
    } else {
      // Subsequent clicks: toggle visibility (data stays cached)
      setOpen(o => !o);
    }
  };

  const label = loading
    ? t('pages.bookClubDetail.modLogLoading', 'Chargement...')
    : open
      ? t('pages.bookClubDetail.modLogHide', 'Masquer')
      : logs
        ? `${logs.length} entrée(s)`
        : t('pages.bookClubDetail.modLogLoad', 'Charger');

  return (
    <div className="cc-rail__section">
      <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.modLogTitle', 'Journal de modération')}</div>
      <button className="cc-btn cc-btn--outline" onClick={toggle} style={{width: '100%', marginBottom: 8}} disabled={loading}>
        <i className={`fas ${loading ? 'fa-spinner fa-spin' : open ? 'fa-chevron-up' : 'fa-history'}`} /> {label}
      </button>
      {open && logs && logs.length > 0 && (
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
      {open && logs && logs.length === 0 && <p className="cc-rail__empty">{t('pages.bookClubDetail.modLogEmpty', 'Aucune action enregistrée')}</p>}
    </div>
  );
}
