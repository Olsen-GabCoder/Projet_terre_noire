import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/Auth.css';

const INACTIVITY_LIMIT = 25 * 60 * 1000; // 25 min avant avertissement
const LOGOUT_DELAY = 5 * 60 * 1000;      // 5 min après avertissement → logout
const EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

const SessionTimeoutWarning = () => {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 min en secondes
  const inactivityTimer = useRef(null);
  const logoutTimer = useRef(null);
  const countdownInterval = useRef(null);

  const resetTimers = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    setShowWarning(false);
    setCountdown(300);

    if (!isAuthenticated) return;

    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(300);
      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      logoutTimer.current = setTimeout(() => {
        logout();
      }, LOGOUT_DELAY);
    }, INACTIVITY_LIMIT);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      if (!showWarning) resetTimers();
    };

    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimers();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [isAuthenticated, showWarning, resetTimers]);

  const handleStayLoggedIn = async () => {
    try {
      await api.post('/token/refresh/', {});
    } catch { /* */ }
    resetTimers();
  };

  const handleLogout = () => {
    logout();
    setShowWarning(false);
  };

  if (!showWarning || !isAuthenticated) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">
          <i className="fas fa-clock" />
        </div>
        <h2>{t('sessionTimeout.title')}</h2>
        <p>
          {t('sessionTimeout.expiresIn')}{' '}
          <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
        </p>
        <p className="session-timeout-sub">
          {t('sessionTimeout.stayQuestion')}
        </p>
        <div className="session-timeout-actions">
          <button className="session-timeout-btn session-timeout-btn--primary" onClick={handleStayLoggedIn}>
            {t('sessionTimeout.stayLoggedIn')}
          </button>
          <button className="session-timeout-btn" onClick={handleLogout}>
            {t('sessionTimeout.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;
