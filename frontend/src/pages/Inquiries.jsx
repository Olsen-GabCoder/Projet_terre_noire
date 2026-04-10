import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import '../styles/Inquiries.css';

const STATUS_KEYS = {
  PENDING: 'pages.inquiries.statusPending',
  ANSWERED: 'pages.inquiries.statusAnswered',
  CLOSED: 'pages.inquiries.statusClosed',
};

const STATUS_COLORS = {
  PENDING: 'pending',
  ANSWERED: 'answered',
  CLOSED: 'closed',
};

const Inquiries = () => {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | sent | received

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await organizationService.getInquiries();
        setInquiries(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch {
        setInquiries([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // Simple client-side filter — the API returns both sent and received
  const filtered = inquiries; // API already returns both, no further filtering needed

  return (
    <div className="inquiries-page">
      <SEO title={t('pages.inquiries.seoTitle')} />

      <div className="inquiries-page__header">
        <h1>{t('pages.inquiries.title')}</h1>
        <p>{t('pages.inquiries.subtitle')}</p>
      </div>

      {loading ? (
        <div className="dashboard-loading"><div className="admin-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="inquiries-page__empty">
          <i className="fas fa-envelope-open" />
          <p>{t('pages.inquiries.empty')}</p>
          <Link to="/organizations" className="inquiries-page__cta">
            {t('pages.inquiries.browseOrganizations')}
          </Link>
        </div>
      ) : (
        <div className="inquiries-page__list">
          {filtered.map((inq) => (
            <Link key={inq.id} to={`/inquiries/${inq.id}`} className="inquiry-card">
              <div className="inquiry-card__icon">
                {inq.target_org ? <i className="fas fa-building" /> : <i className="fas fa-user-tie" />}
              </div>
              <div className="inquiry-card__body">
                <h3>{inq.subject}</h3>
                <p className="inquiry-card__target">
                  {inq.target_name ? (
                    <><i className="fas fa-arrow-right" /> {inq.target_name}</>
                  ) : (
                    <span>{t('pages.inquiries.from')} {inq.sender_name}</span>
                  )}
                </p>
                <span className="inquiry-card__date">
                  {new Date(inq.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <span className={`inquiry-card__status inquiry-card__status--${STATUS_COLORS[inq.status]}`}>
                {STATUS_KEYS[inq.status] ? t(STATUS_KEYS[inq.status]) : inq.status_display || inq.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inquiries;
