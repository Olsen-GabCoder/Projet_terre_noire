import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/ClubChat.css';

import { groupByDate, ini } from '../components/club/clubUtils';
import { ChatMessages, MessageComposer, ConversationPoll, PollCreateModal, SessionCreateModal, MemberList, ArchiveSection, PassagesSection, WishlistSection, ClubRail, QrModal, ReportModal, ForwardModal, DeleteConfirmModal } from '../components/club';

export default function BookClubDetail() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const { user } = useAuth();

  // ── Core state ──
  const [club, setClub] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMember, setIsMember] = useState(false);

  // ── UI state ──
  const [mainTab, setMainTab] = useState('discussion');
  const [railOpen, setRailOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('info');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // ── Chat state ──
  const [msgMenu, setMsgMenu] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [reportMsg, setReportMsg] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ── Search state ──
  const [chatSearch, setChatSearch] = useState('');
  const [searchMatchIds, setSearchMatchIds] = useState(null);
  const [searchIdx, setSearchIdx] = useState(0);
  const [pinnedIdx, setPinnedIdx] = useState(0);

  // ── Data sections ──
  const [myProgress, setMyProgress] = useState(0);
  const [activePoll, setActivePoll] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [archives, setArchives] = useState([]);
  const [reports, setReports] = useState([]);

  // ── Admin state ──
  const [inviteInput, setInviteInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [showSessionCreate, setShowSessionCreate] = useState(false);

  // ── Refs ──
  const chatRef = useRef(null);
  const topSentinelRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const longPressRef = useRef(null);
  const longPressFired = useRef(false);

  // ── Load data ──
  useEffect(() => { (async () => { try {
    const r = await socialService.getClub(slug); setClub(r.data); setIsMember(r.data.user_is_member);
    if (r.data.my_progress !== undefined) setMyProgress(r.data.my_progress);
    const [m, mb] = await Promise.all([socialService.getClubMessages(slug), socialService.getClubMembers(slug)]);
    setMessages(Array.isArray(m.data) ? m.data : m.data.results || []);
    setMembers(Array.isArray(mb.data) ? mb.data : mb.data.results || []);
    if (r.data.user_is_member) socialService.markClubRead(slug).catch(() => {});
    try { const p = await socialService.getPolls(slug); const polls = Array.isArray(p.data) ? p.data : []; const open = polls.find(x => x.status === 'OPEN'); if (open) { setActivePoll(open); const voted = open.options?.find(o => o.voted_by_me); if (voted) setMyVote(voted.id); } } catch {}
    try { const s = await socialService.getClubSessions(slug); setSessions(Array.isArray(s.data) ? s.data : []); } catch {}
    try { const a = await socialService.getClubArchives(slug); setArchives(Array.isArray(a.data) ? a.data : []); } catch {}
  } catch (e) { setError(handleApiError(e)); } setLoading(false); })(); }, [slug]);

  // ── Auto-scroll (only on new messages when user is near bottom) ──
  const prevMsgCountRef = useRef(0);
  const scrollChatToBottom = useCallback((smooth = true) => {
    const c = chatRef.current;
    if (!c) return;
    if (smooth) {
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    } else {
      c.scrollTop = c.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const prev = prevMsgCountRef.current;
    const cur = messages.length;
    prevMsgCountRef.current = cur;
    if (cur <= prev) return; // edit/delete/react — no scroll
    const c = chatRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 150;
    if (prev === 0) {
      // Initial load — jump to bottom instantly
      requestAnimationFrame(() => scrollChatToBottom(false));
    } else if (nearBottom) {
      scrollChatToBottom(true);
    }
  }, [messages, scrollChatToBottom]);

  // ── Scroll button ──
  const onChatScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    setReactionPicker(null);
  }, []);

  const scrollToBottom = () => scrollChatToBottom(true);

  // ── Message actions ──
  const handleDeleteMsg = async (msgId) => {
    try { await socialService.deleteClubMessage(slug, msgId); setMessages(prev => prev.map(m => m.id === msgId ? {...m, is_deleted: true, content: ''} : m)); } catch (e) { toast.error(handleApiError(e)); }
    setMsgMenu(null);
  };

  const handleEditMsg = async () => {
    if (!editingMsg || !editingMsg.content.trim()) return;
    try { const r = await socialService.editClubMessage(slug, editingMsg.id, editingMsg.content.trim()); setMessages(prev => prev.map(m => m.id === editingMsg.id ? {...m, content: r.data.content, edited_at: r.data.edited_at} : m)); } catch (e) { toast.error(handleApiError(e)); }
    setEditingMsg(null);
  };

  // ── Load older messages ──
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const firstId = messages[0].id;
      const r = await socialService.getOlderClubMessages(slug, firstId, 30);
      const older = r.data.results || [];
      if (older.length > 0) {
        const container = chatRef.current;
        const prevHeight = container?.scrollHeight || 0;
        setMessages(prev => [...older, ...prev]);
        requestAnimationFrame(() => { if (container) { container.scrollTop = container.scrollHeight - prevHeight; } });
      }
      setHasMore(r.data.has_more !== false && older.length === 30);
    } catch {}
    setLoadingOlder(false);
  }, [loadingOlder, hasMore, messages, slug]);

  // ── Infinite scroll observer ──
  useEffect(() => {
    if (!topSentinelRef.current || !isMember) return;
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadOlderMessages(); }, {root: chatRef.current, threshold: 0.1});
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [loadOlderMessages, isMember]);

  // ── Pin message ──
  const handlePin = async (msgId) => {
    try { const r = await socialService.pinMessage(slug, msgId); setMessages(prev => prev.map(m => m.id === msgId ? {...m, is_pinned: r.data.is_pinned} : m)); } catch (e) { toast.error(handleApiError(e)); }
    setMsgMenu(null);
  };

  // ── Reports ──
  const loadReports = async () => { try { const r = await socialService.getReports(slug, {status: 'PENDING'}); setReports(Array.isArray(r.data) ? r.data : []); } catch {} };
  const handleReportAction = async (reportId, newStatus) => { try { await socialService.updateReport(slug, reportId, {status: newStatus}); setReports(p => p.filter(r => r.id !== reportId)); toast.success(newStatus === 'REVIEWED' ? 'Signalement traité' : 'Signalement rejeté'); } catch {} };

  // ── Search ──
  const doSearch = async () => {
    if (!chatSearch.trim()) { setSearchMatchIds(null); return; }
    try {
      const r = await socialService.searchMessages(slug, chatSearch.trim());
      const results = Array.isArray(r.data) ? r.data : r.data?.results || [];
      const ids = new Set(results.map(m => m.id));
      setSearchMatchIds(ids);
      setSearchIdx(0);
      if (results.length > 0) { const el = document.getElementById(`msg-${results[0].id}`); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); } }
    } catch { setSearchMatchIds(new Set()); }
  };
  const searchMatchArr = searchMatchIds ? messages.filter(m => searchMatchIds.has(m.id)) : [];
  const navigateSearch = (dir) => {
    if (!searchMatchArr.length) return;
    const next = (searchIdx + dir + searchMatchArr.length) % searchMatchArr.length;
    setSearchIdx(next);
    const el = document.getElementById(`msg-${searchMatchArr[next].id}`);
    if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  };
  const clearSearch = () => { setChatSearch(''); setSearchMatchIds(null); setSearchIdx(0); setShowSearch(false); };

  // ── Poll actions ──
  const votePollOption = async (optionId) => {
    if (!activePoll || optionId === myVote) return;
    try { const r = await socialService.votePoll(slug, activePoll.id, optionId); setActivePoll(r.data.poll); setMyVote(optionId); } catch (e) { toast.error(handleApiError(e)); }
  };
  const closePollAction = async () => {
    if (!activePoll) return;
    try { const r = await socialService.closePoll(slug, activePoll.id); setActivePoll({...activePoll, status: 'CLOSED', ...r.data}); const cr = await socialService.getClub(slug); setClub(cr.data); } catch (e) { toast.error(handleApiError(e)); }
  };

  // ── Reading progress ──
  const saveProgress = async (val) => { setMyProgress(val); try { await socialService.updateReadingProgress(slug, val); } catch {} };

  // ── Reactions ──
  const handleReact = async (msgId, emoji) => {
    try { const r = await socialService.reactToMessage(slug, msgId, emoji); setMessages(prev => prev.map(m => m.id === msgId ? {...m, reactions_summary: r.data.reactions_summary} : m)); } catch {}
    setReactionPicker(null);
  };

  // ── Polling for new messages ──
  const lastMsgIdRef = useRef(0);
  useEffect(() => {
    if (messages.length) lastMsgIdRef.current = messages[messages.length - 1].id;
  }, [messages]);

  useEffect(() => {
    if (!club || !isMember) return;
    const iv = setInterval(async () => { try {
      const r = await socialService.getNewClubMessages(slug, lastMsgIdRef.current);
      const n = Array.isArray(r.data) ? r.data : [];
      if (n.length) setMessages(p => [...p, ...n]);
    } catch {} }, 4000);
    return () => clearInterval(iv);
  }, [club, isMember, slug]);

  // ── Join / Leave ──
  const join = async () => { try { const res = await socialService.joinClub(slug); if (res.status === 202) { toast.success(t('pages.bookClubDetail.pendingSent', 'Demande envoyée ! En attente d\'approbation.')); } else { setIsMember(true); toast.success('Bienvenue !'); const r = await socialService.getClubMembers(slug); setMembers(Array.isArray(r.data) ? r.data : r.data.results || []); } } catch (e) { toast.error(handleApiError(e)); } };
  const leave = async () => { try { await socialService.leaveClub(slug); setIsMember(false); toast.success('Vous avez quitté le club.'); } catch (e) { toast.error(handleApiError(e)); } };

  // ── Derived state ──
  const isAdmin = club && user && (club.creator?.id === user.id || members.some(m => m.user?.id === user.id && m.role === 'ADMIN'));
  const isMod = isAdmin || (club && user && members.some(m => m.user?.id === user.id && m.role === 'MODERATOR'));
  const isFull = club && club.max_members && members.length >= club.max_members;

  // ── Member management ──
  const reloadMembers = async () => { const r = await socialService.getClubMembers(slug); setMembers(Array.isArray(r.data) ? r.data : r.data.results || []); };
  const changeRole = async (memberId, role) => { try { await socialService.updateMemberRole(slug, memberId, role); toast.success('Rôle mis à jour.'); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } };
  const kick = async (memberId, name) => { if (!window.confirm(`Exclure ${name} du club ?`)) return; try { await socialService.kickMember(slug, memberId); toast.success(`${name} exclu.`); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } };
  const ban = async (memberId, name) => { if (!window.confirm(t('pages.bookClubDetail.banConfirm', `Bannir ${name} définitivement ? Cette personne ne pourra plus rejoindre le club.`, {name}))) return; try { await socialService.banMember(slug, memberId); toast.success(t('pages.bookClubDetail.banSuccess', `${name} a été banni.`, {name})); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } };
  const invite = async () => { if (!inviteInput.trim()) return; setInviting(true); try { await socialService.inviteToClub(slug, inviteInput.trim()); toast.success('Membre ajouté !'); setInviteInput(''); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } setInviting(false); };
  const approveMember = async (memberId, name) => { try { await socialService.approveMember(slug, memberId); toast.success(`${name} approuvé !`); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } };
  const rejectMember = async (memberId, name) => { try { await socialService.rejectMember(slug, memberId); toast.success(`${name} refusé.`); await reloadMembers(); } catch (e) { toast.error(handleApiError(e)); } };
  const deleteClub = async () => { try { await socialService.deleteClub(slug); toast.success('Club supprimé.'); window.location.href = '/clubs'; } catch (e) { toast.error(handleApiError(e)); } };

  // ── Invite link ──
  const generateInviteUrl = async () => {
    if (inviteUrl) return inviteUrl;
    try { const r = await socialService.createInviteLink(slug, 7, 0); const url = `${window.location.origin}/clubs/invite/${r.data.token}`; setInviteUrl(url); return url; } catch { toast.error('Erreur lors de la création du lien.'); return null; }
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
    try { await navigator.clipboard.writeText(url); toast.success(t('pages.bookClubDetail.shareCopied')); } catch {}
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
  if (error) return <div className="cc-error"><i className="fas fa-exclamation-triangle" /><p>{error}</p><Link to="/clubs">Retour</Link></div>;
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
        <div className="cc-mob__av">{club.cover_image ? <img src={club.cover_image} alt="" /> : <i className="fas fa-users" />}</div>
        <div className="cc-mob__txt"><h1>{club.name}</h1><span>{members.length} membre{members.length > 1 ? 's' : ''}{isFull && ` · ${t('pages.bookClubDetail.clubFull', 'Complet')}`}</span></div>
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
          {user && !isMember && (isFull
            ? <button className="cc-btn cc-btn--join cc-btn--disabled" disabled title={t('pages.bookClubDetail.clubFullTooltip', 'Ce club est complet')}><i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
            : <button className="cc-btn cc-btn--join" onClick={join}>{t('pages.bookClubDetail.joinClub')}</button>
          )}
          {user && isMember && club.creator?.id !== user.id && <button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt" /> Quitter</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={shareClub}><i className="fas fa-share-alt" /> Partager</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode" /> QR</button>}
          {isAdmin && <button className="cc-btn cc-btn--outline" onClick={openEdit}><i className="fas fa-pen" /> Modifier</button>}
        </div>
      </div>

      {/* ══ BODY: 2 columns ══ */}
      <div className="cc-body">
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
            <button className={`cc-tabs__btn ${mainTab === 'archives' ? 'cc-tabs__btn--active' : ''}`} onClick={() => setMainTab('archives')}>
              {t('pages.bookClubDetail.tabArchives')}
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
              t={t} i18n={i18n}
              longPressRef={longPressRef} longPressFired={longPressFired}
            />

            <ConversationPoll
              activePoll={activePoll} isMember={isMember} isAdmin={isAdmin}
              myVote={myVote} votePollOption={votePollOption} closePollAction={closePollAction} t={t}
            />

            {showScrollBtn && <button className="cc-scroll-btn" onClick={scrollToBottom}><i className="fas fa-chevron-down" /></button>}

            <MessageComposer
              slug={slug} user={user} isMember={isMember} isFull={isFull} club={club} members={members}
              messages={messages} setMessages={setMessages}
              replyTo={replyTo} setReplyTo={setReplyTo}
              t={t} inputRef={inputRef}
              socialService={socialService} toast={toast} handleApiError={handleApiError}
            />
          </>}

          {/* ── TAB: Passages ── */}
          {mainTab === 'passages' && <PassagesSection messages={messages} i18n={i18n} />}

          {/* ── TAB: Participants ── */}
          {mainTab === 'participants' && (
            <MemberList
              members={members} club={club} user={user} isAdmin={isAdmin} isMod={isMod}
              inviteInput={inviteInput} setInviteInput={setInviteInput} inviting={inviting} invite={invite}
              changeRole={changeRole} kick={kick} ban={ban} t={t}
            />
          )}

          {/* ── TAB: Archives ── */}
          {mainTab === 'archives' && <>
            <ArchiveSection archives={archives} t={t} i18n={i18n} />
            <WishlistSection slug={slug} isMember={isMember} isAdmin={isAdmin} user={user} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
          </>}
        </div>{/* end cc-main */}

        {/* ── RIGHT RAIL ── */}
        <ClubRail
          club={club} setClub={setClub} members={members} user={user} isMember={isMember} isAdmin={isAdmin} isMod={isMod} isFull={isFull}
          myProgress={myProgress} setMyProgress={setMyProgress} saveProgress={saveProgress}
          sessions={sessions} setSessions={setSessions}
          activePoll={activePoll} setActivePoll={setActivePoll} myVote={myVote} setMyVote={setMyVote}
          votePollOption={votePollOption} closePollAction={closePollAction} openPollCreate={() => setShowPollCreate(true)}
          railOpen={railOpen} setRailOpen={setRailOpen}
          sidebarTab={sidebarTab} setSidebarTab={setSidebarTab} editForm={editForm} setEditForm={setEditForm} saving={saving} saveEdit={saveEdit}
          slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError}
          join={join} leave={leave} deleteClub={deleteClub} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
          shareClub={shareClub} openQr={openQr} inviteUrl={inviteUrl}
          reports={reports} loadReports={loadReports} handleReportAction={handleReportAction}
          setShowSessionCreate={setShowSessionCreate}
          bookSearch={bookSearch} setBookSearch={setBookSearch} bookResults={bookResults} changeBook={changeBook}
          approveMember={approveMember} rejectMember={rejectMember}
          t={t} i18n={i18n}
        />
      </div>{/* end cc-body */}

      {/* ══ FAB ══ */}
      <button className="cc-fab" onClick={() => setRailOpen(true)} aria-label="Infos du club">
        <i className="fas fa-info-circle" />
      </button>
      {railOpen && <div className="cc-rail-overlay" onClick={() => setRailOpen(false)} />}
    </div>

    {/* ══ MODALS (portals) ══ */}
    <QrModal show={showQr} inviteUrl={inviteUrl} club={club} onClose={() => setShowQr(false)} toast={toast} t={t} />
    <ReportModal reportMsg={reportMsg} onClose={() => setReportMsg(null)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
    <ForwardModal forwardMsg={forwardMsg} onClose={() => setForwardMsg(null)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} t={t} />
    <DeleteConfirmModal show={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onDelete={deleteClub} />
    <SessionCreateModal show={showSessionCreate} onClose={() => setShowSessionCreate(false)} club={club} slug={slug} socialService={socialService} setSessions={setSessions} toast={toast} handleApiError={handleApiError} t={t} />
    <PollCreateModal show={showPollCreate} onClose={() => setShowPollCreate(false)} slug={slug} socialService={socialService} toast={toast} handleApiError={handleApiError} setActivePoll={setActivePoll} setMyVote={setMyVote} t={t} />
  </>);
}
