import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authorDashboardService from '../../services/authorDashboardService';
import { handleApiError } from '../../services/api';
import '../../styles/AuthorSpace.css';

const RATING_FILTERS_KEYS = [
  { value: '', key: 'allRatings' },
  { value: '5', label: '★★★★★ (5)' },
  { value: '4', label: '★★★★ (4)' },
  { value: '3', label: '★★★ (3)' },
  { value: '2', label: '★★ (2)' },
  { value: '1', label: '★ (1)' },
];

const AuthorReviews = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('');

  const fetchReviews = async (p = 1, rating = '') => {
    try {
      setLoading(true);
      const params = { page: p };
      if (rating) params.rating = rating;
      const res = await authorDashboardService.getReviews(params);
      setReviews(res.data.results || []);
      setPagination({ count: res.data.count || 0, next: res.data.next, previous: res.data.previous });
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(page, ratingFilter); }, [page, ratingFilter]);

  const totalPages = Math.ceil(pagination.count / 10);
  const renderStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  if (loading && reviews.length === 0) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;

  return (
    <div className="author-space">
      <div className="author-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="author-space__title"><i className="fas fa-star" style={{ color: '#f59e0b' }} /> {t('dashboard.authorReviews.title')}</h1>
          <p className="author-space__subtitle">{t('dashboard.authorReviews.subtitle', { count: pagination.count })}</p>
        </div>
        <select
          value={ratingFilter}
          onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: 8,
            border: '1px solid var(--color-border-card)',
            fontSize: '0.8125rem', fontFamily: 'inherit',
            background: 'var(--color-bg-card)', color: 'var(--color-text-heading)',
          }}
        >
          {RATING_FILTERS_KEYS.map(f => <option key={f.value} value={f.value}>{f.key ? t(`dashboard.authorReviews.${f.key}`) : f.label}</option>)}
        </select>
      </div>

      {reviews.length === 0 ? (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-comments" /></div>
            <h3>{ratingFilter ? t('dashboard.authorReviews.noReviewsForRating') : t('dashboard.authorReviews.noReviews')}</h3>
            <p>{t('dashboard.authorReviews.noReviewsDesc')}</p>
          </div>
        </div>
      ) : (
        <>
          {reviews.map(review => (
            <div key={review.id} className="as-card">
              <div className="as-card__body" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.02em' }}>{renderStars(review.rating || 0)}</span>
                    <span style={{ marginLeft: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>
                      {review.user_display}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Link to={`/books/${review.book}`} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                      {t('dashboard.authorReviews.viewBook')}
                    </Link>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted-ui)', marginTop: 2 }}>
                      {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-body)', lineHeight: 1.6 }}>
                  {review.comment || <em style={{ color: 'var(--color-text-muted-ui)' }}>{t('dashboard.authorReviews.noComment')}</em>}
                </p>
                {review.replies?.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                    {review.replies.map(r => (
                      <div key={r.id} style={{ fontSize: '0.8125rem', color: 'var(--color-text-body)', background: 'var(--color-bg-section-alt)', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{r.user_display}</strong>
                        <p style={{ margin: '0.2rem 0 0' }}>{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <nav className="ob-pag">
              <button className="ob-pag__btn" disabled={!pagination.previous} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-arrow-left" /> {t('dashboard.authorReviews.previous')}
              </button>
              <span className="ob-pag__info">{t('dashboard.authorReviews.pageInfo', { page, totalPages, count: pagination.count })}</span>
              <button className="ob-pag__btn" disabled={!pagination.next} onClick={() => setPage(p => p + 1)}>
                {t('dashboard.authorReviews.next')} <i className="fas fa-arrow-right" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default AuthorReviews;
