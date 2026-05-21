import React from 'react';

export default function TnPlaceholder({ label, kind = 'cover', style, children }) {
  const cls =
    kind === 'dark' ? 'tn-placeholder tn-placeholder--dark'
    : kind === 'cover' ? 'tn-placeholder tn-placeholder--cover'
    : 'tn-placeholder';
  return (
    <div className={cls} style={style}>
      {children}
      {label ? <span className="tn-placeholder__label">{label}</span> : null}
    </div>
  );
}
