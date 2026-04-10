import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../services/servicesService';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import '../styles/ServiceDetail.css';

const SERVICE_TYPE_ICONS = {
  CORRECTION: 'fas fa-spell-check',
  ILLUSTRATION: 'fas fa-palette',
  TRANSLATION: 'fas fa-language',
  COVER_DESIGN: 'fas fa-paint-brush',
  LAYOUT: 'fas fa-layer-group',
  PROOFREADING: 'fas fa-glasses',
};

const ServiceDetail = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await servicesService.getListing(slug);
        setListing(res.data);
      } catch (err) {
        setError(handleApiError(err));
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="sd__error"><i className="fas fa-exclamation-triangle" aria-hidden="true" /> {error}</div>;
  if (!listing) return null;

  const typeIcon = SERVICE_TYPE_ICONS[listing.service_type] || 'fas fa-briefcase';
  const providerInitial = (listing.provider_name || '?')[0].toUpperCase();

  return (
    <div className="sd">
      <SEO title={listing.title} description={listing.description?.slice(0, 160)} />

      {/* ═══ COVER ═══ */}
      <div className="sd__cover">
        <div className="sd__cover-gradient" />
        <div className="sd__cover-icon">
          <i className={typeIcon} aria-hidden="true" />
        </div>
      </div>

      {/* ═══ PROFIL HEADER ═══ */}
      <div className="sd__profile">
        <div className="sd__profile-inner">
          <div className="sd__profile-logo">
            <i className={typeIcon} aria-hidden="true" />
          </div>

          <div className="sd__profile-info">
            <div className="sd__profile-name-row">
              <h1>{listing.title}</h1>
            </div>
            <div className="sd__profile-meta">
              <span className="sd__profile-type"><i className={typeIcon} /> {listing.service_type_display || listing.service_type}</span>
              <span><i className="fas fa-clock" /> {listing.turnaround_days} {t('pages.services.days')}</span>
            </div>
          </div>

          <div className="sd__profile-actions">
            {isAuthenticated ? (
              <Link to={`/services/request/${listing.id}`} className="sd__btn sd__btn--primary">
                <i className="fas fa-paper-plane" aria-hidden="true" /> {t('pages.services.requestService')}
              </Link>
            ) : (
              <Link to="/login" className="sd__btn sd__btn--primary">
                <i className="fas fa-sign-in-alt" aria-hidden="true" /> {t('pages.services.loginToRequest')}
              </Link>
            )}
            <Link to="/services" className="sd__btn sd__btn--secondary">
              <i className="fas fa-arrow-left" aria-hidden="true" /> {t('pages.services.backToServices')}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="sd__stats">
          <div className="sd__stat">
            <strong>{parseInt(listing.base_price).toLocaleString()} <small>FCFA</small></strong>
            <span><i className="fas fa-tag" style={{ marginRight: 3 }} /> {listing.price_type_display || listing.price_type}</span>
          </div>
          <div className="sd__stat">
            <strong>{listing.turnaround_days}j</strong>
            <span><i className="fas fa-clock" style={{ marginRight: 3 }} /> {t('pages.services.turnaround')}</span>
          </div>
          <div className="sd__stat">
            <strong>{listing.languages?.length || 0}</strong>
            <span><i className="fas fa-language" style={{ marginRight: 3 }} /> {t('pages.services.languages')}</span>
          </div>
          <div className="sd__stat">
            <strong>{listing.genres?.length || 0}</strong>
            <span><i className="fas fa-bookmark" style={{ marginRight: 3 }} /> {t('pages.services.genres')}</span>
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="sd__body">
        <div className="sd__grid">

          {/* Description */}
          <div className="sd__cell sd__cell--wide">
            <h2><i className="fas fa-align-left" /> {t('pages.services.description')}</h2>
            <p className="sd__cell-text">{listing.description}</p>
          </div>

          {/* Provider */}
          <div className="sd__cell">
            <h2><i className="fas fa-user" /> {t('pages.services.provider')}</h2>
            <Link to={`/professionals/${listing.provider_slug}`} className="sd__provider-card">
              <div className="sd__provider-avatar">
                {listing.provider_image
                  ? <img src={listing.provider_image} alt={listing.provider_name} />
                  : <span>{providerInitial}</span>
                }
              </div>
              <div className="sd__provider-info">
                <strong>{listing.provider_name}</strong>
                {listing.provider_verified && <span className="sd__verified"><i className="fas fa-check-circle" /> {t('pages.services.verified')}</span>}
              </div>
              <i className="fas fa-chevron-right sd__provider-arrow" aria-hidden="true" />
            </Link>
          </div>

          {/* Languages */}
          {listing.languages?.length > 0 && (
            <div className="sd__cell">
              <h2><i className="fas fa-language" /> {t('pages.services.languages')}</h2>
              <div className="sd__tags">
                {listing.languages.map((l, i) => <span key={i} className="sd__tag">{l}</span>)}
              </div>
            </div>
          )}

          {/* Genres */}
          {listing.genres?.length > 0 && (
            <div className="sd__cell">
              <h2><i className="fas fa-bookmark" /> {t('pages.services.genres')}</h2>
              <div className="sd__tags">
                {listing.genres.map((g, i) => <span key={i} className="sd__tag">{g}</span>)}
              </div>
            </div>
          )}

          {/* Pricing card */}
          <div className="sd__cell sd__cell--accent">
            <h2><i className="fas fa-receipt" /> {t('pages.services.pricing')}</h2>
            <div className="sd__price-display">
              <span className="sd__price-amount">{parseInt(listing.base_price).toLocaleString()} FCFA</span>
              <span className="sd__price-unit">/ {listing.price_type_display || listing.price_type}</span>
            </div>
            <div className="sd__price-meta">
              <div className="sd__price-row">
                <i className="fas fa-clock" aria-hidden="true" />
                <span>{t('pages.services.deliveryIn')} <strong>{listing.turnaround_days} {t('pages.services.days')}</strong></span>
              </div>
            </div>
            {isAuthenticated ? (
              <Link to={`/services/request/${listing.id}`} className="sd__btn sd__btn--primary sd__btn--full">
                <i className="fas fa-paper-plane" aria-hidden="true" /> {t('pages.services.requestService')}
              </Link>
            ) : (
              <Link to="/login" className="sd__btn sd__btn--secondary sd__btn--full">
                <i className="fas fa-sign-in-alt" aria-hidden="true" /> {t('pages.services.loginToRequest')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
