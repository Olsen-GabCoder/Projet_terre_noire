/**
 * TnTooltip — Lightweight tooltip (Vague 4 A.0)
 *
 * Usage:
 *   <TnTooltip text="Fondee en 2025">
 *     <button>Logo</button>
 *   </TnTooltip>
 */
import React, { useState, useRef, useCallback, useId } from 'react';

export default function TnTooltip({
  text,
  position = 'top',
  delay = 200,
  maxWidth = 240,
  align,
  disabled = false,
  children,
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const tooltipId = useId();

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [disabled, delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && visible) {
      hide();
    }
  }, [visible, hide]);

  return (
    <span
      className="tn-tooltip-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {React.cloneElement(React.Children.only(children), {
        'aria-describedby': visible ? tooltipId : undefined,
      })}
      {!disabled && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`tn-tooltip tn-tooltip--${position}${align ? ` tn-tooltip--${align}` : ''}${visible ? ' tn-tooltip--visible' : ''}`}
          style={{ maxWidth }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
