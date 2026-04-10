import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const SecuritySettings = () => {
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [setupMode, setSetupMode] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');

  const STATUS_LABELS = {
    SUCCESS: { label: t('pages.profile.security.statusSuccess'), cls: 'sec-badge--success' },
    FAILED: { label: t('pages.profile.security.statusFailed'), cls: 'sec-badge--danger' },
    BLOCKED: { label: t('pages.profile.security.statusBlocked'), cls: 'sec-badge--danger' },
    TOTP_PENDING: { label: t('pages.profile.security.statusTotpPending'), cls: 'sec-badge--warning' },
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sessionsRes, historyRes, authRes] = await Promise.all([
          api.get('/users/sessions/'),
          api.get('/users/me/login-history/'),
          api.get('/users/check-auth/'),
        ]);
        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
        setLoginHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        const user = authRes.data?.user || authRes.data;
        setTotpEnabled(user?.totp_enabled || false);
        if (user?.totp_enabled) {
          const codesRes = await api.get('/users/totp/backup-codes/');
          setBackupCodesCount(codesRes.data.remaining_codes || 0);
        }
      } catch { /* */ }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const flash = (type, text) => { type === 'error' ? setError(text) : setMsg(text); setTimeout(() => { setMsg(''); setError(''); }, 5000); };

  const revokeSession = async (key) => {
    try { await api.delete(`/users/sessions/${key}/`); setSessions(p => p.filter(s => s.session_key !== key)); flash('ok', t('pages.profile.security.sessionRevoked')); }
    catch (e) { flash('error', handleApiError(e)); }
  };

  const revokeAll = async () => {
    try { const r = await api.post('/users/sessions/revoke-all/'); flash('ok', t('pages.profile.security.sessionsRevoked', { count: r.data.revoked_count })); setSessions(p => p.filter(s => s.is_current)); }
    catch (e) { flash('error', handleApiError(e)); }
  };

  const startSetup = async () => {
    setSetupLoading(true);
    try { const r = await api.post('/users/totp/setup/'); setSetupData(r.data); setSetupMode(true); }
    catch (e) { flash('error', handleApiError(e)); }
    setSetupLoading(false);
  };

  const confirmSetup = async () => {
    if (!setupCode.trim()) return;
    setSetupLoading(true);
    try {
      const r = await api.post('/users/totp/verify-setup/', { secret: setupData.secret, code: setupCode });
      setTotpEnabled(true); setBackupCodes(r.data.backup_codes || []); setBackupCodesCount(r.data.backup_codes?.length || 0);
      setSetupMode(false); setSetupData(null); setSetupCode(''); flash('ok', t('pages.profile.security.twoFAEnabled'));
      refreshUser();
    } catch (e) { flash('error', handleApiError(e)); }
    setSetupLoading(false);
  };

  const disable2FA = async () => {
    if (!disablePassword) return;
    try { await api.post('/users/totp/disable/', { password: disablePassword }); setTotpEnabled(false); setDisablePassword(''); flash('ok', t('pages.profile.security.twoFADisabled')); refreshUser(); }
    catch (e) { flash('error', handleApiError(e)); }
  };

  if (loading) return <div className="sec-loading"><i className="fas fa-spinner fa-spin" /> {t('pages.profile.security.loading')}</div>;

  return (
    <div className="sec">
      {msg && <div className="sec-alert sec-alert--success"><i className="fas fa-check-circle" /> {msg}</div>}
      {error && <div className="sec-alert sec-alert--error"><i className="fas fa-exclamation-circle" /> {error}</div>}

      {/* ═══ 2FA ═══ */}
      <div className="sec-card">
        <div className="sec-card__head">
          <div className="sec-card__icon sec-card__icon--shield"><i className="fas fa-shield-halved" /></div>
          <div>
            <h3>{t('pages.profile.security.twoFATitle')}</h3>
            <p>{t('pages.profile.security.twoFADescription')}</p>
          </div>
          <span className={`sec-badge ${totpEnabled ? 'sec-badge--success' : 'sec-badge--muted'}`}>
            {totpEnabled ? t('pages.profile.security.enabled') : t('pages.profile.security.disabled')}
          </span>
        </div>

        <div className="sec-card__body">
          {/* Backup codes display after setup */}
          {backupCodes.length > 0 && (
            <div className="sec-backup">
              <div className="sec-backup__head"><i className="fas fa-exclamation-triangle" /> {t('pages.profile.security.saveBackupCodes')}</div>
              <div className="sec-backup__grid">
                {backupCodes.map((c, i) => <code key={i}>{c}</code>)}
              </div>
              <button className="sec-btn" onClick={() => setBackupCodes([])}>{t('pages.profile.security.backupCodesSaved')}</button>
            </div>
          )}

          {/* Setup 2FA */}
          {!totpEnabled && !setupMode && (
            <button className="sec-btn sec-btn--primary" onClick={startSetup} disabled={setupLoading}>
              <i className="fas fa-qrcode" /> {setupLoading ? t('pages.profile.security.loading') : t('pages.profile.security.setup2FA')}
            </button>
          )}

          {setupMode && setupData && (
            <div className="sec-setup">
              <p>{t('pages.profile.security.scanQRCode')}</p>
              <div className="sec-setup__qr">
                <img src={setupData.qr_code} alt="QR Code TOTP" />
              </div>
              <p className="sec-setup__manual">
                {t('pages.profile.security.manualCode')} <code>{setupData.secret}</code>
              </p>
              <div className="sec-setup__verify">
                <input type="text" value={setupCode} onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" maxLength={6} className="sec-setup__input" autoFocus />
                <button className="sec-btn sec-btn--primary" onClick={confirmSetup} disabled={setupLoading || setupCode.length < 6}>{t('pages.profile.security.verify')}</button>
                <button className="sec-btn" onClick={() => { setSetupMode(false); setSetupData(null); }}>{t('pages.profile.security.cancel')}</button>
              </div>
            </div>
          )}

          {totpEnabled && !setupMode && backupCodes.length === 0 && (
            <div className="sec-2fa-active">
              <p><i className="fas fa-check-circle" /> {t('pages.profile.security.twoFAActive', { count: backupCodesCount })}</p>
              <div className="sec-2fa-disable">
                <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={t('pages.profile.security.passwordToDisable')} className="sec-input" />
                <button className="sec-btn sec-btn--danger" onClick={disable2FA} disabled={!disablePassword}>{t('pages.profile.security.disable')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Sessions ═══ */}
      <div className="sec-card">
        <div className="sec-card__head">
          <div className="sec-card__icon sec-card__icon--sessions"><i className="fas fa-laptop" /></div>
          <div>
            <h3>{t('pages.profile.security.activeSessions')}</h3>
            <p>{t('pages.profile.security.sessionCount', { count: sessions.length })}</p>
          </div>
          {sessions.length > 1 && (
            <button className="sec-btn sec-btn--sm sec-btn--danger" onClick={revokeAll}>
              <i className="fas fa-sign-out-alt" /> {t('pages.profile.security.revokeAll')}
            </button>
          )}
        </div>
        <div className="sec-card__body sec-card__body--flush">
          {sessions.map(s => (
            <div key={s.session_key} className={`sec-session ${s.is_current ? 'sec-session--current' : ''}`}>
              <div className="sec-session__icon">
                <i className={`fas ${s.device_type === 'MOBILE' ? 'fa-mobile-screen-button' : s.device_type === 'TABLET' ? 'fa-tablet-screen-button' : 'fa-display'}`} />
              </div>
              <div className="sec-session__info">
                <strong>{s.device_name}</strong>
                {s.is_current && <span className="sec-badge sec-badge--success sec-badge--sm">{t('pages.profile.security.currentSession')}</span>}
                <span className="sec-session__meta">IP {s.ip_address} — {new Date(s.last_active_at).toLocaleString('fr-FR')}</span>
              </div>
              {!s.is_current && (
                <button className="sec-btn sec-btn--sm" onClick={() => revokeSession(s.session_key)}>{t('pages.profile.security.revoke')}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Historique ═══ */}
      <div className="sec-card">
        <div className="sec-card__head">
          <div className="sec-card__icon sec-card__icon--history"><i className="fas fa-clock-rotate-left" /></div>
          <div>
            <h3>{t('pages.profile.security.recentActivity')}</h3>
            <p>{t('pages.profile.security.last7Days')}</p>
          </div>
        </div>
        <div className="sec-card__body sec-card__body--flush">
          {loginHistory.length === 0 ? (
            <div className="sec-empty"><i className="fas fa-history" /> {t('pages.profile.security.noRecentActivity')}</div>
          ) : (() => {
            // Grouper par jour, limiter à 7 jours
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recent = loginHistory.filter(e => new Date(e.created_at).getTime() > sevenDaysAgo);
            const grouped = {};
            recent.forEach(entry => {
              const day = new Date(entry.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
              if (!grouped[day]) grouped[day] = [];
              grouped[day].push(entry);
            });
            const days = Object.entries(grouped);

            if (days.length === 0) return <div className="sec-empty"><i className="fas fa-check-circle" /> {t('pages.profile.security.noActivityLast7Days')}</div>;

            return days.map(([day, entries]) => (
              <div key={day}>
                <div className="sec-history-day">{day}</div>
                {entries.slice(0, 5).map(entry => {
                  const st = STATUS_LABELS[entry.status] || { label: entry.status, cls: '' };
                  return (
                    <div key={entry.id} className="sec-history-row">
                      <div className={`sec-history-dot ${entry.status === 'SUCCESS' ? 'sec-history-dot--ok' : 'sec-history-dot--fail'}`} />
                      <div className="sec-history-info">
                        <div className="sec-history-top">
                          <span className={`sec-badge sec-badge--sm ${st.cls}`}>{st.label}</span>
                          <span className="sec-history-device">{entry.device_info || t('pages.profile.security.unknownDevice')}</span>
                        </div>
                        <span className="sec-history-meta">
                          {new Date(entry.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — IP {entry.ip_address}
                          {entry.failure_reason && <> — <em>{entry.failure_reason.replace('_', ' ').toLowerCase()}</em></>}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {entries.length > 5 && (
                  <div className="sec-history-more">{t('pages.profile.security.moreAttempts', { count: entries.length - 5 })}</div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
