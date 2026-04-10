import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../../services/api';
import api from '../../services/api';
import '../../styles/AuthorSpace.css';

const STATUS_CONFIG_BASE = {
  PENDING: { key: 'pending', bg: '#fef3c7', color: '#d97706' },
  REVIEWING: { key: 'reviewing', bg: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' },
  ACCEPTED: { key: 'accepted', bg: '#d1fae5', color: '#059669' },
  REJECTED: { key: 'rejected', bg: '#fee2e2', color: '#dc2626' },
};

const AuthorManuscripts = () => {
  const { t } = useTranslation();
  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/manuscripts/mine/')
      .then(res => setManuscripts(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(err => setError(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  const pending = manuscripts.filter(m => m.status === 'PENDING').length;
  const accepted = manuscripts.filter(m => m.status === 'ACCEPTED').length;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-file-alt" style={{ color: '#ec4899' }} /> {t('dashboard.authorManuscripts.title')}</h1>
          <p className="author-space__subtitle">
            {t('dashboard.authorManuscripts.statsLine', { submissions: manuscripts.length, pending, accepted })}
          </p>
        </div>
        <Link to="/submit-manuscript" className="dashboard-btn dashboard-btn--primary">
          <i className="fas fa-paper-plane" /> {t('dashboard.authorManuscripts.submit')}
        </Link>
      </div>

      {/* Stats rapides */}
      {manuscripts.length > 0 && (
        <div className="as-stats" style={{ marginBottom: '1.25rem' }}>
          {Object.entries(STATUS_CONFIG_BASE).map(([key, cfg]) => {
            const count = manuscripts.filter(m => m.status === key).length;
            if (count === 0) return null;
            return (
              <div key={key} className="as-stat" style={{ cursor: 'default' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 6 }} />
                <div className="as-stat__body">
                  <div className="as-stat__value" style={{ fontSize: '1.1rem' }}>{count}</div>
                  <div className="as-stat__label">{t(`dashboard.authorManuscripts.status_${cfg.key}`)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {manuscripts.length === 0 ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-paper-plane" /></div>
            <h3>{t('dashboard.authorManuscripts.noManuscripts')}</h3>
            <p>{t('dashboard.authorManuscripts.noManuscriptsDesc')}</p>
            <Link to="/submit-manuscript" className="dashboard-btn dashboard-btn--primary" style={{ marginTop: '1rem' }}>
              <i className="fas fa-paper-plane" /> {t('dashboard.authorManuscripts.submitManuscript')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="as-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr>
                  <th>{t('dashboard.authorManuscripts.colManuscript')}</th>
                  <th>{t('dashboard.authorManuscripts.colGenre')}</th>
                  <th>{t('dashboard.authorManuscripts.colRecipient')}</th>
                  <th>{t('dashboard.authorManuscripts.colStatus')}</th>
                  <th>{t('dashboard.authorManuscripts.colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map(ms => {
                  const cfgBase = STATUS_CONFIG_BASE[ms.status];
                  const cfg = cfgBase ? { label: t(`dashboard.authorManuscripts.status_${cfgBase.key}`), bg: cfgBase.bg, color: cfgBase.color } : { label: ms.status_display || ms.status, bg: 'var(--color-bg-section-alt)', color: 'var(--color-text-body)' };
                  return (
                    <tr key={ms.id}>
                      <td>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-heading)', display: 'block' }}>{ms.title}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)' }}>
                            {ms.author_name}{ms.pen_name ? ` (${ms.pen_name})` : ''}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{ms.genre}</td>
                      <td style={{ fontSize: '0.8rem' }}>{ms.target_organization_name || <em style={{ color: 'var(--color-text-muted-ui)' }}>{t('dashboard.authorManuscripts.openMarket')}</em>}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, color: cfg.color,
                        }}>
                          {cfg.label}
                        </span>
                        {ms.status === 'REJECTED' && ms.rejection_reason && (
                          <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: 3, maxWidth: 180, lineHeight: 1.3 }}>
                            {ms.rejection_reason.length > 80 ? ms.rejection_reason.slice(0, 80) + '…' : ms.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)', whiteSpace: 'nowrap' }}>
                        {ms.submitted_at ? new Date(ms.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorManuscripts;
