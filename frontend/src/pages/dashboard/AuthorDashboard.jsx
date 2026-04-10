import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authorDashboardService from '../../services/authorDashboardService';
import { handleApiError } from '../../services/api';
import '../../styles/AuthorSpace.css';

const AuthorDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authorDashboardService.getDashboard()
      .then(res => setData(res.data))
      .catch(err => setError(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!data) return null;

  const fmtPrice = (v) => Math.round(v || 0).toLocaleString('fr-FR');

  return (
    <div className="author-space">
      {/* Header */}
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title">
            {data.author?.display_name || data.author?.full_name || t('dashboard.author.title')}
          </h1>
          <p className="author-space__subtitle">
            {t('dashboard.author.subtitle')}
          </p>
        </div>
        <Link to="/dashboard/author/books" className="as-cta">
          <i className="fas fa-plus" /> {t('dashboard.author.publishBook')}
        </Link>
      </div>

      {/* Stats KPI */}
      <div className="as-stats">
        <Link to="/dashboard/author/books" className="as-stat">
          <div className="as-stat__icon as-stat__icon--books"><i className="fas fa-book" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.book_count}</div>
            <div className="as-stat__label">{t('dashboard.author.books')}</div>
          </div>
          {data.books_available > 0 && (
            <span className="as-stat__badge">{t('dashboard.author.online', { count: data.books_available })}</span>
          )}
        </Link>

        <Link to="/dashboard/author/sales" className="as-stat">
          <div className="as-stat__icon as-stat__icon--sales"><i className="fas fa-shopping-bag" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.total_sales}</div>
            <div className="as-stat__label">{t('dashboard.author.copiesSold')}</div>
          </div>
        </Link>

        <Link to="/dashboard/author/sales" className="as-stat">
          <div className="as-stat__icon as-stat__icon--revenue"><i className="fas fa-coins" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(data.total_revenue)} F</div>
            <div className="as-stat__label">{t('dashboard.author.revenue')}</div>
          </div>
        </Link>

        <Link to="/dashboard/author/reviews" className="as-stat">
          <div className="as-stat__icon as-stat__icon--rating"><i className="fas fa-star" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.avg_rating > 0 ? `${data.avg_rating} ★` : '—'}</div>
            <div className="as-stat__label">{t('dashboard.author.avgRating')}</div>
          </div>
        </Link>

        <Link to="/dashboard/author/reviews" className="as-stat">
          <div className="as-stat__icon as-stat__icon--reviews"><i className="fas fa-comments" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.total_reviews}</div>
            <div className="as-stat__label">{t('dashboard.author.readerReviews')}</div>
          </div>
        </Link>

        <Link to="/dashboard/author/manuscripts" className="as-stat">
          <div className="as-stat__icon as-stat__icon--manuscripts"><i className="fas fa-file-alt" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.manuscripts_total}</div>
            <div className="as-stat__label">{t('dashboard.author.manuscriptsSubmitted')}</div>
          </div>
          {data.manuscripts_pending > 0 && (
            <span className="as-stat__badge as-stat__badge--warn">{t('dashboard.author.pending', { count: data.manuscripts_pending })}</span>
          )}
        </Link>
      </div>

      {/* Alerte manuscrits */}
      {data.manuscripts_pending > 0 && (
        <div className="as-alert">
          <i className="fas fa-inbox" />
          <span>
            {t('dashboard.author.manuscriptsPendingAlert', { count: data.manuscripts_pending })}{' '}
            <Link to="/dashboard/author/manuscripts">{t('dashboard.author.viewTracking')}</Link>
          </span>
        </div>
      )}

      {/* Accès rapides */}
      <div className="as-shortcuts">
        <Link to="/dashboard/author/books" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
            <i className="fas fa-book" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.author.manageBooks')}</span>
          <span className="as-shortcut__desc">{t('dashboard.author.manageBooksDesc')}</span>
        </Link>

        <Link to="/dashboard/author/profile" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <i className="fas fa-id-card" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.author.publicProfile')}</span>
          <span className="as-shortcut__desc">{t('dashboard.author.publicProfileDesc')}</span>
        </Link>

        <Link to="/submit-manuscript" className="as-shortcut">
          <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
            <i className="fas fa-paper-plane" />
          </div>
          <span className="as-shortcut__label">{t('dashboard.author.submitManuscript')}</span>
          <span className="as-shortcut__desc">{t('dashboard.author.submitManuscriptDesc')}</span>
        </Link>

        {data.author?.id && (
          <Link to={`/authors/${data.author.id}`} className="as-shortcut">
            <div className="as-shortcut__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <i className="fas fa-eye" />
            </div>
            <span className="as-shortcut__label">{t('dashboard.author.myAuthorPage')}</span>
            <span className="as-shortcut__desc">{t('dashboard.author.myAuthorPageDesc')}</span>
          </Link>
        )}
      </div>

      {/* État vide si aucun livre */}
      {data.book_count === 0 && (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-rocket" /></div>
            <h3>{t('dashboard.author.welcomeTitle')}</h3>
            <p>{t('dashboard.author.welcomeDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorDashboard;
