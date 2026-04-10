import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authorDashboardService from '../../services/authorDashboardService';
import { handleApiError } from '../../services/api';
import '../../styles/AuthorSpace.css';

const fmtPrice = (v) => Math.round(v || 0).toLocaleString('fr-FR');

const AuthorSales = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authorDashboardService.getSales()
      .then(res => setData(res.data))
      .catch(err => setError(handleApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!data) return null;

  return (
    <div className="author-space">
      <div className="author-space__header">
        <h1 className="author-space__title"><i className="fas fa-coins" style={{ color: '#f59e0b' }} /> {t('dashboard.authorSales.title')}</h1>
        <p className="author-space__subtitle">{t('dashboard.authorSales.subtitle')}</p>
      </div>

      {/* KPI */}
      <div className="as-stats">
        <div className="as-stat">
          <div className="as-stat__icon as-stat__icon--revenue"><i className="fas fa-coins" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{fmtPrice(data.total_revenue)} F</div>
            <div className="as-stat__label">{t('dashboard.authorSales.totalRevenue')}</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon as-stat__icon--sales"><i className="fas fa-shopping-bag" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.total_units}</div>
            <div className="as-stat__label">{t('dashboard.authorSales.copiesSold')}</div>
          </div>
        </div>
        <div className="as-stat">
          <div className="as-stat__icon as-stat__icon--books"><i className="fas fa-receipt" /></div>
          <div className="as-stat__body">
            <div className="as-stat__value">{data.total_orders}</div>
            <div className="as-stat__label">{t('dashboard.authorSales.orders')}</div>
          </div>
        </div>
      </div>

      {/* Détail par livre */}
      {data.per_book?.length > 0 && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-chart-bar" /> {t('dashboard.authorSales.detailByBook')}</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>{t('dashboard.authorSales.colBook')}</th><th>{t('dashboard.authorSales.colSold')}</th><th>{t('dashboard.authorSales.colRevenue')}</th></tr>
              </thead>
              <tbody>
                {data.per_book.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {b.book__cover_image && <img src={b.book__cover_image} alt="" style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                        <Link to={`/books/${b.book__id}`} style={{ fontWeight: 600, color: 'var(--color-text-heading)', textDecoration: 'none', fontSize: '0.8125rem' }}>
                          {b.book__title}
                        </Link>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.units_sold}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-heading)' }}>{fmtPrice(b.revenue)} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commandes récentes */}
      {data.recent_orders?.length > 0 && (
        <div className="as-card">
          <div className="as-card__header">
            <h2 className="as-card__title"><i className="fas fa-history" /> {t('dashboard.authorSales.recentOrders')}</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="as-table">
              <thead>
                <tr><th>#</th><th>{t('dashboard.authorSales.colBook')}</th><th>{t('dashboard.authorSales.colQty')}</th><th>{t('dashboard.authorSales.colAmount')}</th><th>{t('dashboard.authorSales.colStatus')}</th></tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted-ui)' }}>
                      {o.order__id}<br />{new Date(o.order__created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{o.book__title}</td>
                    <td>{o.quantity}</td>
                    <td style={{ fontWeight: 600 }}>{fmtPrice(parseFloat(o.price) * o.quantity)} F</td>
                    <td><span className="ob-badge">{o.order__status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total_orders === 0 && (
        <div className="as-card">
          <div className="as-card__body as-empty">
            <div className="as-empty__icon"><i className="fas fa-chart-line" /></div>
            <h3>{t('dashboard.authorSales.noSales')}</h3>
            <p>{t('dashboard.authorSales.noSalesDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorSales;
