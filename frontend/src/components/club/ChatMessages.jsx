/**
 * ChatMessages — Message list with bubbles, reactions, menus, emoji animations
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { Link } from 'react-router-dom';
import EmojiPicker from './EmojiPicker';
import {
  fmtTime, fmtDur, fmtDate, ini, isEmojiOnly,
  renderAnimatedEmojis, renderWithMentions, canEditMsg, EMOJIS,
} from './clubUtils';

export default function ChatMessages({
  messages, grouped, user, isMember, isMod, isAdmin, members, club,
  searchMatchIds, chatSearch, searchIdx,
  msgMenu, setMsgMenu, editingMsg, setEditingMsg,
  reactionPicker, setReactionPicker, replyTo, setReplyTo,
  setReportMsg, setForwardMsg, inputRef,
  handleDeleteMsg, handleEditMsg, handlePin, handleReact,
  loadingOlder, onChatScroll,
  chatRef, topSentinelRef, endRef,
  t, i18n,
  longPressRef, longPressFired,
}) {
  return (
    <div className="cc-msgs" ref={chatRef} onScroll={onChatScroll} onClick={e => { if (e.target.closest('.cc-msg__more')) return; if (msgMenu) setMsgMenu(null); if (reactionPicker) setReactionPicker(null); }}>
      <div ref={topSentinelRef} className="cc-top-sentinel">
        {loadingOlder && <div className="cc-loading-older"><i className="fas fa-spinner fa-spin" /> Chargement…</div>}
      </div>
      {messages.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty__icon"><i className="fas fa-book-reader" /></div>
          <h3>Bienvenue dans {club.name}</h3>
          <p>Les messages envoyés ici sont visibles par tous les membres du club. Commencez la discussion !</p>
        </div>
      ) : (
        grouped.map((item, idx) => {
          if (item._date) return <div key={`d${idx}`} className="cc-datesep"><span>{fmtDate(item.d, t)}</span></div>;
          const own = item.author?.id === user?.id;
          return (
            <div key={item.id} id={`msg-${item.id}`} className={`cc-msg ${own ? 'cc-msg--own' : ''} ${item.is_deleted ? 'cc-msg--deleted' : ''} ${item._consecutive ? 'cc-msg--consecutive' : ''}${searchMatchIds && searchMatchIds.has(item.id) ? ' cc-msg--search-match' : ''}`}
              onContextMenu={e => { if (isMember && !item.is_deleted) { e.preventDefault(); const bubble = e.currentTarget.querySelector('.cc-msg__bubble'); const container = chatRef.current; let menuUp = false; if (bubble && container) { const bRect = bubble.getBoundingClientRect(); const cRect = container.getBoundingClientRect(); menuUp = (bRect.bottom - cRect.top) > (cRect.height * 0.6); } setMsgMenu({id: item.id, own, canEdit: own && canEditMsg(item), menuUp}); } }}
              onTouchStart={e => { if (!isMember || item.is_deleted) return; const target = e.currentTarget; longPressFired.current = false; longPressRef.current = setTimeout(() => { longPressFired.current = true; const bubble = target.querySelector('.cc-msg__bubble'); const container = chatRef.current; let menuUp = false; if (bubble && container) { const bRect = bubble.getBoundingClientRect(); const cRect = container.getBoundingClientRect(); menuUp = (bRect.bottom - cRect.top) > (cRect.height * 0.6); } setMsgMenu({id: item.id, own, canEdit: own && canEditMsg(item), menuUp}); }, 500); }}
              onTouchEnd={() => { clearTimeout(longPressRef.current); }}
              onTouchMove={() => { clearTimeout(longPressRef.current); }}
            >
              {!own && !item._consecutive && <div className="cc-msg__av">{item.author?.profile_image ? <img src={item.author.profile_image} alt="" /> : <span>{ini(item.author?.full_name || item.author?.username)}</span>}</div>}
              <div className="cc-msg__bubble">
                {isMember && !item.is_deleted && (
                  <button className="cc-msg__more" onClick={e => {
                    e.stopPropagation(); e.nativeEvent.stopImmediatePropagation();
                    if (msgMenu?.id === item.id) { setMsgMenu(null); return; }
                    const bubble = e.currentTarget.closest('.cc-msg__bubble');
                    const container = chatRef.current;
                    let menuUp = false;
                    if (bubble && container) {
                      const bRect = bubble.getBoundingClientRect();
                      const cRect = container.getBoundingClientRect();
                      menuUp = (bRect.bottom - cRect.top) > (cRect.height * 0.6);
                    }
                    setMsgMenu({id: item.id, own, canEdit: own && canEditMsg(item), menuUp});
                  }} aria-label="Options">
                    <i className="fas fa-ellipsis-v" />
                  </button>
                )}
                {!own && !item._consecutive && <div className="cc-msg__name">{item.author?.full_name || item.author?.username || 'Membre'}</div>}
                {item.is_deleted ? (
                  <p className="cc-msg__text cc-msg__text--deleted"><i className="fas fa-ban" /> Message supprimé</p>
                ) : (
                  <>
                    {item.forwarded_from_preview && (
                      <div className="cc-msg__forwarded">
                        <i className="fas fa-share" /> {t('pages.bookClubDetail.forwardedFrom', 'Transféré depuis')} <strong>{item.forwarded_from_preview.club_name}</strong> — {item.forwarded_from_preview.author?.full_name || item.forwarded_from_preview.author?.username || ''}
                      </div>
                    )}
                    {item.reply_to_preview && !item.reply_to_preview.is_deleted && (
                      <div className="cc-msg__reply-ref" onClick={() => { const el = document.getElementById(`msg-${item.reply_to_preview.id}`); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.classList.add('cc-msg--highlight'); setTimeout(() => el.classList.remove('cc-msg--highlight'), 1500); } }}>
                        <span className="cc-msg__reply-author">{item.reply_to_preview.author?.full_name || item.reply_to_preview.author?.username || 'Membre'}</span>
                        <span className="cc-msg__reply-text">{item.reply_to_preview.message_type !== 'TEXT' ? ({VOICE: 'Note vocale', IMAGE: 'Photo', FILE: 'Fichier', QUOTE: 'Citation'}[item.reply_to_preview.message_type] || '') : item.reply_to_preview.content}</span>
                      </div>
                    )}
                    {editingMsg?.id === item.id ? (
                      <div className="cc-msg__edit">
                        <input value={editingMsg.content} onChange={e => setEditingMsg(p => ({...p, content: e.target.value}))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMsg(); } if (e.key === 'Escape') setEditingMsg(null); }} autoFocus />
                        <div className="cc-msg__edit-actions">
                          <button onClick={() => setEditingMsg(null)}><i className="fas fa-times" /></button>
                          <button onClick={handleEditMsg}><i className="fas fa-check" /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {item.message_type === 'TEXT' && (isEmojiOnly(item.content)
                          ? <p className="cc-msg__emoji-only">{renderAnimatedEmojis(item.content)}</p>
                          : <p className="cc-msg__text">{renderWithMentions(item.content, members, searchMatchIds && searchMatchIds.has(item.id) ? chatSearch : '')}</p>
                        )}
                        {item.message_type === 'QUOTE' && (
                          <div className="cc-msg__quote">
                            {item.quote_book_detail && <div className="cc-msg__quote-cover"><img src={item.quote_book_detail.cover_image} alt="" /></div>}
                            <div>
                              <div className="cc-msg__quote-text">« {item.quote_text} »</div>
                              <div className="cc-msg__quote-source">— PAGE {item.quote_page} · {(item.quote_book_detail?.title || '').toUpperCase()}</div>
                            </div>
                          </div>
                        )}
                        {item.message_type === 'IMAGE' && item.attachment_url && <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__img"><img src={item.attachment_url} alt="" /></a>}
                        {item.message_type === 'VOICE' && <div className="cc-msg__voice"><audio controls src={item.attachment_url} preload="metadata" />{item.voice_duration && <span>{fmtDur(item.voice_duration)}</span>}</div>}
                        {item.message_type === 'FILE' && item.attachment_url && <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__file"><i className="fas fa-file-alt" /><span>{item.attachment_name || 'Fichier'}</span><i className="fas fa-download cc-msg__dl" /></a>}
                      </>
                    )}
                    <div className="cc-msg__footer">
                      {item.is_pinned && <i className="fas fa-thumbtack cc-msg__pin-icon" />}
                      <time className="cc-msg__time">{fmtTime(item.created_at, i18n.language)}</time>
                      {item.edited_at && <span className="cc-msg__edited">modifié</span>}
                    </div>
                  </>
                )}
                {msgMenu?.id === item.id && (
                  <div className={`cc-msg__menu${msgMenu.menuUp ? ' cc-msg__menu--up' : ''}`} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setReplyTo({id: item.id, author: item.author, content: item.content, message_type: item.message_type}); setMsgMenu(null); inputRef.current?.focus(); }}><i className="fas fa-reply" /> Répondre</button>
                    {msgMenu.canEdit && <button onClick={() => { setEditingMsg({id: item.id, content: item.content}); setMsgMenu(null); }}><i className="fas fa-pen" /> Modifier</button>}
                    <button onClick={() => { setReactionPicker(item.id); setMsgMenu(null); }}><i className="fas fa-smile" /> Réagir</button>
                    {isMod && <button onClick={() => handlePin(item.id)}><i className="fas fa-thumbtack" /> {item.is_pinned ? 'Désépingler' : 'Épingler'}</button>}
                    {(own || isMod) && <button className="cc-msg__menu-delete" onClick={() => handleDeleteMsg(item.id)}><i className="fas fa-trash" /> Supprimer</button>}
                    <button onClick={() => { setForwardMsg(item); setMsgMenu(null); }}><i className="fas fa-share" /> Transférer</button>
                    {!own && <button onClick={() => { setReportMsg(item); setMsgMenu(null); }}><i className="fas fa-flag" /> Signaler</button>}
                  </div>
                )}
                {reactionPicker === item.id && (
                  <div className="cc-msg__react-picker" onClick={e => e.stopPropagation()}>
                    {EMOJIS.map(em => <button key={em} onClick={() => handleReact(item.id, em)}>{em}</button>)}
                    <button className="cc-msg__react-more" onClick={() => setReactionPicker(`full-${item.id}`)}>+</button>
                  </div>
                )}
                {reactionPicker === `full-${item.id}` && (
                  <div className="cc-msg__react-full" onClick={e => e.stopPropagation()}>
                    <EmojiPicker onSelect={e => handleReact(item.id, e.native)} />
                  </div>
                )}
              </div>
              {item.reactions_summary?.length > 0 && (
                <div className={`cc-msg__reactions ${own ? 'cc-msg__reactions--own' : ''}`}>
                  {item.reactions_summary.map(r => (
                    <button key={r.emoji} className={`cc-msg__reaction ${r.reacted_by_me ? 'cc-msg__reaction--mine' : ''}`} onClick={() => handleReact(item.id, r.emoji)}>
                      {r.emoji} <span>{r.count}</span>
                    </button>
                  ))}
                  <button className="cc-msg__reaction cc-msg__reaction--add" onClick={() => setReactionPicker(reactionPicker === item.id ? null : item.id)}>+</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
