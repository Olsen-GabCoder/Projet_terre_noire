/**
 * Club utility functions and constants
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { Link } from 'react-router-dom';

// ── Constants ──

export const CAT_KEYS = {
  GENERAL: 'pages.bookClubDetail.cat.general',
  ROMAN: 'pages.bookClubDetail.cat.novels',
  POESIE: 'pages.bookClubDetail.cat.poetry',
  ESSAI: 'pages.bookClubDetail.cat.essays',
  JEUNESSE: 'pages.bookClubDetail.cat.youth',
  SF_FANTASY: 'pages.bookClubDetail.cat.sfFantasy',
  POLAR: 'pages.bookClubDetail.cat.thriller',
  BD_MANGA: 'pages.bookClubDetail.cat.comics',
  CLASSIQUES: 'pages.bookClubDetail.cat.classics',
  AFRICAIN: 'pages.bookClubDetail.cat.african',
  DEVELOPPEMENT: 'pages.bookClubDetail.cat.selfHelp',
  AUTRE: 'pages.bookClubDetail.cat.other',
};

export const EMOJIS = ['👍','❤️','😂','😮','📖','🔥','👏','💡','🎉','✨','😊','🤔','📚','✅','💬'];

export const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]{1,12}$/u;

export const isEmojiOnly = (text) => text && EMOJI_ONLY_RE.test(text.trim()) && text.trim().length <= 12;

export const EMOJI_ANIM = {
  beat: new Set(['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','💟','❤️‍🔥','❤️‍🩹','💔','🥰','😍','😘','🫶','🫶🏾']),
  wiggle: new Set(['😂','🤣','😆','😅','😹','🤪','😜','😝','🙃']),
  bounce: new Set(['👍','👏','👏🏾','🙌','🙌🏾','🎉','🎊','🥳','🎈','💪','💪🏾','✊','✊🏾','👊','🤜','🤛','🫡']),
  glow: new Set(['🔥','❤️‍🔥','💯','⭐','🌟','✨','💫','☀️','🌈','💡','🏆']),
  wave: new Set(['👋','🤚','🖐️','✋','🫱','🫲']),
  nod: new Set(['🤔','🧐','😏','🫢','🤭','🤫','😌']),
  shake: new Set(['😢','😭','😤','😡','🤯','😱','😨','😰','🥶','🥵']),
  float: new Set(['🌙','☁️','🎵','🎶','🍃','🍂','🌺','🌸','🪻','🌹','☕','🍵']),
};

export function getEmojiAnim(em) {
  for (const [anim, set] of Object.entries(EMOJI_ANIM)) {
    if (set.has(em)) return anim;
  }
  return 'pop';
}

const SPLIT_EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F|\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic}))*/gu;

export function renderAnimatedEmojis(text) {
  const emojis = text.match(SPLIT_EMOJI_RE);
  if (!emojis) return text;
  return emojis.map((em, i) => (
    <span key={i} className={`cc-anim-emoji cc-anim-emoji--${getEmojiAnim(em)}`} style={{animationDelay: `${i * 0.12}s`}}>{em}</span>
  ));
}

export const STICKER_PACKS = [
  { name: 'Lecture', icon: '📖', stickers: ['📖✨','📚💫','🤓👆','😴📖','☕📚','🏆📖','📖❤️','🤯📚','📝💡','🎧📖'] },
  { name: 'Réactions', icon: '😄', stickers: ['🎉🎊','👏👏👏','🔥🔥🔥','💯','❤️‍🔥','🥳🎈','😂🤣','🙌✨','💪🏾','🫡'] },
  { name: 'Afrique', icon: '🌍', stickers: ['🌍📚','☀️🌴','🥁🎶','🫶🏾','✊🏾','🌺','🦁','🏠📖','🍵📖','🌙✨'] },
];

export const EMOJI_CATEGORIES = [
  { name:'Fréquents', icon:'🕐', emojis:['👍','❤️','😂','😮','🔥','👏','🎉','✨','😊','🤔','💯','🙏','😍','🥰','💪'] },
  { name:'Visages', icon:'😀', emojis:['😀','😃','😄','😁','😆','🥹','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','🤪','😜','🤑','🤗','🤭','🫢','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { name:'Gestes', icon:'👋', emojis:['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','💪','🫶🏾','✊🏾','👏🏾','🙌🏾','💪🏾'] },
  { name:'Livres', icon:'📚', emojis:['📖','📚','📕','📗','📘','📙','📓','📒','📃','📝','✏️','🖊️','🖋️','✒️','📎','🔖','🏷️','📑','🗒️','📰','🗞️','💡','🎓','🏫','🧠','💭','📜'] },
  { name:'Nature', icon:'🌿', emojis:['🌍','🌎','🌏','🌺','🌸','🌼','🌻','🌹','🌷','🪻','🌱','🌿','☘️','🍀','🌴','🌳','🌲','🍃','🍂','🍁','🌾','☀️','🌤️','⛅','🌈','🌙','⭐','✨','🌟','💫'] },
  { name:'Nourriture', icon:'☕', emojis:['☕','🍵','🧃','🥤','🍶','🍷','🍺','🥂','🍰','🎂','🍫','🍬','🍭','🍩','🍪','🥐','🍞','🥖','🥨','🧀','🍕','🍔','🍟','🌮','🍜','🍲','🥘','🍛'] },
  { name:'Activités', icon:'🎉', emojis:['🎉','🎊','🎈','🎀','🎁','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎵','🎶','🎤','🎧','🎸','🎹','🥁','🎬','🎨','🎭','🎪','🎯','🎲','🧩','♟️','🎮'] },
  { name:'Symboles', icon:'❤️', emojis:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','✅','❌','❓','❗','‼️','⁉️','💬','💭','🗯️','💤'] },
];

export const MENTION_RE = /@(\w+)/g;

export const fmtTime = (d, lng) => new Date(d).toLocaleTimeString(lng === 'en' ? 'en-US' : 'fr-FR', {hour:'2-digit',minute:'2-digit'});
export const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
export const ini = n => (n||'?')[0].toUpperCase();

export function highlightSearch(text, term) {
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

export function renderWithMentions(text, membersList, searchTerm) {
  if (!text) return text;
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
  return parts.map((p, i) => {
    if (p.type === 'mention') {
      return p.userId
        ? <Link key={i} to={`/profile/${p.userId}`} className="cc-mention" onClick={e=>e.stopPropagation()}>@{p.username}</Link>
        : <span key={i} className="cc-mention">@{p.username}</span>;
    }
    if (searchTerm) return <span key={i}>{highlightSearch(p.value, searchTerm)}</span>;
    return p.value;
  });
}

export function fmtDate(d, t) {
  const dt = new Date(d), now = new Date();
  if (dt.toDateString() === now.toDateString()) return t('pages.bookClubDetail.today');
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return t('pages.bookClubDetail.yesterday');
  return dt.toLocaleDateString(t('common.locale', { defaultValue: 'fr-FR' }), {day:'numeric',month:'long',year:'numeric'});
}

export function groupByDate(msgs) {
  const out = []; let lastDate = '', lastAuthor = null;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) { out.push({_date: true, d: m.created_at}); lastDate = d; lastAuthor = null; }
    const sameAuthor = m.author?.id === lastAuthor && !m.is_deleted;
    out.push({...m, _consecutive: sameAuthor});
    lastAuthor = m.is_deleted ? null : m.author?.id;
  }
  return out;
}

export function canEditMsg(msg) {
  if (msg.message_type !== 'TEXT' || msg.is_deleted) return false;
  const elapsed = Date.now() - new Date(msg.created_at).getTime();
  if (elapsed > 15 * 60 * 1000) return false;
  return true;
}
