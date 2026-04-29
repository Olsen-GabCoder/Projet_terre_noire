import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/ClubChat.css';

import { groupByDate, ini } from '../components/club/clubUtils';
import { ChatMessages, MessageComposer, ConversationPoll, PollCreateModal, SessionCreateModal, MemberList, ChronicleSection, PassagesSection, WishlistSection, ClubRail, QrModal, ReportModal, ForwardModal, DeleteConfirmModal } from '../components/club';
import ThreadPanel from '../components/club/ThreadPanel';
import VideoRoom from '../components/club/VideoRoom';

import useClub from '../hooks/club/useClub';
import useClubMessages from '../hooks/club/useClubMessages';
import useClubPolls from '../hooks/club/useClubPolls';

export default function BookClubDetail() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const { user } = useAuth();

  // ── Hook 1: Club core ──
  const {
    club, setClub, members, setMembers, loading, error, isMember, setIsMember,
    isAdmin, isMod, isFull,
    joining, join, leave,
    myApplication, applyForm, setApplyForm, applySubmitting, applySuccess, submitApplication,
    reloadMembers, changeRole, kick, ban, invite, inviteInput, setInviteInput, inviting,
    approveMember, rejectMember, deleteClub,
    registerSetMessages, registerOnMyProgress,
  } = useClub(slug, user, t, toast, handleApiError, socialService);

  // ── Hook 2: Messages ──
  const {
    messages, setMessages,
    chatRef, topSentinelRef, endRef, inputRef, longPressRef, longPressFired,
    showScrollBtn, scrollToBottom, onChatScroll,
    loadingOlder,
    handleDeleteMsg, handleEditMsg, handlePin, handleReact,
    showSearch, setShowSearch, chatSearch, setChatSearch,
    searchMatchIds, searchIdx, searchMatchArr, doSearch, navigateSearch, clearSearch,
    msgMenu, setMsgMenu, editingMsg, setEditingMsg, replyTo, setReplyTo,
    reactionPicker, setReactionPicker, reportMsg, setReportMsg, forwardMsg, setForwardMsg,
    pinnedIdx, setPinnedIdx,
    typingUsers,
    wsConnected, sendWsEvent,
    onlineUsers,
    blockedIds, setBlockedIds,
    registerSessionUpdate,
  } = useClubMessages(slug, club, isMember, user, socialService, toast, handleApiError);

  // ── Hook 3: Polls ──
  const {
    activePoll, setActivePoll, applicationPolls,
    myVotes, setMyVotes,
    votePollOption, closePollAction,
  } = useClubPolls(slug, isMember, club, setClub, socialService, toast, handleApiError);

  // ── Wire join's setMessages to useClubMessages ──
  useEffect(() => { registerSetMessages(setMessages); }, [registerSetMessages, setMessages]);

  // ── Wire session updates from WebSocket ──
  useEffect(() => {
    registerSessionUpdate((sessionId, meetingActive, sessionData) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        // Use full session data from broadcast if available, else patch meeting_active
        return sessionData ? { ...s, ...sessionData } : { ...s, meeting_active: meetingActive };
      }));
      // Close VideoRoom if session ended
      if (meetingActive === false) {
        setVideoSession(prev => prev?.id === sessionId ? null : prev);
      }
    });
  }, [registerSessionUpdate]);

  // ── UI state (stays in component) ──
  const [mainTab, setMainTab] = useState('discussion');
  const [railOpen, setRailOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('info');
  const [threadMsg, setThreadMsg] = useState(null);
  const [videoSession, setVideoSession] = useState(null);
  const videoPeakRef = useRef(0);

  // ── Data sections (stays in component) ──
  const [myProgress, setMyProgress] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);

  // ── Wire myProgress callback ──
  useEffect(() => { registerOnMyProgress(setMyProgress); }, [registerOnMyProgress]);

  // ── Load sessions when isMember ──
  useEffect(() => {
    if (!club || !isMember) return;
    (async () => {
      try { const s = await socialService.getClubSessions(slug); setSessions(Array.isArray(s.data) ? s.data : []); } catch {}
    })();
  }, [club, isMember, slug]);

  // ── Admin state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [showSessionCreate, setShowSessionCreate] = useState(false);

  // ── Reports ──
  const loadReports = async () => { try { const r = await socialService.getReports(slug, {status: 'PENDING'}); setReports(Array.isArray(r.data) ? r.data : []); } catch {} };
  const handleReportAction = async (reportId, newStatus) => { try { await socialService.updateReport(slug, reportId, {status: newStatus}); setReports(p => p.filter(r => r.id !== reportId)); toast.success(newStatus === 'REVIEWED' ? 'Signalement traité' : 'Signalement rejeté'); } catch {} };

  // ── Reading progress ──
  const saveProgress = async (val) => { setMyProgress(val); try { await socialService.updateReadingProgress(slug, val); } catch {} };

  // ── Invite link ──
  const generateInviteUrl = async () => {
    if (inviteUrl) return inviteUrl;
    try { const r = await socialService.createInviteLink(slug, 7, 0); const url = `${window.location.origin}/clubs/invite/${r.data.token}`; setInviteUrl(url); return url; } catch { toast.error(t('pages.bookClubDetail.inviteLinkError')); return null; }
  };
  const shareClub = async () => {
    const url = isAdmin ? await generateInviteUrl() : window.location.href;
    if (!url) return;
    const shareData = {
      title: club.name,
      text: t('pages.bookClubDetail.shareText', { clubName: club.name }),
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const waText = encodeURIComponent(`${shareData.text}\n${url}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener');
  };
  const shareWhatsApp = async () => {
    const url = isAdmin ? await generateInviteUrl() : window.location.href;
    if (!url) return;
    const text = t('pages.bookClubDetail.shareText', { clubName: club.name });
    const waText = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener');
  };
  const openQr = async () => { await generateInviteUrl(); setShowQr(true); };

  // ── Club edit ──
  const openEdit = () => { setEditForm({name: club.name, description: club.description || '', rules: club.rules || ''}); setSidebarTab('edit'); };
  const saveEdit = async () => { if (!editForm) return; setSaving(true); try { await socialService.updateClub(slug, editForm); toast.success('Club mis à jour.'); const r = await socialService.getClub(slug); setClub(r.data); setSidebarTab('info'); } catch (e) { toast.error(handleApiError(e)); } setSaving(false); };

  // ── Book search for changing current book ──
  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return; }
    const timer = setTimeout(async () => { try { const r = await (await import('../services/bookService')).default.searchBooks(bookSearch); const b = Array.isArray(r) ? r : r?.results || []; setBookResults(b.slice(0, 5)); } catch { setBookResults([]); } }, 400);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const changeBook = async (bookId) => { try { await socialService.updateClub(slug, {current_book: bookId}); toast.success('Livre en cours mis à jour.'); const r = await socialService.getClub(slug); setClub(r.data); setBookSearch(''); setBookResults([]); } catch (e) { toast.error(handleApiError(e)); } };

  // ── Loading / Error ──
  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="cc-error"><i className="fas fa-exclamation-triangle" /><p>{error}</p><Link to="/clubs">{t('pages.bookClubDetail.back')}</Link></div>;
  if (!club) return null;

  // ── Derived data ──
  const grouped = groupByDate(messages);
  const pinnedMsgs = messages.filter(m => m.is_pinned && !m.is_deleted);
  const createdDate = new Date(club.created_at);
  const createdMonth = createdDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {month: 'short', year: 'numeric'});
  const topMembers = members.slice(0, 5);

  return (<>
    <div className="cc">
      <SEO title={club.name} />

      {/* ══ MOBILE TOPBAR ══ */}
      <div className="cc-mob" onClick={() => setRailOpen(o => !o)}>
        <div className="cc-mob__av">
          {club.current_book?.cover_image
            ? <img src={club.current_book.cover_image} alt="" />
            : club.cover_image
              ? <img src={club.cover_image} alt="" />
              : <i className="fas fa-users" />}
        </div>
        <div className="cc-mob__txt">
          <h1>{club.name}</h1>
          <span>
            {club.current_book && <><i className="fas fa-book-open" style={{fontSize: 10, marginRight: 4}} />{club.current_book.title} · </>}
            {t('pages.bookClubDetail.memberCount', { count: members.length })}{isFull && ` · ${t('pages.bookClubDetail.clubFull', 'Complet')}`}
            {sessions.length > 0 && sessions[0].meeting_active && (
              <> · <strong className="cc-mob__live">{t('pages.bookClubDetail.sessionLive', 'EN DIRECT')}</strong></>
            )}
            {sessions.length > 0 && !sessions[0].meeting_active && (
              <> · {new Date(sessions[0].scheduled_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {day: 'numeric', month: 'short'})}, {new Date(sessions[0].scheduled_at).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {hour: '2-digit', minute: '2-digit'})}</>
            )}
          </span>
        </div>
      </div>

      {/* ══ HEADER ══ */}
      <div className="cc-header">
        <div className="cc-header__cover">
          {club.current_book?.cover_image ? <img src={club.current_book.cover_image} alt={club.current_book.title} /> :
           club.cover_image ? <img src={club.cover_image} alt="" /> :
           <div className="cc-header__cover-placeholder"><i className="fas fa-book-open" /></div>}
        </div>
        <div className="cc-header__info">
          <div className="cc-header__eyebrow">— Club · {members.length} {t('pages.bookClubDetail.members')} · {t('pages.bookClubDetail.foundedIn')} {createdMonth}</div>
          <h1 className="cc-header__title">{club.name}</h1>
          {club.current_book && (
            <div className="cc-header__subtitle">
              {t('pages.bookClubDetail.readingInProgress')} : « {club.current_book.title} »
            </div>
          )}
          <div className="cc-header__meta">
            <div className="cc-header__avatars">
              {topMembers.map((m, i) => (
                <div key={m.id} className="cc-header__av" style={{marginLeft: i > 0 ? -8 : 0}}>
                  {m.user?.profile_image ? <img src={m.user.profile_image} alt="" /> : <span>{ini(m.user?.full_name || m.user?.username)}</span>}
                </div>
              ))}
              {members.length > 5 && <div className="cc-header__av cc-header__av--more" style={{marginLeft: -8}}>+{members.length - 5}</div>}
            </div>
            {sessions.length > 0 && (
              <>
                <span className="cc-header__dot">·</span>
                <span className="cc-header__next">
                  {t('pages.bookClubDetail.nextSession')} : <strong>{new Date(sessions[0].scheduled_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {day: 'numeric', month: 'long'})}, {new Date(sessions[0].scheduled_at).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {hour: '2-digit', minute: '2-digit'})}</strong> · {sessions[0].is_online ? t('pages.bookClubDetail.online') : (sessions[0].location || '')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="cc-header__actions">
          {user && !isMember && !club.requires_approval && (isFull
            ? <button className="cc-btn cc-btn--join cc-btn--disabled" disabled title={t('pages.bookClubDetail.clubFullTooltip', 'Ce club est complet')}><i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
            : <button className="cc-btn cc-btn--join" onClick={() => join()}>{t('pages.bookClubDetail.joinClub')}</button>
          )}
          {user && isMember && club.creator?.id !== user.id && <button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt" /> {t('pages.bookClubDetail.leave')}</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={shareClub}><i className="fas fa-share-alt" /> {t('pages.bookClubDetail.shareNative')}</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline cc-btn--whatsapp" onClick={shareWhatsApp}><i className="fab fa-whatsapp" /> {t('pages.bookClubDetail.shareWhatsApp')}</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode" /> QR</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={openEdit}><i className="fas fa-pen" /> {t('pages.bookClubDetail.edit')}</button>}
        </div>
      </div>

      {/* ══ NON-MEMBER LANDING ══ */}
      {!isMember && (
        <div className="cc-landing">
          <div className="cc-landing__card">
            <div className="cc-landing__badge">
              <i className={`fas ${club.is_public ? 'fa-globe' : 'fa-lock'}`} />
              {club.is_public ? t('pages.bookClubDetail.publicClub', 'Club public') : t('pages.bookClubDetail.privateClub', 'Club privé')}
            </div>
            {club.description && <p className="cc-landing__desc">{club.description}</p>}
            {club.category?.length > 0 && (
              <div className="cc-landing__tags">
                {club.category.map((c, i) => <span key={i} className="cc-tag cc-tag--pri">{c}</span>)}
              </div>
            )}
            <div className="cc-landing__meta">
              <span><i className="fas fa-users" /> {members.length} {t('pages.bookClubDetail.members')}</span>
              {club.meeting_frequency && <span><i className="fas fa-calendar" /> {club.frequency_display}</span>}
            </div>

            {!user ? (
              <div className="cc-landing__auth">
                <p>{t('pages.bookClubDetail.loginToJoin', 'Connectez-vous pour rejoindre ce club.')}</p>
                <Link to="/login" className="cc-btn cc-btn--join">{t('pages.bookClubDetail.login', 'Se connecter')}</Link>
              </div>
            ) : isFull ? (
              <div className="cc-landing__full">
                <i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}
              </div>
            ) : !club.requires_approval ? (
              <div className="cc-landing__join">
                <button className="cc-btn cc-btn--join cc-landing__join-btn" onClick={() => join()} disabled={joining}>
                  {joining ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sign-in-alt" />}
                  {' '}{t('pages.bookClubDetail.joinClub')}
                </button>
              </div>
            ) : (applySuccess || myApplication?.status === 'PENDING') ? (
              <div className="cc-landing__status">
                <i className="fas fa-hourglass-half" />
                {t('pages.bookClubDetail.applyPending', 'Votre candidature est en cours de vote par les membres.')}
              </div>
            ) : (myApplication?.status === 'REJECTED' && myApplication.resolved_at && new Date(new Date(myApplication.resolved_at).getTime() + 30 * 86400e3) > Date.now()) ? (
              <div className="cc-landing__status">
                <i className="fas fa-calendar-times" />
                {t('pages.bookClubDetail.applyRejectedWait', { date: new Date(new Date(myApplication.resolved_at).getTime() + 30 * 86400e3).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR') })}
              </div>
            ) : (
              <div className="cc-landing__form">
                <h3>{t('pages.bookClubDetail.applyTitle', 'Postuler pour rejoindre ce club')}</h3>
                <div className="cc-landing__field">
                  <label>{t('pages.bookClubDetail.applyReading', 'Quel est votre rapport à la lecture ?')}</label>
                  <textarea value={applyForm.reading_relationship} onChange={e => setApplyForm(f => ({...f, reading_relationship: e.target.value}))} placeholder={t('pages.bookClubDetail.applyReadingPlaceholder')} rows={3} />
                </div>
                <div className="cc-landing__field">
                  <label>{t('pages.bookClubDetail.applyMotivation', 'Pourquoi souhaitez-vous rejoindre ce club ?')}</label>
                  <textarea value={applyForm.motivation} onChange={e => setApplyForm(f => ({...f, motivation: e.target.value}))} placeholder={t('pages.bookClubDetail.applyMotivationPlaceholder')} rows={3} />
                </div>
                <div className="cc-landing__field">
                  <label>{t('pages.bookClubDetail.applyContribution', "Qu'aimeriez-vous apporter au club ?")}</label>
                  <textarea value={applyForm.contribution} onChange={e => setApplyForm(f => ({...f, contribution: e.target.value}))} placeholder={t('pages.bookClubDetail.applyContributionPlaceholder')} rows={3} />
                </div>
                <button className="cc-btn cc-btn--join cc-landing__join-btn" onClick={submitApplication} disabled={applySubmitting || !applyForm.reading_relationship.trim() || !applyForm.motivation.trim() || !applyForm.contribution.trim()}>
                  {applySubmitting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                  {' '}{applySubmitting ? t('pages.bookClubDetail.applySubmitting', 'Envoi...') : t('pages.bookClubDetail.applySubmit', 'Soumettre ma candidature')}
                </button>
              </div>
            )}

            <Link to="/clubs" className="cc-landing__back">
              <i className="fas fa-arrow-left" /> {t('pages.bookClubDetail.backToClubs', 'Retour aux clubs')}
            </Link>
          </div>
        </div>
      )}

      {/* ══ BODY: 2 columns (members only) ══ */}
      {isMember && <div className="cc-body">
        {/* ── LEFT: Tabs + Content ── */}
        <div className="cc-main">
          <div className="cc-tabs">
            <button className={`cc-tabs__btn ${mainTab === 'discussion' ? 'cc-tabs__btn--active' : ''}`} onClick={() => setMainTab('discussion')}>
              {t('pages.bookClubDetail.tabDiscussion')} {messages.length > 0 && <span className="cc-tabs__count">· {messages.length}</span>}
            </button>
            <button className={`cc-tabs__btn ${mainTab === 'passages' ? 'cc-tabs__btn--active' : ''}`} onClick={() => setMainTab('passages')}>
              {t('pages.bookClubDetail.tabPassages')}
            </button>
            <button className={`cc-tabs__btn ${mainTab === 'participants' ? 'cc-tabs__btn--active' : ''}`} onClick={() => setMainTab('participants')}>
              {t('pages.bookClubDetail.tabParticipants')}
            </button>
            <button className={`cc-tabs__btn ${mainTab === 'chronicle' ? 'cc-tabs__btn--active' : ''}`} onClick={() => setMainTab('chronicle')}>
              {t('pages.bookClubDetail.tabChronicle', 'Chronique')}
            </button>
            {mainTab === 'discussion' && <button className={`cc-tabs__btn cc-tabs__btn--icon${showSearch ? ' cc-tabs__btn--active' : ''}`} onClick={() => setShowSearch(p => !p)} title="Rechercher"><i className="fas fa-search" /></button>}
          </div>

          {/* ── TAB: Discussion ── */}
          {mainTab === 'discussion' && <>
            {showSearch && <div className="cc-search">
              <div className="cc-search__field">
                <i className="fas fa-search" />
                <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Rechercher dans le chat..." onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} autoFocus />
                {searchMatchIds && <span className="cc-search__count">{searchMatchArr.length > 0 ? `${searchIdx + 1}/${searchMatchArr.length}` : '0'}</span>}
                {searchMatchIds && searchMatchArr.length > 1 && <>
                  <button onClick={() => navigateSearch(-1)} className="cc-search__nav"><i className="fas fa-chevron-up" /></button>
                  <button onClick={() => navigateSearch(1)} className="cc-search__nav"><i className="fas fa-chevron-down" /></button>
                </>}
                {chatSearch && <button onClick={clearSearch} className="cc-search__clear"><i className="fas fa-times" /></button>}
              </div>
            </div>}

            {pinnedMsgs.length > 0 && (() => {
              const idx = pinnedIdx % pinnedMsgs.length;
              const current = pinnedMsgs[idx];
              return (
                <div className="cc-pinned-bar" onClick={() => {
                  const el = document.getElementById(`msg-${current.id}`);
                  if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.classList.add('cc-msg--highlight'); setTimeout(() => el.classList.remove('cc-msg--highlight'), 1500); }
                  setPinnedIdx(i => i + 1);
                }}>
                  <i className="fas fa-thumbtack cc-pinned-bar__icon" />
                  <div className="cc-pinned-bar__content">
                    <span className="cc-pinned-bar__label">{idx + 1}/{pinnedMsgs.length}</span>
                    <span className="cc-pinned-bar__preview">{current.author?.full_name || 'Membre'}: {current.content?.slice(0, 60) || ({VOICE: '🎤 Note vocale', IMAGE: '📷 Photo', FILE: '📎 Fichier', QUOTE: '📖 Citation'}[current.message_type] || '...')}</span>
                  </div>
                </div>
              );
            })()}

            <ChatMessages
              messages={messages} grouped={grouped} user={user} isMember={isMember} isMod={isMod} isAdmin={isAdmin}
              members={members} club={club}
              searchMatchIds={searchMatchIds} chatSearch={chatSearch} searchIdx={searchIdx}
              msgMenu={msgMenu} setMsgMenu={setMsgMenu}
              editingMsg={editingMsg} setEditingMsg={setEditingMsg}
              reactionPicker={reactionPicker} setReactionPicker={setReactionPicker}
              replyTo={replyTo} setReplyTo={setReplyTo}
              setReportMsg={setReportMsg} setForwardMsg={setForwardMsg} inputRef={inputRef}
              handleDeleteMsg={handleDeleteMsg} handleEditMsg={handleEditMsg}
              handlePin={handlePin} handleReact={handleReact}
              loadingOlder={loadingOlder} onChatScroll={onChatScroll}
              chatRef={chatRef} topSentinelRef={topSentinelRef} endRef={endRef}
              activePoll={activePoll} applicationPolls={applicationPolls} myVotes={myVotes} votePollOption={votePollOption} closePollAction={closePollAction}
              blockedIds={blockedIds} onOpenThread={setThreadMsg}
              t={t} i18n={i18n}
              longPressRef={longPressRef} longPressFired={longPressFired}
            />

            {showScrollBtn && <button className="cc-scroll-btn" onClick={scrollToBottom}><i className="fas fa-chevron-down" /></button>}

            <MessageComposer
              slug={slug} user={user} isMember={isMember} isFull={isFull} club={club} members={members}
              messages={messages} setMessages={setMessages}
              replyTo={replyTo} setReplyTo={setReplyTo}
              typingUsers={typingUsers}
              wsConnected={wsConnected} sendWsEvent={sendWsEvent}
              t={t} inputRef={inputRef}
              socialService={socialService} toast={toast} handleApiError={handleApiError}
            />
          </>}

          {/* ── TAB: Passages ── */}
          {mainTab === 'passages' && <PassagesSection messages={messages} i18n={i18n} t={t} />}

          {/* ── TAB: Participants ── */}
          {mainTab === 'participants' && (
            <MemberList
              members={members} club={club} user={user} isAdmin={isAdmin} isMod={isMod}
              inviteInput={inviteInput} setInviteInput={setInviteInput} inviting={inviting} invite={invite}
              changeRole={changeRole} kick={kick} ban={ban} onlineUsers={onlineUsers} t={t}
              toast={toast} handleApiError={handleApiError}
            />
          )}

          {/* ── TAB: Chronicle ── */}
          {mainTab === 'chronicle' && (
            <ChronicleSection slug={slug} club={club} isMember={isMember} isAdmin={isAdmin} user={user} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} i18n={i18n} />
          )}
        </div>{/* end cc-main */}

        {/* ── RIGHT RAIL ── */}
        <ClubRail
          club={club} setClub={setClub} members={members} user={user} isMember={isMember} isAdmin={isAdmin} isMod={isMod} isFull={isFull}
          myProgress={myProgress} setMyProgress={setMyProgress} saveProgress={saveProgress}
          sessions={sessions} setSessions={setSessions}
          activePoll={activePoll} setActivePoll={setActivePoll} myVotes={myVotes} setMyVotes={setMyVotes}
          votePollOption={votePollOption} closePollAction={closePollAction} openPollCreate={() => setShowPollCreate(true)}
          railOpen={railOpen} setRailOpen={setRailOpen}
          sidebarTab={sidebarTab} setSidebarTab={setSidebarTab} editForm={editForm} setEditForm={setEditForm} saving={saving} saveEdit={saveEdit}
          slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError}
          join={join} leave={leave} deleteClub={deleteClub} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
          shareClub={shareClub} shareWhatsApp={shareWhatsApp} openQr={openQr} inviteUrl={inviteUrl}
          reports={reports} loadReports={loadReports} handleReportAction={handleReportAction}
          setShowSessionCreate={setShowSessionCreate} onJoinSession={setVideoSession} videoPeakRef={videoPeakRef}
          bookSearch={bookSearch} setBookSearch={setBookSearch} bookResults={bookResults} changeBook={changeBook}
          approveMember={approveMember} rejectMember={rejectMember}
          t={t} i18n={i18n}
        />
      </div>}{/* end cc-body */}

      {/* ══ FAB ══ */}
      {isMember && <button className="cc-fab" onClick={() => setRailOpen(true)} aria-label="Infos du club">
        <i className="fas fa-info-circle" />
      </button>}
      {isMember && railOpen && <div className="cc-rail-overlay" onClick={() => setRailOpen(false)} />}
    </div>

    {/* ══ MODALS (portals) ══ */}
    <QrModal show={showQr} inviteUrl={inviteUrl} club={club} onClose={() => setShowQr(false)} toast={toast} t={t} />
    <ReportModal reportMsg={reportMsg} onClose={() => setReportMsg(null)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
    <ForwardModal forwardMsg={forwardMsg} onClose={() => setForwardMsg(null)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
    <DeleteConfirmModal show={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onDelete={deleteClub} />
    <SessionCreateModal show={showSessionCreate} onClose={() => setShowSessionCreate(false)} club={club} slug={slug} socialService={socialService} setSessions={setSessions} toast={toast} handleApiError={handleApiError} t={t} />
    <PollCreateModal show={showPollCreate} onClose={() => setShowPollCreate(false)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} setActivePoll={setActivePoll} setMyVotes={setMyVotes} t={t} />
    <ThreadPanel slug={slug} rootMsg={threadMsg} onClose={() => setThreadMsg(null)} user={user} members={members} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} i18n={i18n} />
    {videoSession && <VideoRoom session={videoSession} user={user} club={club} slug={slug} socialService={socialService} onClose={() => setVideoSession(null)} t={t} videoPeakRef={videoPeakRef} />}
  </>);
}
