import React from 'react';
import { shade } from './shade';

export default function TnBookCover({ book, style }) {
  const accent = book.accent || '#7a3a1c';
  const collection = book.collection
    || (typeof book.category === 'object' ? book.category?.name : book.category)
    || 'Terre Noire';
  const authorName = typeof book.author === 'object' ? book.author?.full_name : book.author;

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      background: `linear-gradient(155deg, ${accent} 0%, ${shade(accent, -28)} 100%)`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '14px 12px',
      color: '#fbf3e3',
      ...style,
    }}>
      <svg style={{ position: 'absolute', top: 8, right: 8, opacity: 0.5 }} width="22" height="22" viewBox="0 0 22 22">
        <path d="M0 11 L11 0 L22 11 L11 22 Z" fill="none" stroke="#fbf3e3" strokeWidth="0.8" />
        <circle cx="11" cy="11" r="2" fill="#fbf3e3" />
      </svg>

      <div style={{
        fontFamily: 'var(--tn-mono)', fontSize: 8, letterSpacing: '0.18em',
        textTransform: 'uppercase', opacity: 0.75,
      }}>
        Collection · {collection}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 17, lineHeight: 1.1, fontWeight: 700,
          marginBottom: 8, textWrap: 'balance',
        }}>{book.title}</div>
        <div style={{
          fontFamily: 'var(--tn-mono)', fontSize: 9,
          letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8,
        }}>{authorName}</div>
      </div>

      <div style={{
        position: 'absolute', left: 12, bottom: 8, right: 12,
        height: 2, background: 'rgba(255,255,255,0.25)',
      }} />
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: 'rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}
