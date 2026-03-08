// frontend/src/components/LoadingSpinner.jsx
import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  fullPage = false,
  text = '',
  variant = 'circle',
  color = 'primary'
}) => {
  // Définition des classes en fonction des props
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large',
  };

  const colorClasses = {
    primary: 'spinner-primary',
    success: 'spinner-success',
    warning: 'spinner-warning',
    danger: 'spinner-danger',
    light: 'spinner-light',
    dark: 'spinner-dark'
  };

  // Spinner en plein écran
  if (fullPage) {
    return (
      <div className="spinner-fullpage">
        <div className={`spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
          {variant === 'circle' && <div className="spinner-circle"></div>}
          {variant === 'dots' && (
            <div className="spinner-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
        </div>
        {text && <p className="spinner-text">{text}</p>}
      </div>
    );
  }

  // Spinner normal
  return (
    <div className="spinner-container">
      <div className={`spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
        {variant === 'circle' && <div className="spinner-circle"></div>}
        {variant === 'dots' && (
          <div className="spinner-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
      </div>
      {text && <span className="spinner-label">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;