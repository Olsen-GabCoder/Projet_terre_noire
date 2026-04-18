import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/ClubChat.css';

const CAT_KEYS = { GENERAL:'pages.bookClubDetail.cat.general',ROMAN:'pages.bookClubDetail.cat.novels',POESIE:'pages.bookClubDetail.cat.poetry',ESSAI:'pages.bookClubDetail.cat.essays',JEUNESSE:'pages.bookClubDetail.cat.youth',SF_FANTASY:'pages.bookClubDetail.cat.sfFantasy',POLAR:'pages.bookClubDetail.cat.thriller',BD_MANGA:'pages.bookClubDetail.cat.comics',CLASSIQUES:'pages.bookClubDetail.cat.classics',AFRICAIN:'pages.bookClubDetail.cat.african',DEVELOPPEMENT:'pages.bookClubDetail.cat.selfHelp',AUTRE:'pages.bookClubDetail.cat.other' };
const EMOJIS = ['👍','❤️','😂','😮','📖','🔥','👏','💡','🎉','✨','😊','🤔','📚','✅','💬'];

const fmtTime = (d, lng) => new Date(d).toLocaleTimeString(lng === 'en' ? 'en-US' : 'fr-FR',{hour:'2-digit',minute:'2-digit'});
const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const ini = n => (n||'?')[0].toUpperCase();

function fmtDate(d, t) {
  const dt=new Date(d),now=new Date();
  if(dt.toDateString()===now.toDateString()) return t('pages.bookClubDetail.today');
  const y=new Date(now);y.setDate(now.getDate()-1);
  if(dt.toDateString()===y.toDateString()) return t('pages.bookClubDetail.yesterday');
  return dt.toLocaleDateString(t('common.locale', { defaultValue: 'fr-FR' }),{day:'numeric',month:'long',year:'numeric'});
}

function groupByDate(msgs) {
  const out=[];let last='';
  for(const m of msgs){const d=new Date(m.created_at).toDateString();if(d!==last){out.push({_date:true,d:m.created_at});last=d;}out.push(m);}
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
  const [sidebarOpen,setSidebarOpen]=useState(false);
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
  const [showScrollBtn,setShowScrollBtn]=useState(false);
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
    const [m,mb]=await Promise.all([socialService.getClubMessages(slug),socialService.getClubMembers(slug)]);
    setMessages(Array.isArray(m.data)?m.data:m.data.results||[]);
    setMembers(Array.isArray(mb.data)?mb.data:mb.data.results||[]);
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
    try{const r=await socialService.sendClubMessage(slug,{content:msgText,message_type:'TEXT'});setMessages(p=>[...p,r.data]);setMsgText('');setShowEmoji(false);inputRef.current?.focus();}
    catch{toast.error('Erreur.');}setSending(false);
  };

  // Send file
  const uploadFile=async(file,type)=>{
    const fd=new FormData();fd.append('message_type',type);fd.append('attachment',file);fd.append('attachment_name',file.name);fd.append('content','');
    try{const r=await socialService.sendClubMessage(slug,fd);setMessages(p=>[...p,r.data]);}catch{toast.error('Erreur fichier.');}
  };

  // Emoji
  const insertEmoji=em=>{setMsgText(p=>p+em);inputRef.current?.focus();};

  // Voice
  const startRec=async()=>{try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mr=new MediaRecorder(stream);chunksRef.current=[];
    mr.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data);};
    mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(chunksRef.current,{type:'audio/webm'});
      const file=new File([blob],`voice-${Date.now()}.webm`,{type:'audio/webm'});
      const fd=new FormData();fd.append('message_type','VOICE');fd.append('attachment',file);fd.append('attachment_name',file.name);fd.append('voice_duration',recTime);fd.append('content','');
      try{const r=await socialService.sendClubMessage(slug,fd);setMessages(p=>[...p,r.data]);}catch{}setRecTime(0);};
    recRef.current=mr;mr.start();setIsRec(true);setRecTime(0);
    timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000);
  }catch{toast.error('Micro inaccessible.');}};
  const stopRec=()=>{if(recRef.current&&isRec){recRef.current.stop();setIsRec(false);clearInterval(timerRef.current);}};
  const cancelRec=()=>{if(recRef.current&&isRec){recRef.current.stream.getTracks().forEach(t=>t.stop());recRef.current=null;chunksRef.current=[];setIsRec(false);setRecTime(0);clearInterval(timerRef.current);}};

  // Join/leave
  const join=async()=>{try{await socialService.joinClub(slug);setIsMember(true);toast.success('Bienvenue !');const r=await socialService.getClubMembers(slug);setMembers(Array.isArray(r.data)?r.data:r.data.results||[]);}catch(e){toast.error(handleApiError(e));}};
  const leave=async()=>{try{await socialService.leaveClub(slug);setIsMember(false);toast.success('Vous avez quitté le club.');}catch(e){toast.error(handleApiError(e));}};

  const isAdmin=club&&user&&(club.creator?.id===user.id||members.some(m=>m.user?.id===user.id&&m.role==='ADMIN'));

  const reloadMembers=async()=>{const r=await socialService.getClubMembers(slug);setMembers(Array.isArray(r.data)?r.data:r.data.results||[]);};

  const changeRole=async(memberId,role)=>{try{await socialService.updateMemberRole(slug,memberId,role);toast.success('Rôle mis à jour.');await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const kick=async(memberId,name)=>{if(!window.confirm(`Exclure ${name} du club ?`))return;try{await socialService.kickMember(slug,memberId);toast.success(`${name} exclu.`);await reloadMembers();}catch(e){toast.error(handleApiError(e));}};
  const invite=async()=>{if(!inviteInput.trim())return;setInviting(true);try{await socialService.inviteToClub(slug,inviteInput.trim());toast.success('Membre ajouté !');setInviteInput('');await reloadMembers();}catch(e){toast.error(handleApiError(e));}setInviting(false);};
  const deleteClub=async()=>{try{await socialService.deleteClub(slug);toast.success('Club supprimé.');window.location.href='/clubs';}catch(e){toast.error(handleApiError(e));}};
  const copyLink=()=>{navigator.clipboard.writeText(window.location.href);toast.success('Lien copié !');};

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

  return(
    <div className="cc">
      <SEO title={club.name}/>

      {/* ══ SIDEBAR ══ */}
      <aside className={`cc-side ${sidebarOpen?'cc-side--open':''}`}>
        <button className="cc-side__close" onClick={()=>setSidebarOpen(false)} aria-label={t('common.close')}><i className="fas fa-times"/></button>

        <div className="cc-side__profile">
          <div className="cc-side__avatar">
            {club.cover_image?<img src={club.cover_image} alt=""/>:<i className="fas fa-users"/>}
          </div>
          <h2>{club.name}</h2>
          <div className="cc-side__badges">
            <span className={`cc-side__vis ${club.is_public?'':'cc-side__vis--priv'}`}><i className={`fas ${club.is_public?'fa-globe':'fa-lock'}`}/> {club.is_public?'Public':'Privé'}</span>
            <span><i className="fas fa-users"/> {members.length}/{club.max_members}</span>
            {club.frequency_display&&<span><i className="fas fa-calendar-alt"/> {club.frequency_display}</span>}
          </div>

          {/* Actions rapides */}
          <div className="cc-side__quick">
            <button onClick={copyLink} title="Partager"><i className="fas fa-share-alt"/><span>Partager</span></button>
            {isAdmin&&<button onClick={openEdit} title="Modifier"><i className="fas fa-pen"/><span>Modifier</span></button>}
            {isAdmin&&<button onClick={()=>{setSidebarTab('members');}} title="Inviter"><i className="fas fa-user-plus"/><span>Inviter</span></button>}
          </div>
        </div>

        {/* Onglets sidebar */}
        <div className="cc-side__tabs">
          <button className={sidebarTab==='info'?'active':''} onClick={()=>setSidebarTab('info')}><i className="fas fa-info-circle"/> Infos</button>
          <button className={sidebarTab==='members'?'active':''} onClick={()=>setSidebarTab('members')}><i className="fas fa-users"/> Membres</button>
          <button className={sidebarTab==='media'?'active':''} onClick={()=>{setSidebarTab('media');loadMedia();}}><i className="fas fa-photo-video"/> Médias</button>
        </div>

        <div className="cc-side__scroll">

          {/* ── TAB: Info ── */}
          {sidebarTab==='info'&&<>
            {club.description&&<div className="cc-sec"><h4 className="cc-sec__t">Description</h4><p>{club.description}</p></div>}
            {cats.length>0&&<div className="cc-sec"><h4 className="cc-sec__t">Thèmes</h4><div className="cc-tags">{cats.map((c,i)=><span key={i} className="cc-tag cc-tag--pri">{CAT_KEYS[c] ? t(CAT_KEYS[c]) : c}</span>)}</div></div>}
            {club.tags?.length>0&&<div className="cc-sec"><h4 className="cc-sec__t">Mots-clés</h4><div className="cc-tags">{club.tags.map((t,i)=><span key={i} className="cc-tag">#{t}</span>)}</div></div>}

            {/* Livre en cours */}
            <div className="cc-sec">
              <h4 className="cc-sec__t">Lecture en cours</h4>
              {club.current_book?(
                <Link to={`/books/${club.current_book.id}`} className="cc-book-link">
                  {club.current_book.cover_image&&<img src={club.current_book.cover_image} alt=""/>}
                  <div><strong>{club.current_book.title}</strong>{club.current_book.author?.full_name&&<span>{club.current_book.author.full_name}</span>}</div>
                </Link>
              ):<p style={{fontSize:'0.82rem',color:'var(--color-text-muted-ui)'}}>Aucun livre sélectionné</p>}
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

            {club.rules&&<div className="cc-sec"><h4 className="cc-sec__t">Règles</h4><div className="cc-rules">{club.rules}</div></div>}
          </>}

          {/* ── TAB: Membres ── */}
          {sidebarTab==='members'&&<>
            {/* Inviter */}
            {isAdmin&&<div className="cc-sec">
              <h4 className="cc-sec__t">Inviter un membre</h4>
              <div className="cc-invite">
                <input value={inviteInput} onChange={e=>setInviteInput(e.target.value)} placeholder="Nom d'utilisateur ou email" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();invite();}}}/>
                <button onClick={invite} disabled={inviting||!inviteInput.trim()}>{inviting?<i className="fas fa-spinner fa-spin"/>:<i className="fas fa-plus"/>}</button>
              </div>
            </div>}

            <div className="cc-sec">
              <h4 className="cc-sec__t">Membres ({members.length})</h4>
              <div className="cc-members">
                {members.map(m=>{
                  const isCreator=m.user?.id===club.creator?.id;
                  const canManage=isAdmin&&!isCreator&&m.user?.id!==user?.id;
                  return(
                    <div key={m.id} className="cc-member">
                      <div className="cc-member__av">{m.user?.profile_image?<img src={m.user.profile_image} alt=""/>:<span>{ini(m.user?.full_name||m.user?.username)}</span>}</div>
                      <div className="cc-member__info">
                        <strong>{m.user?.full_name||m.user?.username}</strong>
                        {isCreator&&<span className="cc-member__badge cc-member__badge--creator">Créateur</span>}
                        {!isCreator&&m.role==='ADMIN'&&<span className="cc-member__badge">Admin</span>}
                        {!isCreator&&m.role==='MEMBER'&&<span className="cc-member__badge cc-member__badge--member">Membre</span>}
                      </div>
                      {canManage&&<div className="cc-member__actions">
                        {m.role==='MEMBER'?
                          <button onClick={()=>changeRole(m.id,'ADMIN')} title="Promouvoir admin"><i className="fas fa-arrow-up"/></button>:
                          <button onClick={()=>changeRole(m.id,'MEMBER')} title="Rétrograder membre"><i className="fas fa-arrow-down"/></button>
                        }
                        <button onClick={()=>kick(m.id,m.user?.full_name||m.user?.username)} title="Exclure" className="cc-member__kick"><i className="fas fa-user-slash"/></button>
                      </div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>}

          {/* ── TAB: Médias ── */}
          {sidebarTab==='media'&&<>
            <div className="cc-sec">
              <h4 className="cc-sec__t">Médias partagés</h4>
              {!media?<div style={{textAlign:'center',padding:'1rem'}}><i className="fas fa-spinner fa-spin"/></div>:media.length===0?<p style={{fontSize:'0.82rem',color:'var(--color-text-muted-ui)',textAlign:'center'}}>Aucun média partagé</p>:(
                <div className="cc-media-grid">
                  {media.map(m=>(
                    <a key={m.id} href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`cc-media-item cc-media-item--${m.message_type.toLowerCase()}`}>
                      {m.message_type==='IMAGE'?<img src={m.attachment_url} alt=""/>:
                       m.message_type==='VOICE'?<><i className="fas fa-microphone"/><span>{fmtDur(m.voice_duration||0)}</span></>:
                       <><i className="fas fa-file-alt"/><span>{m.attachment_name||'Fichier'}</span></>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>}

          {/* ── TAB: Edit ── */}
          {sidebarTab==='edit'&&editForm&&<>
            <div className="cc-sec">
              <h4 className="cc-sec__t">Modifier le club</h4>
              <div className="cc-edit-form">
                <label>Nom</label>
                <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
                <label>Description</label>
                <textarea value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} rows={4}/>
                <label>Règles</label>
                <textarea value={editForm.rules} onChange={e=>setEditForm({...editForm,rules:e.target.value})} rows={3}/>
                <div className="cc-edit-actions">
                  <button className="cc-btn cc-btn--join" onClick={saveEdit} disabled={saving}>{saving?'Enregistrement...':'Enregistrer'}</button>
                  <button className="cc-btn cc-btn--leave" onClick={()=>setSidebarTab('info')}>Annuler</button>
                </div>
              </div>
            </div>
          </>}
        </div>

        <div className="cc-side__footer">
          {user&&!isMember&&<button className="cc-btn cc-btn--join" onClick={join}><i className="fas fa-sign-in-alt"/> Rejoindre</button>}
          {user&&isMember&&club.creator?.id!==user.id&&<button className="cc-btn cc-btn--leave" onClick={leave}><i className="fas fa-sign-out-alt"/> Quitter le club</button>}
          {isAdmin&&<button className="cc-btn cc-btn--danger" onClick={()=>setShowDeleteConfirm(true)} aria-label={t('common.delete')}><i className="fas fa-trash"/> Supprimer le club</button>}
          <Link to="/clubs" className="cc-side__back"><i className="fas fa-arrow-left"/> Tous les clubs</Link>
        </div>

        {/* Confirm delete */}
        {showDeleteConfirm&&<div className="cc-confirm-overlay">
          <div className="cc-confirm">
            <i className="fas fa-exclamation-triangle"/>
            <h3>Supprimer ce club ?</h3>
            <p>Cette action est irréversible. Tous les messages et membres seront perdus.</p>
            <div className="cc-confirm__actions">
              <button onClick={()=>setShowDeleteConfirm(false)}>Annuler</button>
              <button className="cc-confirm__delete" onClick={deleteClub}>Supprimer</button>
            </div>
          </div>
        </div>}
      </aside>
      {sidebarOpen&&<div className="cc-overlay" onClick={()=>setSidebarOpen(false)}/>}

      {/* ══ CHAT ══ */}
      <div className="cc-chat">
        {/* Mobile topbar */}
        <div className="cc-mob" onClick={()=>setSidebarOpen(true)}>
          <div className="cc-mob__av">{club.cover_image?<img src={club.cover_image} alt=""/>:<i className="fas fa-users"/>}</div>
          <div className="cc-mob__txt"><h1>{club.name}</h1><span>{members.length} membre{members.length>1?'s':''} &middot; Appuyez pour les détails</span></div>
        </div>

        {/* Messages */}
        <div className="cc-msgs" ref={chatRef} onScroll={onChatScroll}>
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
                <div key={item.id} className={`cc-msg ${own?'cc-msg--own':''}`}>
                  {!own&&<div className="cc-msg__av">{item.author?.profile_image?<img src={item.author.profile_image} alt=""/>:<span>{ini(item.author?.full_name||item.author?.username)}</span>}</div>}
                  <div className="cc-msg__bubble">
                    {!own&&<div className="cc-msg__name">{item.author?.full_name||item.author?.username||'Membre'}</div>}
                    {item.message_type==='TEXT'&&<p className="cc-msg__text">{item.content}</p>}
                    {item.message_type==='IMAGE'&&item.attachment_url&&<a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__img"><img src={item.attachment_url} alt=""/></a>}
                    {item.message_type==='VOICE'&&<div className="cc-msg__voice"><audio controls src={item.attachment_url} preload="metadata"/>{item.voice_duration&&<span>{fmtDur(item.voice_duration)}</span>}</div>}
                    {item.message_type==='FILE'&&item.attachment_url&&<a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="cc-msg__file"><i className="fas fa-file-alt"/><span>{item.attachment_name||'Fichier'}</span><i className="fas fa-download cc-msg__dl"/></a>}
                    <time className="cc-msg__time">{fmtTime(item.created_at, i18n.language)}</time>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef}/>
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn&&<button className="cc-scroll-btn" onClick={scrollToBottom}><i className="fas fa-chevron-down"/></button>}

        {/* Emoji picker */}
        {showEmoji&&<div className="cc-emoji"><div className="cc-emoji__grid">{EMOJIS.map(em=><button key={em} type="button" onClick={()=>insertEmoji(em)}>{em}</button>)}</div></div>}

        {/* Input */}
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
                <button type="button" className="cc-bar__icon" onClick={()=>setShowEmoji(p=>!p)} title="Emoji"><i className="fas fa-smile"/></button>
                <button type="button" className="cc-bar__icon" onClick={()=>imgRef.current?.click()} title="Image"><i className="fas fa-image"/></button>
                <button type="button" className="cc-bar__icon" onClick={()=>fileRef.current?.click()} title="Fichier"><i className="fas fa-paperclip"/></button>
                <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadFile(e.target.files[0],'IMAGE');e.target.value='';}}/>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadFile(e.target.files[0],'FILE');e.target.value='';}}/>
                <input ref={inputRef} className="cc-bar__input" value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Écrire un message..." disabled={sending} onFocus={()=>setShowEmoji(false)}/>
                {msgText.trim()?(
                  <button type="submit" className="cc-bar__send" disabled={sending}><i className="fas fa-paper-plane"/></button>
                ):(
                  <button type="button" className="cc-bar__mic" onClick={startRec}><i className="fas fa-microphone"/></button>
                )}
              </form>
            )}
          </div>
        ):(
          <div className="cc-joinbar">
            {user?<><span>Rejoignez le club pour discuter</span><button onClick={join}><i className="fas fa-sign-in-alt"/> Rejoindre</button></>:<><span>Connectez-vous pour participer</span><Link to="/login">Se connecter</Link></>}
          </div>
        )}
      </div>
    </div>
  );
}
