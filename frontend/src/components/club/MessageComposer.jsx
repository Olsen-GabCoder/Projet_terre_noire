/**
 * MessageComposer — Chat input bar with emoji, voice, file upload, mentions
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';
import { fmtDur, ini } from './clubUtils';
import aiService from '../../services/aiService';

export default function MessageComposer({
  slug, user, isMember, isFull, club, members,
  messages, setMessages,
  replyTo, setReplyTo,
  typingUsers,
  wsConnected, sendWsEvent,
  t, inputRef,
  socialService, toast, handleApiError,
}) {
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [moderationWarn, setModerationWarn] = useState(null);
  const [isRec, setIsRec] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const lastTypingRef = useRef(0);

  // Typing is WebSocket-only — no HTTP fallback
  const emitTyping = useCallback(() => {
    if (!wsConnected || !sendWsEvent) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    sendWsEvent({ type: 'typing' });
  }, [wsConnected, sendWsEvent]);

  // Send text (with AI moderation)
  const send = async e => {
    e.preventDefault(); if (!msgText.trim()) return; setSending(true);
    setModerationWarn(null);

    // AI moderation check — non-blocking on failure
    try {
      const mod = await aiService.moderate(msgText, club?.name || '');
      if (mod.severity === 'block') {
        setModerationWarn(mod.reason || 'Ce message ne respecte pas les règles du club.');
        setSending(false);
        return;
      }
      if (mod.severity === 'warning') {
        setModerationWarn(mod.reason || 'Attention : ce message pourrait être perçu comme inapproprié.');
      }
    } catch {
      // Si l'IA est indisponible, on laisse passer
    }

    const payload = {content: msgText, message_type: 'TEXT'};
    if (replyTo) payload.reply_to = replyTo.id;
    try {
      const r = await socialService.sendClubMessage(slug, payload);
      setMessages(p => p.some(m => m.id === r.data.id) ? p : [...p, r.data]); setMsgText(''); setReplyTo(null); setShowEmoji(false); setModerationWarn(null);
      if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus(); }
    } catch { toast.error('Erreur.'); }
    setSending(false);
  };

  // Mention autocomplete
  const onMsgChange = e => {
    const val = e.target.value;
    setMsgText(val);
    if (val.trim()) emitTyping();
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setMentionQuery(q);
      const filtered = members.filter(m => {
        const name = (m.user?.full_name || '').toLowerCase();
        const uname = (m.user?.username || '').toLowerCase();
        return (name.includes(q) || uname.includes(q)) && m.user?.id !== user?.id;
      }).slice(0, 6);
      setMentionResults(filtered);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (member) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const before = msgText.slice(0, cursor);
    const after = msgText.slice(cursor);
    const prefix = before.replace(/@\w*$/, '');
    const username = member.user?.username || '';
    const newText = `${prefix}@${username} ${after}`;
    setMsgText(newText);
    setMentionQuery(null);
    setMentionResults([]);
    setTimeout(() => { const pos = prefix.length + username.length + 2; textarea.setSelectionRange(pos, pos); textarea.focus(); }, 0);
  };

  const onMsgKeyDown = e => {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionResults.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionResults.length) % mentionResults.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIdx]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
  };

  // Send file
  const uploadFile = async (file, type) => {
    const fd = new FormData(); fd.append('message_type', type); fd.append('attachment', file); fd.append('attachment_name', file.name); fd.append('content', '');
    try { const r = await socialService.sendClubMessage(slug, fd); setMessages(p => p.some(m => m.id === r.data.id) ? p : [...p, r.data]); } catch { toast.error('Erreur fichier.'); }
  };

  // Insert emoji
  const insertEmoji = em => { setMsgText(p => p + em); inputRef.current?.focus(); };

  // Voice recording
  const startRec = async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const mr = new MediaRecorder(stream); chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (cancelledRef.current) { chunksRef.current = []; setRecTime(0); return; }
        const duration = recTime;
        const blob = new Blob(chunksRef.current, {type: 'audio/webm'});
        if (blob.size === 0 || duration < 1) { setRecTime(0); return; }
        const file = new File([blob], `voice-${Date.now()}.webm`, {type: 'audio/webm'});
        const fd = new FormData(); fd.append('message_type', 'VOICE'); fd.append('attachment', file); fd.append('attachment_name', file.name); fd.append('voice_duration', duration); fd.append('content', '');
        try { const r = await socialService.sendClubMessage(slug, fd); setMessages(p => p.some(m => m.id === r.data.id) ? p : [...p, r.data]); } catch {} setRecTime(0);
      };
      recRef.current = mr; mr.start(); setIsRec(true); setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch { toast.error('Micro inaccessible.'); }
  };
  const stopRec = () => { if (recRef.current && isRec) { cancelledRef.current = false; recRef.current.stop(); setIsRec(false); clearInterval(timerRef.current); } };
  const cancelRec = () => { if (recRef.current && isRec) { cancelledRef.current = true; recRef.current.stop(); setIsRec(false); setRecTime(0); clearInterval(timerRef.current); chunksRef.current = []; } };

  if (!isMember) {
    return (
      <div className="cc-joinbar">
        {user ? (isFull
          ? <><span>{t('pages.bookClubDetail.clubFullMessage', 'Ce club a atteint sa limite de membres')}</span><button disabled className="cc-btn--disabled"><i className="fas fa-lock" /> {t('pages.bookClubDetail.clubFull', 'Complet')}</button></>
          : <><span>Rejoignez le club pour discuter</span></>
        ) : <><span>Connectez-vous pour participer</span></>}
      </div>
    );
  }

  const typingNames = (typingUsers || []).map(u => u.name);

  return (
    <>
      {typingNames.length > 0 && (
        <div className="cc-typing">
          <span className="cc-typing__dots"><span /><span /><span /></span>
          <span className="cc-typing__text">
            {typingNames.length === 1
              ? t('pages.bookClubDetail.typingOne', '{{name}} écrit...', { name: typingNames[0] })
              : t('pages.bookClubDetail.typingSeveral', '{{count}} personnes écrivent...', { count: typingNames.length })}
          </span>
        </div>
      )}
      {showEmoji && (
        <div className="cc-picker">
          <EmojiPicker onSelect={e => insertEmoji(e.native)} />
        </div>
      )}
      {moderationWarn && (
        <div className="cc-moderation-warn">
          <i className="fas fa-shield-alt" />
          <span>{moderationWarn}</span>
          <button type="button" onClick={() => setModerationWarn(null)} aria-label="Fermer"><i className="fas fa-times" /></button>
        </div>
      )}
      <div className="cc-bar">
        {isRec ? (
          <div className="cc-bar__rec">
            <button className="cc-bar__rec-cancel" onClick={cancelRec}><i className="fas fa-trash-alt" /></button>
            <div className="cc-bar__rec-wave"><span className="cc-bar__rec-dot" /><span className="cc-bar__rec-time">{fmtDur(recTime)}</span></div>
            <button className="cc-bar__rec-send" onClick={stopRec}><i className="fas fa-paper-plane" /></button>
          </div>
        ) : (
          <form onSubmit={send} className="cc-bar__form">
            {replyTo && (
              <div className="cc-bar__reply-preview">
                <div className="cc-bar__reply-info">
                  <i className="fas fa-reply" />
                  <span className="cc-bar__reply-author">{replyTo.author?.full_name || replyTo.author?.username || 'Membre'}</span>
                  <span className="cc-bar__reply-text">{replyTo.message_type !== 'TEXT' ? ({VOICE: 'Note vocale', IMAGE: 'Photo', FILE: 'Fichier', QUOTE: 'Citation'}[replyTo.message_type] || '') : replyTo.content?.slice(0, 80)}</span>
                </div>
                <button type="button" className="cc-bar__reply-close" onClick={() => setReplyTo(null)}><i className="fas fa-times" /></button>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display: 'none'}} onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0], 'IMAGE'); e.target.value = ''; }} />
            <input ref={fileRef} type="file" style={{display: 'none'}} onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0], 'FILE'); e.target.value = ''; }} />
            <div className="cc-bar__row">
              <div className="cc-bar__tools">
                <button type="button" className="cc-bar__icon" onClick={() => setShowEmoji(p => !p)} title="Emoji"><i className="fas fa-smile" /></button>
                <button type="button" className="cc-bar__icon" onClick={() => imgRef.current?.click()} title="Image"><i className="fas fa-image" /></button>
                <button type="button" className="cc-bar__icon" onClick={() => fileRef.current?.click()} title="Fichier"><i className="fas fa-paperclip" /></button>
              </div>
              <div className="cc-bar__input-wrap">
                {mentionResults.length > 0 && (
                  <div className="cc-mention-dropdown">
                    {mentionResults.map((m, i) => (
                      <button key={m.id} className={`cc-mention-item${i === mentionIdx ? ' cc-mention-item--active' : ''}`} onMouseDown={e => { e.preventDefault(); insertMention(m); }}>
                        <div className="cc-mention-item__av">{m.user?.profile_image ? <img src={m.user.profile_image} alt="" /> : <span>{ini(m.user?.full_name || m.user?.username)}</span>}</div>
                        <div className="cc-mention-item__info"><strong>{m.user?.full_name || m.user?.username}</strong><span>@{m.user?.username}</span></div>
                      </button>
                    ))}
                  </div>
                )}
                <textarea ref={inputRef} className="cc-bar__input" value={msgText} onChange={e => { onMsgChange(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }} placeholder={t('pages.bookClubDetail.yourContribution')} disabled={sending} rows={1} onFocus={() => setShowEmoji(false)} onKeyDown={onMsgKeyDown} />
              </div>
              <button type="button" className="cc-bar__icon" onClick={startRec} title="Vocal"><i className="fas fa-microphone" /></button>
              <button type="submit" className="cc-bar__send" disabled={sending || !msgText.trim()}><i className="fas fa-paper-plane" /></button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
