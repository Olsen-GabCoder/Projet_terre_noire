/**
 * EmojiPicker — Emoji picker with categories, search, and sticker packs
 * Extracted from BookClubDetail.jsx — zero functional change
 */
import { useState, useRef } from 'react';
import { EMOJI_CATEGORIES, STICKER_PACKS } from './clubUtils';

export default function EmojiPicker({ onSelect }) {
  const [cat, setCat] = useState(0);
  const [search, setSearch] = useState('');
  const gridRef = useRef(null);
  const filtered = search
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(search))
    : EMOJI_CATEGORIES[cat].emojis;
  const switchCat = (i) => {
    setCat(i);
    setSearch('');
    if (gridRef.current) gridRef.current.scrollTop = 0;
  };
  return (
    <div className="cc-epicker">
      <div className="cc-epicker__search">
        <input value={search} onChange={e => { setSearch(e.target.value); if (gridRef.current) gridRef.current.scrollTop = 0; }} placeholder="Rechercher un emoji..." />
      </div>
      <div className="cc-epicker__cats">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={c.name} className={`cc-epicker__cat${!search && i === cat ? ' cc-epicker__cat--active' : ''}`} onClick={() => switchCat(i)} title={c.name}>{c.icon}</button>
        ))}
      </div>
      <div className="cc-epicker__label">{search ? `Résultats pour « ${search} »` : EMOJI_CATEGORIES[cat].name}</div>
      <div className="cc-epicker__grid" ref={gridRef}>
        {filtered.length > 0 ? filtered.map((em, i) => (
          <button key={`${cat}-${em}-${i}`} className="cc-epicker__em" onClick={() => onSelect({native: em})}>{em}</button>
        )) : <div className="cc-epicker__empty">Aucun résultat</div>}
      </div>
    </div>
  );
}

export function StickerPacks({ onSelect, onClose }) {
  return (
    <div className="cc-sticker-packs">
      {STICKER_PACKS.map(pack => (
        <div key={pack.name} className="cc-sticker-pack">
          <div className="cc-sticker-pack__name">{pack.icon} {pack.name}</div>
          <div className="cc-sticker-pack__grid">
            {pack.stickers.map(s => (
              <button key={s} className="cc-sticker" onClick={() => { onSelect(s); if (onClose) onClose(); }}>{s}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
