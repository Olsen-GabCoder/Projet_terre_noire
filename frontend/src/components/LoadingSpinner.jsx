/**
 * LoadingSpinner — Premium loader (Vague 5)
 *
 * Variants:
 *   "wave"          — Gold animated SVG wave + Playfair text (default)
 *   "wave-gradient" — Gold→orange gradient wave
 *   "circle"        — Legacy border spinner
 *   "dots"          — Legacy 3 dots
 */
import React from 'react';
import '../styles/LoadingSpinner.css';

const WAVE_PATH = 'M 0 20 Q 10 5, 20 20 Q 30 35, 40 20 Q 50 5, 60 20 Q 70 35, 80 20';

function WaveLoader({ gradient }) {
  return (
    <svg className="tn-loader__wave" viewBox="0 0 80 40" aria-hidden="true">
      {gradient && (
        <defs>
          <linearGradient id="tn-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C8956C" />
            <stop offset="50%" stopColor="#E8601C" />
            <stop offset="100%" stopColor="#C8956C" />
          </linearGradient>
        </defs>
      )}
      <path d={WAVE_PATH} style={gradient ? { stroke: 'url(#tn-wave-grad)' } : undefined} />
    </svg>
  );
}

const LoadingSpinner = ({
  size = 'medium',
  fullPage = false,
  text = 'Chargement...',
  variant = 'wave',
  color = 'primary',
}) => {
  const isWave = variant === 'wave' || variant === 'wave-gradient';
  const sizeClass = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md';

  // Legacy variants (circle / dots)
  if (!isWave) {
    const sizeClasses = { small: 'spinner-small', medium: 'spinner-medium', large: 'spinner-large' };
    const colorClasses = { primary: 'spinner-primary', success: 'spinner-success', warning: 'spinner-warning', danger: 'spinner-danger', light: 'spinner-light', dark: 'spinner-dark' };

    if (fullPage) {
      return (
        <div className="spinner-fullpage" role="status" aria-busy="true">
          <div className={`spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
            {variant === 'circle' && <div className="spinner-circle" />}
            {variant === 'dots' && <div className="spinner-dots"><div className="dot" /><div className="dot" /><div className="dot" /></div>}
          </div>
          {text && <p className="spinner-text">{text}</p>}
        </div>
      );
    }
    return (
      <div className="spinner-container" role="status" aria-busy="true">
        <div className={`spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
          {variant === 'circle' && <div className="spinner-circle" />}
          {variant === 'dots' && <div className="spinner-dots"><div className="dot" /><div className="dot" /><div className="dot" /></div>}
        </div>
        {text && <span className="spinner-label">{text}</span>}
      </div>
    );
  }

  // Wave variant (premium)
  const content = (
    <div className={`tn-loader tn-loader--${sizeClass}${fullPage ? ' tn-loader--on-dark' : ''}`} role="status" aria-busy="true">
      <WaveLoader gradient={variant === 'wave-gradient'} />
      {text && <span className="tn-loader__text">{text}</span>}
    </div>
  );

  if (fullPage) {
    return <div className="tn-loader-fullpage">{content}</div>;
  }
  return content;
};

export default LoadingSpinner;
