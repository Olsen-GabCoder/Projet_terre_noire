import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/ClubChat.css';

const CAT_KEYS = { GENERAL:'pages.bookClubDetail.cat.general',ROMAN:'pages.bookClubDetail.cat.novels',POESIE:'pages.bookClubDetail.cat.poetry',ESSAI:'pages.bookClubDetail.cat.essays',JEUNESSE:'pages.bookClubDetail.cat.youth',SF_FANTASY:'pages.bookClubDetail.cat.sfFantasy',POLAR:'pages.bookClubDetail.cat.thriller',BD_MANGA:'pages.bookClubDetail.cat.comics',CLASSIQUES:'pages.bookClubDetail.cat.classics',AFRICAIN:'pages.bookClubDetail.cat.african',DEVELOPPEMENT:'pages.bookClubDetail.cat.selfHelp',AUTRE:'pages.bookClubDetail.cat.other' };
const EMOJIS = ['👍','❤️','😂','😮','📖','🔥','👏','💡','🎉','✨','😊','🤔','📚','✅','💬'];
const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]{1,12}$/u;
const isEmojiOnly = (text) => text && EMOJI_ONLY_RE.test(text.trim()) && text.trim().length <= 12;

const STICKER_PACKS = [
  { name: 'Lecture', icon: '📖', stickers: ['📖✨','📚💫','🤓👆','😴📖','☕📚','🏆📖','📖❤️','🤯📚','📝💡','🎧📖'] },
  { name: 'Réactions', icon: '😄', stickers: ['🎉🎊','👏👏👏','🔥🔥🔥','💯','❤️‍🔥','🥳🎈','😂🤣','🙌✨','💪🏾','🫡'] },
  { name: 'Afrique', icon: '🌍', stickers: ['🌍📚','☀️🌴','🥁🎶','🫶🏾','✊🏾','🌺','🦁','🏠📖','🍵📖','🌙✨'] },
];

const EMOJI_CATEGORIES = [
  { name:'Fréquents', icon:'🕐', emojis:['👍','❤️','😂','😮','🔥','👏','🎉','✨','😊','🤔','💯','🙏','😍','🥰','💪'] },
  { name:'Visages', icon:'😀', emojis:['😀','😃','😄','😁','😆','🥹','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','🤪','😜','🤑','🤗','🤭','🫢','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { name:'Gestes', icon:'👋', emojis:['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','💪','🫶🏾','✊🏾','👏🏾','🙌🏾','💪🏾'] },
  { name:'Livres', icon:'📚', emojis:['📖','📚','📕','📗','📘','📙','📓','📒','📃','📝','✏️','🖊️','🖋️','✒️','📎','🔖','🏷️','📑','🗒️','📰','🗞️','💡','🎓','🏫','🧠','💭','📜'] },
  { name:'Nature', icon:'🌿', emojis:['🌍','🌎','🌏','🌺','🌸','🌼','🌻','🌹','🌷','🪻','🌱','🌿','☘️','🍀','🌴','🌳','🌲','🍃','🍂','🍁','🌾','☀️','🌤️','⛅','🌈','🌙','⭐','✨','🌟','💫'] },
  { name:'Nourriture', icon:'☕', emojis:['☕','🍵','🧃','🥤','🍶','🍷','🍺','🥂','🍰','🎂','🍫','🍬','🍭','🍩','🍪','🥐','🍞','🥖','🥨','🧀','🍕','🍔','🍟','🌮','🍜','🍲','🥘','🍛'] },
  { name:'Activités', icon:'🎉', emojis:['🎉','🎊','🎈','🎀','🎁','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎵','🎶','🎤','🎧','🎸','🎹','🥁','🎬','🎨','🎭','🎪','🎯','🎲','🧩','♟️','🎮'] },
  { name:'Symboles', icon:'❤️', emojis:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','✅','❌','❓','❗','‼️','⁉️','💬','💭','🗯️','💤'] },
];

function EmojiPicker({onSelect}){
  const [cat,setCat]=useState(0);
  const [search,setSearch]=useState('');
  const gridRef=useRef(null);
  const filtered=search
    ?EMOJI_CATEGORIES.flatMap(c=>c.emojis).filter(e=>e.includes(search))
    :EMOJI_CATEGORIES[cat].emojis;
  const switchCat=(i)=>{
    setCat(i);
    setSearch('');
    if(gridRef.current)gridRef.current.scrollTop=0;
  };
  return(
    <div className="cc-epicker">
      <div className="cc-epicker__search">
        <input value={search} onChange={e=>{setSearch(e.target.value);if(gridRef.current)gridRef.current.scrollTop=0;}} placeholder="Rechercher un emoji..."/>
      </div>
      <div className="cc-epicker__cats">
        {EMOJI_CATEGORIES.map((c,i)=>(
          <button key={c.name} className={`cc-epicker__cat${!search&&i===cat?' cc-epicker__cat--active':''}`} onClick={()=>switchCat(i)} title={c.name}>{c.icon}</button>
        ))}
      </div>
      <div className="cc-epicker__label">{search?`Résultats pour « ${search} »`:EMOJI_CATEGORIES[cat].name}</div>
      <div className="cc-epicker__grid" ref={gridRef}>
        {filtered.length>0?filtered.map((em,i)=>(
          <button key={`${cat}-${em}-${i}`} className="cc-epicker__em" onClick={()=>onSelect({native:em})}>{em}</button>
        )):<div className="cc-epicker__empty">Aucun résultat</div>}
      </div>
    </div>
  );
}

const fmtTime = (d, lng) => new Date(d).toLocaleTimeString(lng === 'en' ? 'en-US' : 'fr-FR',{hour:'2-digit',minute:'2-digit'});
const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const ini = n => (n||'?')[0].toUpperCase();
const MENTION_RE = /@(\w+)/g;
function highlightSearch(text, term) {
  if (!term || !text) return [text];
  const parts = [];
  const lower = text.toLowerCase();
  const tLower = term.toLowerCase();
  let last = 0, idx;
  while ((idx = lower.indexOf(tLower, last)) !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(<mark key={idx} className="cc-search-hl">{text.slice(idx, idx + term.length)}</mark>);
    last = idx + term.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function renderWithMentions(text, membersList, searchTerm) {
  if (!text) return text;
  // Step 1: split by mentions
  const parts = [];
  let last = 0;
  const memberMap = {};
  if (membersList) membersList.forEach(m => { if (m.user) memberMap[m.user.username] = m.user.id; });
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index > last) parts.push({type:'text', value: text.slice(last, m.index)});
    const username = m[1];
    const userId = memberMap[username];
    parts.push({type:'mention', username, userId, index: m.index});
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({type:'text', value: text.slice(last)});
  if (parts.length === 0) parts.push({type:'text', value: text});
  // Step 2: render with search highlight on text parts
  return parts.map((p, i) => {
    if (p.type === 'mention') {
      return p.userId
        ? <Link key={i} to={`/profile/${p.userId}`} className="cc-mention" onClick={e=>e.stopPropagation()}>@{p.username}</Link>
        : <span key={i} className="cc-mention">@{p.username}</span>;
    }
    // text part — apply search highlight
    if (searchTerm) return <span key={i}>{highlightSearch(p.value, searchTerm)}</span>;
    return p.value;
  });
}

function fmtDate(d, t) {
  const dt=new Date(d),now=new Date();
  if(dt.toDateString()===now.toDateString()) return t('pages.bookClubDetail.today');
  const y=new Date(now);y.setDate(now.getDate()-1);
  if(dt.toDateString()===y.toDateString()) return t('pages.bookClubDetail.yesterday');
  return dt.toLocaleDateString(t('common.locale', { defaultValue: 'fr-FR' }),{day:'numeric',month:'long',year:'numeric'});
}

function groupByDate(msgs) {
  const out=[];let lastDate='',lastAuthor=null;
  for(let i=0;i<msgs.length;i++){
    const m=msgs[i];
    const d=new Date(m.created_at).toDateString();
    if(d!==lastDate){out.push({_date:true,d:m.created_at});lastDate=d;lastAuthor=null;}
    // Marquer si c'est un message consécutif du même auteur (masquer avatar+nom)
    const sameAuthor=m.author?.id===lastAuthor && !m.is_deleted;
    out.push({...m,_consecutive:sameAuthor});
    lastAuthor=m.is_deleted?null:m.author?.id;
  }
  return out;
}

export default function BookClubDetail() {
  const { t, i18n }=useTranslation();
  const {slug}=useParams();
  const {user}=useAuth();
  const [club,setClub]=useState(null);
  const [messages,setMessages]=useState([]);
  const [members,setMembers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [isMember,setIsMember]=useState(false);
  const [railOpen,setRailOpen]=useState(false);
  const [sidebarTab,setSidebarTab]=useState('info'); // info | members | media | edit
  const [media,setMedia]=useState(null);
  const [inviteInput,setInviteInput]=useState('');
  const [inviting,setInviting]=useState(false);
  const [showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const [editForm,setEditForm]=useState(null);
  const [saving,setSaving]=useState(false);
  const [bookSearch,setBookSearch]=useState('');
  const [bookResults,setBookResults]=useState([]);

  const [msgText,setMsgText]=useState('');
  const [sending,setSending]=useState(false);
  const [showEmoji,setShowEmoji]=useState(false);
  const [pickerTab,setPickerTab]=useState('emoji'); // 'emoji' | 'stickers'
  const [showScrollBtn,setShowScrollBtn]=useState(false);
  const [msgMenu,setMsgMenu]=useState(null); // {id, own, canEdit}
  const [editingMsg,setEditingMsg]=useState(null); // {id, content}
  const [replyTo,setReplyTo]=useState(null); // {id, author, content, message_type}
  const [reportMsg,setReportMsg]=useState(null); // message to report
  const [reportReason,setReportReason]=useState('');
  const [reportDetails,setReportDetails]=useState('');
  const [reportSending,setReportSending]=useState(false);
  const [reports,setReports]=useState([]); // admin: list of reports
  const [inviteUrl,setInviteUrl]=useState(null); // generated invite link for QR
  const [showQr,setShowQr]=useState(false);
  const [mentionQuery,setMentionQuery]=useState(null); // string or null
  const [mentionResults,setMentionResults]=useState([]);
  const [mentionIdx,setMentionIdx]=useState(0); // keyboard nav index
  const [myProgress,setMyProgress]=useState(0);
  const [activePoll,setActivePoll]=useState(null);
  const [mainTab,setMainTab]=useState('discussion'); // discussion | passages | participants | archives
  const [sessions,setSessions]=useState([]);
  const [archives,setArchives]=useState([]);
  const [pollBookSearch,setPollBookSearch]=useState('');
  const [pollBookResults,setPollBookResults]=useState([]);
  const [chatSearch,setChatSearch]=useState('');
  const [showSearch,setShowSearch]=useState(false);
  // chatSearchResults removed — search now highlights in-place via searchMatchIds
  const [pinnedIdx,setPinnedIdx]=useState(0);
  const [loadingOlder,setLoadingOlder]=useState(false);
  const [hasMore,setHasMore]=useState(true);
  const topSentinelRef=useRef(null);
  const endRef=useRef(null);
  const chatRef=useRef(null);
  const fileRef=useRef(null);
  const imgRef=useRef(null);
  const inputRef=useRef(null);

  // Voice
  const [isRec,setIsRec]=useState(false);
  const [recTime,setRecTime]=useState(0);
  const recRef=useRef(null);
  const chunksRef=useRef([]);
  const timerRef=useRef(null);

  // Load
  useEffect(()=>{(async()=>{try{
    const r=await socialService.getClub(slug);setClub(r.data);setIsMember(r.data.user_is_member);
    if(r.data.my_progress!==undefined) setMyProgress(r.data.my_progress);
    const [m,mb]=await Promise.all([socialService.getClubMessages(slug),socialService.getClubMembers(slug)]);
    setMessages(Array.isArray(m.data)?m.data:m.data.results||[]);
    setMembers(Array.isArray(mb.data)?mb.data:mb.data.results||[]);
    // Marquer comme lu à l'ouverture du chat
    if(r.data.user_is_member) socialService.markClubRead(slug).catch(()=>{});
    // Charger le vote actif
    try{const p=await socialService.getPolls(slug);const polls=Array.isArray(p.data)?p.data:[];const open=polls.find(x=>x.status==='OPEN');if(open)setActivePoll(open);}catch{}
    // Charger sessions et archives
    try{const s=await socialService.getClubSessions(slug);setSessions(Array.isArray(s.data)?s.data:[]);}catch{}
    try{const a=await socialService.getClubArchives(slug);setArchives(Array.isArray(a.data)?a.data:[]);}catch{}
  }catch(e){setError(handleApiError(e));}setLoading(false);})();},[slug]);

  // Auto-scroll
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  // Scroll button
  const onChatScroll=useCallback(()=>{
    if(!chatRef.current)return;
    const{scrollTop,scrollHeight,clientHeight}=chatRef.current;
    setShowScrollBtn(scrollHeight-scrollTop-clientHeight>200);
  },[]);

  const scrollToBottom=()=>endRef.current?.scrollIntoView({behavior:'smooth'});

  // Delete message
  const handleDeleteMsg=async(msgId)=>{
    try{
      await socialService.deleteClubMessage(slug,msgId);
      setMessages(prev=>prev.map(m=>m.id===msgId?{...m,is_deleted:true,content:''}:m));
    }catch{}
    setMsgMenu(null);
  };

  // Edit message
  const handleEditMsg=async()=>{
    if(!editingMsg||!editingMsg.content.trim())return;
    try{
      const r=await socialService.editClubMessage(slug,editingMsg.id,editingMsg.content.trim());
      setMessages(prev=>prev.map(m=>m.id===editingMsg.id?{...m,content:r.data.content,edited_at:r.data.edited_at}:m));
    }catch(e){toast.error(handleApiError(e));}
    setEditingMsg(null);
  };

  // Load older messages (scroll up)
  const loadOlderMessages=useCallback(async()=>{
    if(loadingOlder||!hasMore||messages.length===0)return;
    setLoadingOlder(true);
    try{
      const firstId=messages[0].id;
      const r=await socialService.getOlderClubMessages(slug,firstId,30);
      const older=r.data.results||[];
      if(older.length>0){
        // Maintenir la position de scroll
        const container=chatRef.current;
        const prevHeight=container?.scrollHeight||0;
        setMessages(prev=>[...older,...prev]);
        // Après le render, restaurer la position
        requestAnimationFrame(()=>{
          if(container){container.scrollTop=container.scrollHeight-prevHeight;}
        });
      }
      setHasMore(r.data.has_more!==false && older.length===30);
    }catch{}
    setLoadingOlder(false);
  },[loadingOlder,hasMore,messages,slug]);

  // Intersection Observer pour le scroll infini vers le haut
  useEffect(()=>{
    if(!topSentinelRef.current||!isMember)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting)loadOlderMessages();
    },{root:chatRef.current,threshold:0.1});
    observer.observe(topSentinelRef.current);
    return()=>observer.disconnect();
  },[loadOlderMessages,isMember]);

  // Pin message
  const handlePin=async(msgId)=>{
    try{
      const r=await socialService.pinMessage(slug,msgId);
      setMessages(prev=>prev.map(m=>m.id===msgId?{...m,is_pinned:r.data.is_pinned}:m));
    }catch(e){toast.error(handleApiError(e));}
    setMsgMenu(null);
  };

  // Report message
  const submitReport=async()=>{
    if(!reportMsg||!reportReason)return;
    setReportSending(true);
    try{
      await socialService.reportMessage(slug,reportMsg.id,{reason:reportReason,details:reportDetails});
      toast.success(t('pages.bookClubDetail.reportSent','Signalement envoyé'));
    }catch(e){
      const msg=e.response?.status===409?t('pages.bookClubDetail.alreadyReported','Déjà signalé'):handleApiError(e);
      toast.error(msg);
    }
    setReportMsg(null);setReportReason('');setReportDetails('');setReportSending(false);
  };
  // Load reports (admin)
  const loadReports=async()=>{
    try{const r=await socialService.getReports(slug,{status:'PENDING'});setReports(Array.isArray(r.data)?r.data:[]);}catch{}
  };
  const handleReportAction=async(reportId,newStatus)=>{
    try{await socialService.updateReport(slug,reportId,{status:newStatus});setReports(p=>p.filter(r=>r.id!==reportId));toast.success(newStatus==='REVIEWED'?'Signalement traité':'Signalement rejeté');}catch{}
  };

  // Search messages — highlight in-place, no layout change
  const [searchMatchIds,setSearchMatchIds]=useState(null); // Set of ids or null
  const [searchIdx,setSearchIdx]=useState(0);
  const doSearch=async()=>{
    if(!chatSearch.trim()){setSearchMatchIds(null);return;}
    try{
      const r=await socialService.searchMessages(slug,chatSearch.trim());
      const results=Array.isArray(r.data)?r.data:r.data?.results||[];
      const ids=new Set(results.map(m=>m.id));
      setSearchMatchIds(ids);
      setSearchIdx(0);
      // Scroll to first match
      if(results.length>0){
        const el=document.getElementById(`msg-${results[0].id}`);
        if(el){el.scrollIntoView({behavior:'smooth',block:'center'});}
      }
    }catch{setSearchMatchIds(new Set());}
  };
  const searchMatchArr=searchMatchIds?messages.filter(m=>searchMatchIds.has(m.id)):[];
  const navigateSearch=(dir)=>{
    if(!searchMatchArr.length)return;
    const next=(searchIdx+dir+searchMatchArr.length)%searchMatchArr.length;
    setSearchIdx(next);
    const el=document.getElementById(`msg-${searchMatchArr[next].id}`);
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});}
  };
  const clearSearch=()=>{setChatSearch('');setSearchMatchIds(null);setSearchIdx(0);setShowSearch(false);};

  // Poll actions
  const createPoll=async()=>{
    try{const r=await socialService.createPoll(slug);setActivePoll(r.data);}catch{}
  };
  const addPollBook=async(bookId)=>{
    if(!activePoll)return;
    try{const r=await socialService.addPollOption(slug,activePoll.id,bookId);setActivePoll(r.data);setPollBookSearch('');setPollBookResults([]);}catch{}
  };
  const votePollOption=async(optionId)=>{
    if(!activePoll)return;
    try{const r=await socialService.votePoll(slug,activePoll.id,optionId);setActivePoll(r.data.poll);}catch{}
  };
  const closePollAction=async()=>{
    if(!activePoll)return;
    try{const r=await socialService.closePoll(slug,activePoll.id);setActivePoll(null);
      if(r.data.winner){const cr=await socialService.getClub(slug);setClub(cr.data);}
    }catch{}
  };
  // Debounced book search for poll
  useEffect(()=>{
    if(pollBookSearch.length<2){setPollBookResults([]);return;}
    const t=setTimeout(async()=>{try{
      const bs=await import('../services/bookService');
      const r=await bs.default.searchBooks(pollBookSearch);
      setPollBookResults(Array.isArray(r.data)?r.data.slice(0,5):r.data?.results?.slice(0,5)||[]);
    }catch{}},400);
    return()=>clearTimeout(t);
  },[pollBookSearch]);

  // Update reading progress
  const saveProgress=async(val)=>{
    setMyProgress(val);
    try{await socialService.updateReadingProgress(slug,val);}catch{}
  };

  // React to message
  const [reactionPicker,setReactionPicker]=useState(null); // msg id
  const handleReact=async(msgId,emoji)=>{
    try{
      const r=await socialService.reactToMessage(slug,msgId,emoji);
      setMessages(prev=>prev.map(m=>m.id===msgId?{...m,reactions_summary:r.data.reactions_summary}:m));
    }catch{}
    setReactionPicker(null);
  };

  // Check if message is editable (TEXT + not deleted)
  const canEditMsg=(msg)=>{
    if(msg.message_type!=='TEXT'||msg.is_deleted)return false;
    return true;
  };

  // Polling
  useEffect(()=>{
    if(!club||!isMember)return;
    const iv=setInterval(async()=>{try{
      const last=messages.length?messages[messages.length-1].id:0;
      const r=await socialService.getNewClubMessages(slug,last);
      const n=Array.isArray(r.data)?r.data:[];
      if(n.length)setMessages(p=>[...p,...n]);
    }catch{}},4000);
    return()=>clearInterval(iv);
  },[club,isMember,slug,messages]);

  // Send text
  const send=async e=>{
    e.preventDefault();if(!msgText.trim())return;setSending(true);
    const payload={content:msgText,message_type:'TEXT'};
    if(replyTo)payload.reply_to=replyTo.id;
    try{const r=await socialService.sendClubMessage(slug,payload);setMessages(p=>[...p,r.data]);setMsgText('');setReplyTo(null);setShowEmoji(false);inputRef.current?.focus();}
    catch{toast.error('Erreur.');}setSending(false);
  };

  // Mention autocomplete logic
  const onMsgChange=e=>{
    const val=e.target.value;
    setMsgText(val);
    const cursor=e.target.selectionStart;
    const before=val.slice(0,cursor);
    const match=before.match(/@(\w*)$/);
    if(match){
      const q=match[1].toLowerCase();
      setMentionQuery(q);
      const filtered=members.filter(m=>{
        const name=(m.user?.full_name||'').toLowerCase();
        const uname=(m.user?.username||'').toLowerCase();
        return (name.includes(q)||uname.includes(q))&&m.user?.id!==user?.id;
      }).slice(0,6);
      setMentionResults(filtered);
      setMentionIdx(0);
    }else{
      setMentionQuery(null);
      setMentionResults([]);
    }
  };
  const insertMention=(member)=>{
    const textarea=inputRef.current;
    if(!textarea)return;
    const cursor=textarea.selectionStart;
    const before=msgText.slice(0,cursor);
    const after=msgText.slice(cursor);
    const prefix=before.replace(/@\w*$/,'');
    const username=member.user?.username||'';
    const newText=`${prefix}@${username} ${after}`;
    setMsgText(newText);
    setMentionQuery(null);
    setMentionResults([]);
    setTimeout(()=>{const pos=prefix.length+username.length+2;textarea.setSelectionRange(pos,pos);textarea.focus();},0);
  };
  const onMsgKeyDown=e=>{
    if(mentionResults.length>0){
      if(e.key==='ArrowDown'){e.preventDefault();setMentionIdx(i=>(i+1)%mentionResults.length);return;}
      if(e.key==='ArrowUp'){e.preventDefault();setMentionIdx(i=>(i-1+mentionResults.length)%mentionResults.length);return;}
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();insertMention(mentionResults[mentionIdx]);return;}
      if(e.key==='Escape'){setMentionQuery(null);setMentionResults([]);return;}
    }
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e);}
  };

  // Send file
  const uploadFile=async(file,type)=>{
    const fd=new FormData();fd.append('message_type',type);fd.append('attachment',file);fd.append('attachment_name',file.name);fd.append('content','');
    try{const r=await socialService.sendClubMessage(slug,fd);setMessages(p=>[...p,r.data]);}catch{toast.error('Erreur fichier.');}
  };

  // Emoji
  const insertEmoji=em=>{setMsgText(p=>p+em);inputRef.current?.focus();};

  // Voice
  const cancelledRef=useRef(false);
  const startRec=async()=>{try{
    cancelledRef.current=false;
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mr=new MediaRecorder(stream);chunksRef.current=[];
    mr.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data);};
    mr.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(cancelledRef.current){chunksRef.current=[];setRecTime(0);return;}
      const duration=recTime;
      const blob=new Blob(chunksRef.current,{type:'audio/webm'});
      if(blob.size===0||duration<1){setRecTime(0);return;}
      const file=new File([blob],`voice-${Date.now()}.webm`,{type:'audio/webm'});
      const fd=new FormData();fd.append('message_type','VOICE');fd.append('attachment',file);fd.append('attachment_name',file.name);fd.append('voice_duration',duration);fd.append('content','');
      try{const r=await socialService.sendClubMessage(slug,fd);setMessages(p=>[...p,r.data]);}catch{}setRecTime(0);
    };
    recRef.current=mr;mr.start();setIsRec(true);setRecTime(0);
    timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000);
  }catch{toast.error('Micro inaccessible.');}};
  const stopRec=()=>{if(recRef.current&&isRec){cancelledRef.current=false;recRef.current.stop();setIsRec(false);clearInterval(timerRef.current);}};
  const cancelRec=()=>{if(recRef.current&&isRec){cancelledRef.current=true;recRef.current.stop();setIsRec(false);setRecTime(0);clearInterval(timerRef.current);chunksRef.current=[];}};

  // Join/leave
  const join=async()=>{try{const res=await socialService.joinClub(slug);if(res.status===202){toast.success(t('pages.bookClubDetail.pendingSent','Demande envoyée ! En attente d\'approbation.'));}else{setIsMember(true);toast.success('Bienvenue !');const r=await socialService.getClubMembers(slug);setMembers(Array.isArray(r.data)?r.data:r.data.results||[]);}}catch(e){toast.error(handleApiError(e));}};
  const leave=async()=>{try{await socialService.leaveClub(slug);setIsMember(false);toast.success('Vous avez quitté le club.');}catch(e){toast.error(handleApiError(e));}};

  const isAdmin=club&&user&&(club.creator?.id===user.id||members.some(m=>m.user?.id===user.id&&m.role==='ADMIN'));
  const isMod=isAdmin||(club&&user&&members.some(m=>m.user?.id===user.id&&m.role==='MODERATOR'));
  const isFull=club&&club.max_members&&members.length>=club.max_members;

  const reloadMembers=async()=>{const r=await socialService.getClubMembers(slug);setMembers(Array.isArray(r.data)?r.data:r.data.results||[]);};

  const changeRole=async(memberId,role)=>{try{await socialService.updateMemberRole(slug,memberId,role);toast.success('Rôle mis à jour.');await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const kick=async(memberId,name)=>{if(!window.confirm(`Exclure ${name} du club ?`))return;try{await socialService.kickMember(slug,memberId);toast.success(`${name} exclu.`);await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const invite=async()=>{if(!inviteInput.trim())return;setInviting(true);try{await socialService.inviteToClub(slug,inviteInput.trim());toast.success('Membre ajouté !');setInviteInput('');await reloadMembers();}catch(e){toast.error(handleApiError(e));}setInviting(false);};
  const approveMember=async(memberId,name)=>{try{await socialService.approveMember(slug,memberId);toast.success(`${name} approuvé !`);await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const rejectMember=async(memberId,name)=>{try{await socialService.rejectMember(slug,memberId);toast.success(`${name} refusé.`);await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const deleteClub=async()=>{try{await socialService.deleteClub(slug);toast.success('Club supprimé.');window.location.href='/clubs';}catch(e){toast.error(handleApiError(e));}};
  const generateInviteUrl=async()=>{
    if(inviteUrl)return inviteUrl;
    try{
      const r=await socialService.createInviteLink(slug,7,0);
      const url=`${window.location.origin}/clubs/invite/${r.data.token}`;
      setInviteUrl(url);
      return url;
    }catch{toast.error('Erreur lors de la création du lien.');return null;}
  };
  const copyLink=async()=>{
    if(isAdmin){
      const url=await generateInviteUrl();
      if(!url)return;
      await navigator.clipboard.writeText(url);
      toast.success('Lien d\'invitation copié !');
      if(navigator.share){try{await navigator.share({title:`Rejoindre ${club.name} sur Frollot`,url});}catch{}}
    }else{
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };
  const openQr=async()=>{
    await generateInviteUrl();
    setShowQr(true);
  };
  const downloadQr=()=>{
    const canvas=document.querySelector('.cc-qr-modal canvas');
    if(!canvas)return;
    const link=document.createElement('a');
    link.download=`${club.name.replace(/\s+/g,'-')}-invite-qr.png`;
    link.href=canvas.toDataURL('image/png');
    link.click();
  };

  const loadMedia=async()=>{if(media)return;try{const r=await socialService.getClubMedia(slug);setMedia(Array.isArray(r.data)?r.data:r.data.results||[]);}catch{setMedia([]);}};

  const openEdit=()=>{setEditForm({name:club.name,description:club.description||'',rules:club.rules||''});setSidebarTab('edit');};
  const saveEdit=async()=>{if(!editForm)return;setSaving(true);try{await socialService.updateClub(slug,editForm);toast.success('Club mis à jour.');const r=await socialService.getClub(slug);setClub(r.data);setSidebarTab('info');}catch(e){toast.error(handleApiError(e));}setSaving(false);};

  // Book search for changing current book
  useEffect(()=>{
    if(bookSearch.length<2){setBookResults([]);return;}
    const t=setTimeout(async()=>{try{const r=await (await import('../services/bookService')).default.searchBooks(bookSearch);const b=Array.isArray(r.data)?r.data:r.data.results||[];setBookResults(b.slice(0,5));}catch{setBookResults([]);}},400);
    return()=>clearTimeout(t);
  },[bookSearch]);

  const changeBook=async(bookId)=>{try{await socialService.updateClub(slug,{current_book:bookId});toast.success('Livre en cours mis à jour.');const r=await socialService.getClub(slug);setClub(r.data);setBookSearch('');setBookResults([]);}catch(e){toast.error(handleApiError(e));}};

  if(loading)return<div className="dashboard-loading"><div className="admin-spinner"/></div>;
  if(error)return<div className="cc-error"><i className="fas fa-exclamation-triangle"/><p>{error}</p><Link to="/clubs">Retour</Link></div>;
  if(!club)return null;

  const cats=Array.isArray(club.category)?club.category:[];
  const grouped=groupByDate(messages);
  const pinnedMsgs=messages.filter(m=>m.is_pinned&&!m.is_deleted);
  const createdDate=new Date(club.created_at);
  const createdMonth=createdDate.toLocaleDateString(i18n.language==='en'?'en-US':'fr-FR',{month:'short',year:'numeric'});
  const topMembers=members.slice(0,5);
  const moderator=members.find(m=>m.role==='MODERATOR')||members.find(m=>m.role==='ADMIN')||members.find(m=>m.user?.id===club.creator?.id);
  const topReader=members.reduce((top,m)=>(!top||m.reading_progress>top.reading_progress)?m:top,null);

  return(<>
    <div className="cc">
      <SEO title={club.name}/>

      {/* ══ MOBILE TOPBAR ══ */}
      <div className="cc-mob" onClick={()=>setRailOpen(o=>!o)}>
        <div className="cc-mob__av">{club.cover_image?<img src={club.cover_image} alt=""/>:<i className="fas fa-users"/>}</div>
        <div className="cc-mob__txt"><h1>{club.name}</h1><span>{members.length} membre{members.length>1?'s':''}{isFull&&` · ${t('pages.bookClubDetail.clubFull', 'Complet')}`}</span></div>
      </div>

      {/* ══ HEADER ══ */}
      <div className="cc-header">
        <div className="cc-header__cover">
          {club.current_book?.cover_image?<img src={club.current_book.cover_image} alt={club.current_book.title}/>:
           club.cover_image?<img src={club.cover_image} alt=""/>:
           <div className="cc-header__cover-placeholder"><i className="fas fa-book-open"/></div>}
        </div>
        <div className="cc-header__info">
          <div className="cc-header__eyebrow">— Club · {members.length} {t('pages.bookClubDetail.members')} · {t('pages.bookClubDetail.foundedIn')} {createdMonth}</div>
          <h1 className="cc-header__title">{club.name}</h1>
          {club.current_book&&(
            <div className="cc-header__subtitle">
              {t('pages.bookClubDetail.readingInProgress')} : « {club.current_book.title} »
            </div>
          )}
          <div className="cc-header__meta">
            <div className="cc-header__avatars">
              {topMembers.map((m,i)=>(
                <div key={m.id} className="cc-header__av" style={{marginLeft:i>0?-8:0}}>
                  {m.user?.profile_image?<img src={m.user.profile_image} alt=""/>:<span>{ini(m.user?.full_name||m.user?.username)}</span>}
                </div>
              ))}
              {members.length>5&&<div className="cc-header__av cc-header__av--more" style={{marginLeft:-8}}>+{members.length-5}</div>}
            </div>
            {sessions.length>0&&(
              <>
                <span className="cc-header__dot">·</span>
                <span className="cc-header__next">
                  {t('pages.bookClubDetail.nextSession')} : <strong>{new Date(sessions[0].scheduled_at).toLocaleDateString(i18n.language==='en'?'en-US':'fr-FR',{day:'numeric',month:'long'})}, {new Date(sessions[0].scheduled_at).toLocaleTimeString(i18n.language==='en'?'en-US':'fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong> · {sessions[0].is_online?t('pages.bookClubDetail.online'):(sessions[0].location||'')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="cc-header__actions">
          {user&&!isMember&&(isFull
            ?<button className="cc-btn cc-btn--join cc-btn--disabled" disabled title={t('pages.bookClubDetail.clubFullTooltip', 'Ce club est complet')}><i className="fas fa-lock"/> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
            :<button className="cc-btn cc-btn--join" onClick={join}>{t('pages.bookClubDetail.joinClub')}</button>
          )}
          {user&&isMember&&club.creator?.id!==user.id&&<button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt"/> Quitter</button>}
          {isAdmin&&<button className="cc-btn cc-btn--outline" onClick={copyLink}><i className="fas fa-share-alt"/> Partager</button>}
          {isAdmin&&<button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode"/> QR</button>}
          {isAdmin&&<button className="cc-btn cc-btn--outline" onClick={openEdit}><i className="fas fa-pen"/> Modifier</button>}
        </div>
      </div>

      {/* ══ BODY: 2 columns ══ */}
      <div className="cc-body">

        {/* ── LEFT: Tabs + Content ── */}
        <div className="cc-main">
          {/* Tabs */}
          <div className="cc-tabs">
            <button className={`cc-tabs__btn ${mainTab==='discussion'?'cc-tabs__btn--active':''}`} onClick={()=>setMainTab('discussion')}>
              {t('pages.bookClubDetail.tabDiscussion')} {messages.length>0&&<span className="cc-tabs__count">· {messages.length}</span>}
            </button>
            <button className={`cc-tabs__btn ${mainTab==='passages'?'cc-tabs__btn--active':''}`} onClick={()=>setMainTab('passages')}>
              {t('pages.bookClubDetail.tabPassages')}
            </button>
            <button className={`cc-tabs__btn ${mainTab==='participants'?'cc-tabs__btn--active':''}`} onClick={()=>setMainTab('participants')}>
              {t('pages.bookClubDetail.tabParticipants')}
            </button>
            <button className={`cc-tabs__btn ${mainTab==='archives'?'cc-tabs__btn--active':''}`} onClick={()=>setMainTab('archives')}>
              {t('pages.bookClubDetail.tabArchives')}
            </button>
            {mainTab==='discussion'&&<button className={`cc-tabs__btn cc-tabs__btn--icon${showSearch?' cc-tabs__btn--active':''}`} onClick={()=>setShowSearch(p=>!p)} title="Rechercher"><i className="fas fa-search"/></button>}
          </div>

          {/* ── TAB: Discussion ── */}
          {mainTab==='discussion'&&<>
            {/* Search bar — toggled via icon in tabs */}
            {showSearch&&<div className="cc-search">
              <div className="cc-search__field">
                <i className="fas fa-search"/>
                <input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Rechercher dans le chat..." onKeyDown={e=>{if(e.key==='Enter')doSearch();}} autoFocus/>
                {searchMatchIds&&<span className="cc-search__count">{searchMatchArr.length>0?`${searchIdx+1}/${searchMatchArr.length}`:'0'}</span>}
                {searchMatchIds&&searchMatchArr.length>1&&<>
                  <button onClick={()=>navigateSearch(-1)} className="cc-search__nav"><i className="fas fa-chevron-up"/></button>
                  <button onClick={()=>navigateSearch(1)} className="cc-search__nav"><i className="fas fa-chevron-down"/></button>
                </>}
                {chatSearch&&<button onClick={clearSearch} className="cc-search__clear"><i className="fas fa-times"/></button>}
              </div>
            </div>}

            {/* Pinned bar — click cycles through pinned messages */}
            {pinnedMsgs.length>0&&(()=>{
              const idx=pinnedIdx%pinnedMsgs.length;
              const current=pinnedMsgs[idx];
              return(
                <div className="cc-pinned-bar" onClick={()=>{
                  const el=document.getElementById(`msg-${current.id}`);
                  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('cc-msg--highlight');setTimeout(()=>el.classList.remove('cc-msg--highlight'),1500);}
                  setPinnedIdx(i=>i+1);
                }}>
                  <i className="fas fa-thumbtack cc-pinned-bar__icon"/>
                  <div className="cc-pinned-bar__content">
                    <span className="cc-pinned-bar__label">{idx+1}/{pinnedMsgs.length}</span>
                    <span className="cc-pinned-bar__preview">{current.author?.full_name||'Membre'}: {current.content?.slice(0,60)||({VOICE:'🎤 Note vocale',IMAGE:'📷 Photo',FILE:'📎 Fichier',QUOTE:'📖 Citation'}[current.message_type]||'...')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div className="cc-msgs" ref={chatRef} onScroll={onChatScroll} onClick={()=>{if(msgMenu)setMsgMenu(null);if(reactionPicker)setReactionPicker(null);}}>
              <div ref={topSentinelRef} className="cc-top-sentinel">
                {loadingOlder&&<div className="cc-loading-older"><i className="fas fa-spinner fa-spin"/> Chargement…</div>}
              </div>
              {messages.length===0?(
                <div className="cc-empty">
                  <div className="cc-empty__icon"><i className="fas fa-book-reader"/></div>
                  <h3>Bienvenue dans {club.name}</h3>
                  <p>Les messages envoyés ici sont visibles par tous les membres du club. Commencez la discussion !</p>
                </div>
              ):(
                grouped.map((item,idx)=>{
                  if(item._date)return<div key={`d${idx}`} className="cc-datesep"><span>{fmtDate(item.d, t)}</span></div>;
                  const own=item.author?.id===user?.id;
                  return(
                    <div key={item.id} id={`msg-${item.id}`} className={`cc-msg ${own?'cc-msg--own':''} ${item.is_deleted?'cc-msg--deleted':''} ${item._consecutive?'cc-msg--consecutive':''}${searchMatchIds&&searchMatchIds.has(item.id)?' cc-msg--search-match':''}`}
                      onContextMenu={e=>{if(isMember&&!item.is_deleted){e.preventDefault();setMsgMenu({id:item.id,own,canEdit:own&&canEditMsg(item)});}}}
                    >
                      {!own&&!item._consecutive&&<div className="cc-msg__av">{item.author?.profile_image?<img src={item.author.profile_image} alt=""/>:<span>{ini(item.author?.full_name||item.author?.username)}</span>}</div>}
                      <div className="cc-msg__bubble">
                        {/* pin badge removed — shown in pinned bar + footer icon */}
                        {!own&&!item._consecutive&&<div className="cc-msg__name">{item.author?.full_name||item.author?.username||'Membre'}</div>}
                        {item.is_deleted?(
                          <p className="cc-msg__text cc-msg__text--deleted"><i className="fas fa-ban"/> Message supprimé</p>
                        ):(
                          <>
                            {item.reply_to_preview&&!item.reply_to_preview.is_deleted&&(
                              <div className="cc-msg__reply-ref" onClick={()=>{const el=document.getElementById(`msg-${item.reply_to_preview.id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('cc-msg--highlight');setTimeout(()=>el.classList.remove('cc-msg--highlight'),1500);}}}>
                                <span className="cc-msg__reply-author">{item.reply_to_preview.author?.full_name||item.reply_to_preview.author?.username||'Membre'}</span>
                                <span className="cc-msg__reply-text">{item.reply_to_preview.message_type!=='TEXT'?({VOICE:'Note vocale',IMAGE:'Photo',FILE:'Fichier',QUOTE:'Citation'}[item.reply_to_preview.message_type]||''):item.reply_to_preview.content}</span>
                              </div>
                            )}
                            {editingMsg?.id===item.id?(
                              <div className="cc-msg__edit">
                                <input value={editingMsg.content} onChange={e=>setEditingMsg(p=>({...p,content:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleEditMsg();}if(e.key==='Escape')setEditingMsg(null);}} autoFocus/>
                                <div className="cc-msg__edit-actions">
                                  <button onClick={()=>setEditingMsg(null)}><i className="fas fa-times"/></button>
                                  <button onClick={handleEditMsg}><i className="fas fa-check"/></button>
                                </div>
                              </div>
                            ):(
                              <>
                                {item.message_type==='TEXT'&&(isEmojiOnly(item.content)
                                  ?<p className="cc-msg__emoji-only">{item.content}</p>
                                  :<p className="cc-msg__text">{renderWithMentions(item.content,members,searchMatchIds&&searchMatchIds.has(item.id)?chatSearch:'')}</p>
                                )}
                                {item.message_type==='QUOTE'&&(
                                  <div className="cc-msg__quote">
                                    {item.quote_book_detail&&<div className="cc-msg__quote-cover"><img src={item.quote_book_detail.cover_image} alt=""/></div>}
                                    <div>
                                      <div className="cc-msg__quote-text">« {item.quote_text} »</div>
                                      <div className="cc-msg__quote-source">— PAGE {item.quote_page} · {(item.quote_book_detail?.title||'').toUpperCase()}</div>
                                    </div>
                                  </div>
                                )}
                                {item.message_type==='IMAGE'&&item.attachment_url&&<a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__img"><img src={item.attachment_url} alt=""/></a>}
                                {item.message_type==='VOICE'&&<div className="cc-msg__voice"><audio controls src={item.attachment_url} preload="metadata"/>{item.voice_duration&&<span>{fmtDur(item.voice_duration)}</span>}</div>}
                                {item.message_type==='FILE'&&item.attachment_url&&<a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__file"><i className="fas fa-file-alt"/><span>{item.attachment_name||'Fichier'}</span><i className="fas fa-download cc-msg__dl"/></a>}
                              </>
                            )}
                            <div className="cc-msg__footer">
                              {item.is_pinned&&<i className="fas fa-thumbtack cc-msg__pin-icon"/>}
                              <time className="cc-msg__time">{fmtTime(item.created_at, i18n.language)}</time>
                              {item.edited_at&&<span className="cc-msg__edited">modifié</span>}
                            </div>
                          </>
                        )}
                        {msgMenu?.id===item.id&&(
                          <div className="cc-msg__menu" onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>{setReplyTo({id:item.id,author:item.author,content:item.content,message_type:item.message_type});setMsgMenu(null);inputRef.current?.focus();}}><i className="fas fa-reply"/> Répondre</button>
                            {msgMenu.canEdit&&<button onClick={()=>{setEditingMsg({id:item.id,content:item.content});setMsgMenu(null);}}><i className="fas fa-pen"/> Modifier</button>}
                            <button onClick={()=>{setReactionPicker(item.id);setMsgMenu(null);}}><i className="fas fa-smile"/> Réagir</button>
                            {isMod&&<button onClick={()=>handlePin(item.id)}><i className="fas fa-thumbtack"/> {item.is_pinned?'Désépingler':'Épingler'}</button>}
                            {(own||isMod)&&<button className="cc-msg__menu-delete" onClick={()=>handleDeleteMsg(item.id)}><i className="fas fa-trash"/> Supprimer</button>}
                            {!own&&<button onClick={()=>{setReportMsg(item);setMsgMenu(null);}}><i className="fas fa-flag"/> Signaler</button>}
                          </div>
                        )}
                        {reactionPicker===item.id&&(
                          <div className="cc-msg__react-picker" onClick={e=>e.stopPropagation()}>
                            {EMOJIS.map(em=><button key={em} onClick={()=>handleReact(item.id,em)}>{em}</button>)}
                            <button className="cc-msg__react-more" onClick={()=>setReactionPicker(`full-${item.id}`)}>+</button>
                          </div>
                        )}
                        {reactionPicker===`full-${item.id}`&&(
                          <div className="cc-msg__react-full" onClick={e=>e.stopPropagation()}>
                            <EmojiPicker onSelect={e=>handleReact(item.id,e.native)} perLine={7}/>
                          </div>
                        )}
                      </div>
                      {item.reactions_summary?.length>0&&(
                        <div className={`cc-msg__reactions ${own?'cc-msg__reactions--own':''}`}>
                          {item.reactions_summary.map(r=>(
                            <button key={r.emoji} className={`cc-msg__reaction ${r.reacted_by_me?'cc-msg__reaction--mine':''}`} onClick={()=>handleReact(item.id,r.emoji)}>
                              {r.emoji} <span>{r.count}</span>
                            </button>
                          ))}
                          <button className="cc-msg__reaction cc-msg__reaction--add" onClick={()=>setReactionPicker(reactionPicker===item.id?null:item.id)}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={endRef}/>
            </div>

            {showScrollBtn&&<button className="cc-scroll-btn" onClick={scrollToBottom}><i className="fas fa-chevron-down"/></button>}
            {showEmoji&&(
              <div className="cc-picker">
                <div className="cc-picker__tabs">
                  <button className={`cc-picker__tab${pickerTab==='emoji'?' cc-picker__tab--active':''}`} onClick={()=>setPickerTab('emoji')}>Émojis</button>
                  <button className={`cc-picker__tab${pickerTab==='stickers'?' cc-picker__tab--active':''}`} onClick={()=>setPickerTab('stickers')}>Stickers</button>
                </div>
                {pickerTab==='emoji'?(
                  <EmojiPicker onSelect={e=>insertEmoji(e.native)} perLine={8}/>
                ):(
                  <div className="cc-sticker-packs">
                    {STICKER_PACKS.map(pack=>(
                      <div key={pack.name} className="cc-sticker-pack">
                        <div className="cc-sticker-pack__name">{pack.icon} {pack.name}</div>
                        <div className="cc-sticker-pack__grid">
                          {pack.stickers.map(s=>(
                            <button key={s} className="cc-sticker" onClick={()=>{insertEmoji(s);setShowEmoji(false);}}>{s}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Composer */}
            {isMember?(
              <div className="cc-bar">
                {isRec?(
                  <div className="cc-bar__rec">
                    <button className="cc-bar__rec-cancel" onClick={cancelRec}><i className="fas fa-trash-alt"/></button>
                    <div className="cc-bar__rec-wave"><span className="cc-bar__rec-dot"/><span className="cc-bar__rec-time">{fmtDur(recTime)}</span></div>
                    <button className="cc-bar__rec-send" onClick={stopRec}><i className="fas fa-paper-plane"/></button>
                  </div>
                ):(
                  <form onSubmit={send} className="cc-bar__form">
                    {replyTo&&(
                      <div className="cc-bar__reply-preview">
                        <div className="cc-bar__reply-info">
                          <i className="fas fa-reply"/>
                          <span className="cc-bar__reply-author">{replyTo.author?.full_name||replyTo.author?.username||'Membre'}</span>
                          <span className="cc-bar__reply-text">{replyTo.message_type!=='TEXT'?({VOICE:'Note vocale',IMAGE:'Photo',FILE:'Fichier',QUOTE:'Citation'}[replyTo.message_type]||''):replyTo.content?.slice(0,80)}</span>
                        </div>
                        <button type="button" className="cc-bar__reply-close" onClick={()=>setReplyTo(null)}><i className="fas fa-times"/></button>
                      </div>
                    )}
                    <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadFile(e.target.files[0],'IMAGE');e.target.value='';}}/>
                    <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadFile(e.target.files[0],'FILE');e.target.value='';}}/>
                    <div className="cc-bar__row">
                      <div className="cc-bar__tools">
                        <button type="button" className="cc-bar__icon" onClick={()=>setShowEmoji(p=>!p)} title="Emoji"><i className="fas fa-smile"/></button>
                        <button type="button" className="cc-bar__icon" onClick={()=>imgRef.current?.click()} title="Image"><i className="fas fa-image"/></button>
                        <button type="button" className="cc-bar__icon" onClick={()=>fileRef.current?.click()} title="Fichier"><i className="fas fa-paperclip"/></button>
                      </div>
                      <div className="cc-bar__input-wrap">
                        {mentionResults.length>0&&(
                          <div className="cc-mention-dropdown">
                            {mentionResults.map((m,i)=>(
                              <button key={m.id} className={`cc-mention-item${i===mentionIdx?' cc-mention-item--active':''}`} onMouseDown={e=>{e.preventDefault();insertMention(m);}}>
                                <div className="cc-mention-item__av">{m.user?.profile_image?<img src={m.user.profile_image} alt=""/>:<span>{ini(m.user?.full_name||m.user?.username)}</span>}</div>
                                <div className="cc-mention-item__info"><strong>{m.user?.full_name||m.user?.username}</strong><span>@{m.user?.username}</span></div>
                              </button>
                            ))}
                          </div>
                        )}
                        <textarea ref={inputRef} className="cc-bar__input" value={msgText} onChange={e=>{onMsgChange(e);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,160)+'px';}} placeholder={t('pages.bookClubDetail.yourContribution')} disabled={sending} rows={1} onFocus={()=>setShowEmoji(false)} onKeyDown={onMsgKeyDown}/>
                      </div>
                      <button type="button" className="cc-bar__icon" onClick={startRec} title="Vocal"><i className="fas fa-microphone"/></button>
                      <button type="submit" className="cc-bar__send" disabled={sending||!msgText.trim()}><i className="fas fa-paper-plane"/></button>
                    </div>
                  </form>
                )}
              </div>
            ):(
              <div className="cc-joinbar">
                {user?(isFull
                  ?<><span>{t('pages.bookClubDetail.clubFullMessage', 'Ce club a atteint sa limite de membres')}</span><button disabled className="cc-btn--disabled"><i className="fas fa-lock"/> {t('pages.bookClubDetail.clubFull', 'Complet')}</button></>
                  :<><span>Rejoignez le club pour discuter</span><button onClick={join}><i className="fas fa-sign-in-alt"/> Rejoindre</button></>
                ):<><span>Connectez-vous pour participer</span><Link to="/login">Se connecter</Link></>}
              </div>
            )}
          </>}

          {/* ── TAB: Passages commentés ── */}
          {mainTab==='passages'&&(
            <div className="cc-tab-content">
              {messages.filter(m=>m.message_type==='QUOTE'&&!m.is_deleted).length>0?(
                <div className="cc-passages">
                  {messages.filter(m=>m.message_type==='QUOTE'&&!m.is_deleted).map(m=>(
                    <div key={m.id} className="cc-passage">
                      {m.quote_book_detail?.cover_image&&<div className="cc-passage__cover"><img src={m.quote_book_detail.cover_image} alt=""/></div>}
                      <div className="cc-passage__body">
                        <div className="cc-passage__text">« {m.quote_text} »</div>
                        <div className="cc-passage__source">— PAGE {m.quote_page} · {(m.quote_book_detail?.title||'').toUpperCase()}</div>
                        <div className="cc-passage__meta">{m.author?.full_name||m.author?.username} · {fmtTime(m.created_at, i18n.language)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ):(
                <div className="cc-empty"><p>Aucun passage commenté pour le moment.</p></div>
              )}
            </div>
          )}

          {/* ── TAB: Participants ── */}
          {mainTab==='participants'&&(
            <div className="cc-tab-content">
              {isAdmin&&<div className="cc-sec">
                <div className="cc-invite">
                  <input value={inviteInput} onChange={e=>setInviteInput(e.target.value)} placeholder="Inviter par nom d'utilisateur ou email" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();invite();}}}/>
                  <button onClick={invite} disabled={inviting||!inviteInput.trim()}>{inviting?<i className="fas fa-spinner fa-spin"/>:<i className="fas fa-plus"/>}</button>
                </div>
              </div>}
              <div className="cc-members">
                {members.map(m=>{
                  const isCreator=m.user?.id===club.creator?.id;
                  const isSelf=m.user?.id===user?.id;
                  const canChangeRole=isAdmin&&!isCreator&&!isSelf;
                  const canKick=isMod&&!isCreator&&!isSelf&&(isAdmin||m.role==='MEMBER');
                  return(
                    <div key={m.id} className="cc-member">
                      <div className="cc-member__av">{m.user?.profile_image?<img src={m.user.profile_image} alt=""/>:<span>{ini(m.user?.full_name||m.user?.username)}</span>}</div>
                      <div className="cc-member__info">
                        <div className="cc-member__top">
                          <strong>{m.user?.full_name||m.user?.username}</strong>
                          {isCreator&&<span className="cc-member__badge cc-member__badge--creator">{t('pages.bookClubDetail.creator','Créateur')}</span>}
                          {!isCreator&&m.role==='ADMIN'&&<span className="cc-member__badge">{t('pages.bookClubDetail.admin')}</span>}
                          {!isCreator&&m.role==='MODERATOR'&&<span className="cc-member__badge cc-member__badge--mod">{t('pages.bookClubDetail.moderator')}</span>}
                          {!isCreator&&m.role==='MEMBER'&&<span className="cc-member__badge cc-member__badge--member">{t('pages.bookClubDetail.member','Membre')}</span>}
                        </div>
                        {club.current_book&&(
                          <div className="cc-member__progress">
                            <div className="cc-member__progress-bar"><div className="cc-member__progress-fill" style={{width:`${m.reading_progress||0}%`}}/></div>
                            <span>{m.reading_progress||0}%</span>
                          </div>
                        )}
                      </div>
                      {(canChangeRole||canKick)&&<div className="cc-member__actions">
                        {canChangeRole&&(
                          m.role==='MEMBER'?<>
                            <button onClick={()=>changeRole(m.id,'MODERATOR')} title={t('pages.bookClubDetail.promoteToMod','Promouvoir modérateur')}><i className="fas fa-shield-alt"/></button>
                            <button onClick={()=>changeRole(m.id,'ADMIN')} title={t('pages.bookClubDetail.promoteToAdmin','Promouvoir admin')}><i className="fas fa-arrow-up"/></button>
                          </>:m.role==='MODERATOR'?<>
                            <button onClick={()=>changeRole(m.id,'ADMIN')} title={t('pages.bookClubDetail.promoteToAdmin','Promouvoir admin')}><i className="fas fa-arrow-up"/></button>
                            <button onClick={()=>changeRole(m.id,'MEMBER')} title={t('pages.bookClubDetail.demoteToMember','Rétrograder membre')}><i className="fas fa-arrow-down"/></button>
                          </>:
                            <button onClick={()=>changeRole(m.id,'MEMBER')} title={t('pages.bookClubDetail.demoteToMember','Rétrograder membre')}><i className="fas fa-arrow-down"/></button>
                        )}
                        {canKick&&<button onClick={()=>kick(m.id,m.user?.full_name||m.user?.username)} title={t('pages.bookClubDetail.kickMember','Exclure')} className="cc-member__kick"><i className="fas fa-user-slash"/></button>}
                      </div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: Archives ── */}
          {mainTab==='archives'&&(
            <div className="cc-tab-content">
              {archives.length>0?(
                <div className="cc-archives">
                  {archives.map(a=>(
                    <Link key={a.id} to={`/books/${a.book?.id}`} className="cc-archive">
                      {a.book?.cover_image&&<div className="cc-archive__cover"><img src={a.book.cover_image} alt=""/></div>}
                      <div className="cc-archive__info">
                        <div className="cc-archive__title">{a.book?.title}</div>
                        <div className="cc-archive__author">{a.book?.author?.full_name||''}</div>
                        {a.finished_at&&<div className="cc-archive__date">{t('pages.bookClubDetail.finishedOn')} {new Date(a.finished_at).toLocaleDateString(i18n.language==='en'?'en-US':'fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              ):(
                <div className="cc-empty"><p>{t('pages.bookClubDetail.noArchives')}</p></div>
              )}
            </div>
          )}
        </div>{/* end cc-main */}

        {/* ── RIGHT RAIL ── */}
        <aside className={`cc-rail ${railOpen?'cc-rail--open':''}`}>
          <button className="cc-rail__close" onClick={()=>setRailOpen(false)} aria-label="Fermer"><i className="fas fa-times"/></button>
          {/* Club profile (visible on mobile overlay) */}
          <div className="cc-rail__profile">
            <div className="cc-rail__avatar">
              {club.cover_image?<img src={club.cover_image} alt=""/>:<i className="fas fa-users"/>}
            </div>
            <h2 className="cc-rail__club-name">{club.name}</h2>
            <div className="cc-rail__badges">
              <span className={`cc-rail__vis ${club.is_public?'':'cc-rail__vis--priv'}`}><i className={`fas ${club.is_public?'fa-globe':'fa-lock'}`}/> {club.is_public?'Public':'Privé'}</span>
              <span className={isFull?'cc-rail__members--full':''}><i className="fas fa-users"/> {members.length}{club.max_members?`/${club.max_members}`:''}{isFull&&` · ${t('pages.bookClubDetail.clubFull', 'Complet')}`}</span>
            </div>
          </div>
          {/* Progression collective */}
          {club.current_book&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.collectiveProgress')}</div>
              <div className="cc-rail__big-num">{club.average_progress||0}<span className="cc-rail__unit">%</span></div>
              <div className="cc-rail__sub">{t('pages.bookClubDetail.average')} {members.length} {t('pages.bookClubDetail.members')}</div>
              <div className="cc-progress__bar"><div className="cc-progress__fill" style={{width:`${club.average_progress||0}%`}}/></div>
              <div className="cc-rail__stats">
                {topReader&&<div className="cc-rail__stat"><span>{t('pages.bookClubDetail.mostAdvanced')} — {topReader.user?.full_name||topReader.user?.username}</span><span>{topReader.reading_progress||0}%</span></div>}
                {isMember&&<div className="cc-rail__stat"><span>{t('pages.bookClubDetail.you')} ({user?.full_name||user?.username})</span><span style={{color:'var(--fl-ink)'}}>{myProgress}%</span></div>}
              </div>
              {/* My progress slider */}
              {isMember&&(
                <div className="cc-my-progress">
                  <input type="range" min="0" max="100" step="5" value={myProgress}
                    onChange={e=>setMyProgress(+e.target.value)}
                    onMouseUp={e=>saveProgress(+e.target.value)}
                    onTouchEnd={e=>saveProgress(+e.target.value)}
                    className="cc-my-progress__slider"
                  />
                </div>
              )}
            </div>
          )}

          {/* Prochaines séances */}
          <div className="cc-rail__section">
            <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.upcomingSessions')}</div>
            {sessions.length>0?(
              <div className="cc-sessions">
                {sessions.slice(0,3).map((s,i)=>{
                  const d=new Date(s.scheduled_at);
                  const isToday=d.toDateString()===new Date().toDateString();
                  return(
                    <div key={s.id} className="cc-session" style={{borderTop:i>0?'1px dashed var(--fl-border-strong)':'none'}}>
                      <div className="cc-session__date">
                        <div className={`cc-session__day ${isToday?'cc-session__day--active':''}`}>{d.getDate()}</div>
                        <div className="cc-session__month">{d.toLocaleDateString(i18n.language==='en'?'en-US':'fr-FR',{month:'short'})}</div>
                      </div>
                      <div className="cc-session__info">
                        <div className="cc-session__title">{s.title}</div>
                        <div className="cc-session__time">{d.toLocaleTimeString(i18n.language==='en'?'en-US':'fr-FR',{hour:'2-digit',minute:'2-digit'})} · {s.is_online?t('pages.bookClubDetail.online'):(s.location||'')}</div>
                        {isMember&&(
                          <div className="cc-session__rsvp">
                            {[['GOING','fa-check',t('pages.bookClubDetail.rsvpGoing','Présent')],['MAYBE','fa-question',t('pages.bookClubDetail.rsvpMaybe','Peut-être')],['NOT_GOING','fa-times',t('pages.bookClubDetail.rsvpNotGoing','Absent')]].map(([st,icon,label])=>(
                              <button key={st} className={`cc-rsvp-btn${s.my_rsvp===st?' cc-rsvp-btn--active cc-rsvp-btn--'+st.toLowerCase():''}`} onClick={async()=>{
                                try{const r=await socialService.rsvpSession(slug,s.id,st);setSessions(prev=>prev.map(x=>x.id===s.id?r.data:x));}catch(e){toast.error(handleApiError(e));}
                              }}><i className={`fas ${icon}`}/> {label}</button>
                            ))}
                          </div>
                        )}
                        {s.rsvp_counts&&(s.rsvp_counts.going>0||s.rsvp_counts.maybe>0)&&(
                          <div className="cc-session__counts">
                            {s.rsvp_counts.going>0&&<span className="cc-session__count cc-session__count--going"><i className="fas fa-check"/> {s.rsvp_counts.going}</span>}
                            {s.rsvp_counts.maybe>0&&<span className="cc-session__count cc-session__count--maybe"><i className="fas fa-question"/> {s.rsvp_counts.maybe}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ):(
              <p className="cc-rail__empty">{t('pages.bookClubDetail.noSessions')}</p>
            )}
          </div>

          {/* Modérateur/Animation */}
          {moderator&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.moderation')}</div>
              <div className="cc-moderator">
                <div className="cc-moderator__av">
                  {moderator.user?.profile_image?<img src={moderator.user.profile_image} alt=""/>:<span>{ini(moderator.user?.full_name||moderator.user?.username)}</span>}
                </div>
                <div>
                  <div className="cc-moderator__name">{moderator.user?.full_name||moderator.user?.username}</div>
                  <div className="cc-moderator__role">{moderator.role==='ADMIN'?t('pages.bookClubDetail.admin').toUpperCase():t('pages.bookClubDetail.moderator').toUpperCase()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Lecture en cours + changer livre */}
          <div className="cc-rail__section">
            <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.readingInProgress')}</div>
            {club.current_book?(
              <Link to={`/books/${club.current_book.id}`} className="cc-book-link">
                {club.current_book.cover_image&&<img src={club.current_book.cover_image} alt=""/>}
                <div><strong>{club.current_book.title}</strong>{club.current_book.author?.full_name&&<span>{club.current_book.author.full_name}</span>}</div>
              </Link>
            ):<p className="cc-rail__empty">Aucun livre sélectionné</p>}
            {isAdmin&&<div className="cc-book-change">
              <div className="cc-book-search">
                <input value={bookSearch} onChange={e=>setBookSearch(e.target.value)} placeholder="Changer le livre..." />
                {bookResults.length>0&&<div className="cc-book-results">{bookResults.map(b=>(
                  <button key={b.id} onClick={()=>changeBook(b.id)}>
                    {b.cover_image&&<img src={b.cover_image} alt=""/>}
                    <div><strong>{b.title}</strong><span>{b.author?.full_name||''}</span></div>
                  </button>
                ))}</div>}
              </div>
            </div>}
          </div>

          {/* Description */}
          {club.description&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— Description</div>
              <p className="cc-rail__desc">{club.description}</p>
            </div>
          )}

          {cats.length>0&&(
            <div className="cc-rail__section">
              <div className="cc-tags">{cats.map((c,i)=><span key={i} className="cc-tag cc-tag--pri">{CAT_KEYS[c]?t(CAT_KEYS[c]):c}</span>)}</div>
            </div>
          )}

          {club.rules&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— Règles</div>
              <div className="cc-rules">{club.rules}</div>
            </div>
          )}

          {/* Vote */}
          {isMember&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— Vote</div>
              {activePoll?(
                <div className="cc-poll">
                  <div className="cc-poll__title">{activePoll.title}</div>
                  {activePoll.options?.length>0&&(
                    <div className="cc-poll__options">
                      {activePoll.options.map(opt=>(
                        <button key={opt.id} className={`cc-poll__option ${opt.voted_by_me?'cc-poll__option--voted':''}`} onClick={()=>votePollOption(opt.id)}>
                          {opt.book?.cover_image&&<img src={opt.book.cover_image} alt="" className="cc-poll__cover"/>}
                          <div className="cc-poll__option-info">
                            <strong>{opt.book?.title}</strong>
                            <span>{opt.votes_count} vote{opt.votes_count>1?'s':''}</span>
                          </div>
                          {opt.voted_by_me&&<i className="fas fa-check-circle cc-poll__check"/>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="cc-poll__add">
                    <input value={pollBookSearch} onChange={e=>setPollBookSearch(e.target.value)} placeholder="Proposer un livre..." className="cc-poll__search"/>
                    {pollBookResults.length>0&&(
                      <div className="cc-book-results">{pollBookResults.map(b=>(
                        <button key={b.id} onClick={()=>addPollBook(b.id)}>
                          {b.cover_image&&<img src={b.cover_image} alt=""/>}
                          <div><strong>{b.title}</strong><span>{b.author?.full_name||''}</span></div>
                        </button>
                      ))}</div>
                    )}
                  </div>
                  {isAdmin&&<button className="cc-btn cc-btn--poll-close" onClick={closePollAction}><i className="fas fa-check"/> Clore le vote</button>}
                </div>
              ):(
                isAdmin?<button className="cc-btn cc-btn--join" onClick={createPoll} style={{width:'100%'}}><i className="fas fa-poll"/> Lancer un vote</button>
                :<p className="cc-rail__empty">Aucun vote en cours.</p>
              )}
            </div>
          )}

          {/* Pending members (admin) */}
          {isAdmin&&(()=>{
            const pending=members.filter(m=>m.membership_status==='PENDING');
            return pending.length>0?(
              <div className="cc-rail__section">
                <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.pendingMembers','Demandes en attente')} ({pending.length})</div>
                <div className="cc-pending">
                  {pending.map(m=>(
                    <div key={m.id} className="cc-pending__item">
                      <div className="cc-pending__av">{m.user?.profile_image?<img src={m.user.profile_image} alt=""/>:<span>{ini(m.user?.full_name||m.user?.username)}</span>}</div>
                      <div className="cc-pending__info">
                        <strong>{m.user?.full_name||m.user?.username}</strong>
                      </div>
                      <div className="cc-pending__actions">
                        <button className="cc-btn cc-btn--join" onClick={()=>approveMember(m.id,m.user?.full_name||m.user?.username)}><i className="fas fa-check"/></button>
                        <button className="cc-btn cc-btn--danger" onClick={()=>rejectMember(m.id,m.user?.full_name||m.user?.username)}><i className="fas fa-times"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ):null;
          })()}

          {/* Signalements (admin/mod) */}
          {isMod&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.reportsTitle','Signalements')}</div>
              <button className="cc-btn cc-btn--outline" onClick={loadReports} style={{width:'100%',marginBottom:8}}>
                <i className="fas fa-flag"/> {reports.length>0?`${reports.length} en attente`:'Charger'}
              </button>
              {reports.length>0&&(
                <div className="cc-reports">
                  {reports.map(rep=>(
                    <div key={rep.id} className="cc-report-card">
                      <div className="cc-report-card__header">
                        <span className="cc-report-card__reason">{rep.reason}</span>
                        <span className="cc-report-card__date">{new Date(rep.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="cc-report-card__msg">
                        <strong>{rep.message_preview?.author?.full_name||'Membre'}</strong>: {rep.message_preview?.content?.slice(0,60)||'...'}
                      </div>
                      <div className="cc-report-card__by">Signalé par {rep.reporter?.full_name||rep.reporter?.username}</div>
                      {rep.details&&<div className="cc-report-card__details">{rep.details}</div>}
                      <div className="cc-report-card__actions">
                        <button className="cc-btn cc-btn--join" onClick={()=>handleReportAction(rep.id,'REVIEWED')}><i className="fas fa-check"/> Traiter</button>
                        <button className="cc-btn cc-btn--leave" onClick={()=>handleReportAction(rep.id,'DISMISSED')}><i className="fas fa-times"/> Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Médias partagés */}
          <div className="cc-rail__section">
            <div className="cc-rail__eyebrow">— Médias</div>
            <button className="cc-btn cc-btn--outline" onClick={loadMedia} style={{width:'100%',marginBottom:8}}>
              <i className="fas fa-photo-video"/> {media?`${media.length} médias`:'Charger'}
            </button>
            {media&&media.length>0&&(
              <div className="cc-media-grid">
                {media.slice(0,6).map(m=>(
                  <a key={m.id} href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`cc-media-item cc-media-item--${m.message_type.toLowerCase()}`}>
                    {m.message_type==='IMAGE'?<img src={m.attachment_url} alt=""/>:
                     m.message_type==='VOICE'?<><i className="fas fa-microphone"/><span>{fmtDur(m.voice_duration||0)}</span></>:
                     <><i className="fas fa-file-alt"/><span>{m.attachment_name||'Fichier'}</span></>}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Edit form (admin) */}
          {sidebarTab==='edit'&&editForm&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— Modifier le club</div>
              <div className="cc-edit-form">
                <label>Nom</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
                <label>Description</label><textarea value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} rows={3}/>
                <label>Règles</label><textarea value={editForm.rules} onChange={e=>setEditForm({...editForm,rules:e.target.value})} rows={2}/>
                <div className="cc-edit-actions">
                  <button className="cc-btn cc-btn--join" onClick={saveEdit} disabled={saving}>{saving?'Enregistrer':'Enregistrer'}</button>
                  <button className="cc-btn cc-btn--leave" onClick={()=>setSidebarTab('info')}>Annuler</button>
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          {/* Invitation (admin) */}
          {isAdmin&&(
            <div className="cc-rail__section">
              <div className="cc-rail__eyebrow">— {t('pages.bookClubDetail.invite','Invitation')}</div>
              <div className="cc-rail__invite-actions">
                <button className="cc-btn cc-btn--outline" onClick={copyLink}><i className="fas fa-share-alt"/> {t('pages.bookClubDetail.shareLink','Partager le lien')}</button>
                <button className="cc-btn cc-btn--outline" onClick={openQr}><i className="fas fa-qrcode"/> {t('pages.bookClubDetail.qrTitle','QR Code')}</button>
              </div>
            </div>
          )}

          <div className="cc-rail__footer">
            {user&&!isMember&&(isFull
              ?<button className="cc-btn cc-btn--join cc-btn--disabled" disabled><i className="fas fa-lock"/> {t('pages.bookClubDetail.clubFull', 'Complet')}</button>
              :<button className="cc-btn cc-btn--join" onClick={join}><i className="fas fa-sign-in-alt"/> {t('pages.bookClubDetail.joinClub')}</button>
            )}
            {user&&isMember&&club.creator?.id!==user.id&&<button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt"/> Quitter</button>}
            {isAdmin&&<button className="cc-btn cc-btn--danger" onClick={()=>setShowDeleteConfirm(true)}><i className="fas fa-trash"/> Supprimer</button>}
            <Link to="/clubs" className="cc-rail__back"><i className="fas fa-arrow-left"/> Tous les clubs</Link>
          </div>
        </aside>
      </div>{/* end cc-body */}

      {/* ══ FAB — opens rail on mobile ══ */}
      <button className="cc-fab" onClick={()=>setRailOpen(true)} aria-label="Infos du club">
        <i className="fas fa-info-circle"/>
      </button>
      {railOpen&&<div className="cc-rail-overlay" onClick={()=>setRailOpen(false)}/>}

      {/* Old cc-side removed — mobile now uses cc-rail overlay via cc-mob + FAB */}

    </div>

    {/* Portals — rendered outside .cc to avoid stacking context issues */}
    {showQr&&inviteUrl&&createPortal(
      <div className="cc-confirm-overlay" onClick={()=>setShowQr(false)}>
        <div className="cc-qr-modal" onClick={e=>e.stopPropagation()}>
          <h3><i className="fas fa-qrcode"/> {t('pages.bookClubDetail.qrTitle','Inviter par QR code')}</h3>
          <p className="cc-qr-modal__sub">{t('pages.bookClubDetail.qrSub','Scannez ce code pour rejoindre le club. Partagez-le sur WhatsApp, imprimez-le ou montrez votre écran.')}</p>
          <div className="cc-qr-modal__code">
            <QRCodeCanvas value={inviteUrl} size={220} level="H" includeMargin={true}
              bgColor="#f5f1ea"
              fgColor="#1a1713"
            />
          </div>
          <p className="cc-qr-modal__club">{club.name}</p>
          <div className="cc-qr-modal__actions">
            <button className="cc-btn cc-btn--join" onClick={downloadQr}><i className="fas fa-download"/> {t('pages.bookClubDetail.qrDownload','Télécharger PNG')}</button>
            <button className="cc-btn cc-btn--outline" onClick={()=>{navigator.clipboard.writeText(inviteUrl);toast.success('Lien copié !');}}><i className="fas fa-copy"/> {t('pages.bookClubDetail.qrCopyLink','Copier le lien')}</button>
          </div>
        </div>
      </div>,
    document.body)}

    {reportMsg&&createPortal(
      <div className="cc-confirm-overlay" onClick={()=>setReportMsg(null)}>
        <div className="cc-report-modal" onClick={e=>e.stopPropagation()}>
          <h3><i className="fas fa-flag"/> {t('pages.bookClubDetail.reportTitle','Signaler un message')}</h3>
          <p className="cc-report-modal__preview">
            <strong>{reportMsg.author?.full_name||reportMsg.author?.username||'Membre'}</strong>
            <span>{reportMsg.content?.slice(0,100)||({VOICE:'Note vocale',IMAGE:'Photo',FILE:'Fichier',QUOTE:'Citation'}[reportMsg.message_type]||'')}</span>
          </p>
          <label>{t('pages.bookClubDetail.reportReason','Motif')}</label>
          <div className="cc-report-modal__reasons">
            {[['SPAM','Spam'],['HARASSMENT','Harcèlement'],['INAPPROPRIATE','Contenu inapproprié'],['HATE_SPEECH','Discours haineux'],['OTHER','Autre']].map(([val,label])=>(
              <button key={val} className={`cc-report-reason${reportReason===val?' cc-report-reason--active':''}`} onClick={()=>setReportReason(val)}>{label}</button>
            ))}
          </div>
          <label>{t('pages.bookClubDetail.reportDetails','Détails (optionnel)')}</label>
          <textarea value={reportDetails} onChange={e=>setReportDetails(e.target.value)} rows={2} placeholder={t('pages.bookClubDetail.reportDetailsPlaceholder','Précisez si nécessaire...')}/>
          <div className="cc-report-modal__actions">
            <button className="cc-btn cc-btn--leave" onClick={()=>setReportMsg(null)}>{t('common.cancel','Annuler')}</button>
            <button className="cc-btn cc-btn--danger" onClick={submitReport} disabled={!reportReason||reportSending}>{reportSending?'...':t('pages.bookClubDetail.reportSubmit','Signaler')}</button>
          </div>
        </div>
      </div>,
    document.body)}

    {showDeleteConfirm&&createPortal(
      <div className="cc-confirm-overlay">
        <div className="cc-confirm">
          <i className="fas fa-exclamation-triangle"/>
          <h3>Supprimer ce club ?</h3>
          <p>Cette action est irréversible. Tous les messages et membres seront perdus.</p>
          <div className="cc-confirm__actions">
            <button onClick={()=>setShowDeleteConfirm(false)}>Annuler</button>
            <button className="cc-confirm__delete" onClick={deleteClub}>Supprimer</button>
          </div>
        </div>
      </div>,
    document.body)}
  </>);
}
