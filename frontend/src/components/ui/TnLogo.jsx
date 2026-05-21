import React from 'react';

export default function TnLogo({ size = 36, light = true }) {
  const bg = light ? '#0A0A0A' : '#FAFAF5';
  const fg = light ? '#FAFAF5' : '#0A0A0A';
  const accent = '#E8601C';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="64" height="64" rx="10" fill={bg} />
      <path d="M8 10 L24 10 L20 14 L12 14 L12 22 L8 22 Z" fill={accent} opacity="0.9" />
      <path d="M56 54 L40 54 L44 50 L52 50 L52 42 L56 42 Z" fill={accent} opacity="0.9" />
      <text
        x="32" y="40"
        textAnchor="middle"
        fontFamily="'Playfair Display', serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="2"
        fill={fg}
      >TN</text>
    </svg>
  );
}
