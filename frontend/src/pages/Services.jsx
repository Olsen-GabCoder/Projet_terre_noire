import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import servicesService from '../services/servicesService';
import { useReveal } from '../hooks/useReveal';
import '../styles/Services.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Services = () => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const SERVICE_TYPES = [
    { value: '', label: t('pages.services.all'), icon: 'fas fa-th' },
    { value: 'CORRECTION', label: t('pages.services.correction'), icon: 'fas fa-spell-check', color: '#ec4899' },
    { value: 'ILLUSTRATION', label: t('pages.services.illustration'), icon: 'fas fa-palette', color: '#f59e0b' },
    { value: 'TRANSLATION', label: t('pages.services.translation'), icon: 'fas fa-language', color: '#10b981' },
    { value: 'COVER_DESIGN', label: t('pages.services.coverDesign'), icon: 'fas fa-image', color: '#3b82f6' },
    { value: 'LAYOUT', label: t('pages.services.layout'), icon: 'fas fa-align-left', color: '#8b5cf6' },
    { value: 'PROOFREADING', label: t('pages.services.proofreading'), icon: 'fas fa-check-double', color: '#6366f1' },
  ];

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filter) params.service_type = filter;
        const res = await servicesService.getListings(params);
        setListings(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch { setListings([]); }
      setLoading(false);
    };
    fetchListings();
  }, [filter]);

  const activeType = SERVICE_TYPES.find(t => t.value === filter);

  return (
    <div className="services-page">
      <SEO title={t('pages.services.title')} description={t('pages.services.subtitle')} />

      <PageHero
        title={t('pages.services.title')}
        subtitle={t('pages.services.subtitle')}
      >
        <div className="sv-hero__actions">
          <Link to="/professionals" className="sv-hero__btn sv-hero__btn--primary">
            <i className="fas fa-address-book" /> {t('pages.services.browseProfessionals')}
          </Link>
          <Link to="/submit-manuscript" className="sv-hero__btn sv-hero__btn--outline">
            <i className="fas fa-paper-plane" /> {t('pages.services.submitManuscript')}
          </Link>
        </div>
        <div className="sv-hero__stats">
          {SERVICE_TYPES.filter(st => st.value).map(st => (
            <div key={st.value} className="sv-hero__stat">
              <div className="sv-hero__stat-icon" style={{ color: st.color }}><i className={st.icon} /></div>
              <span className="sv-hero__stat-label">{st.label}</span>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Content */}
      <div ref={revealRef} className="sv-content reveal-section">
        {/* Filters */}
        <div className="sv-filters">
          <h2 className="sv-filters__title"><i className="fas fa-filter" /> {t('pages.services.filterLabel')}</h2>
          <div className="sv-filters__pills">
            {SERVICE_TYPES.map((t) => (
              <button
                key={t.value}
                className={`sv-pill ${filter === t.value ? 'sv-pill--active' : ''}`}
                onClick={() => setFilter(t.value)}
                style={filter === t.value && t.color ? { '--pill-color': t.color } : {}}
              >
                {t.icon && <i className={t.icon} />} {t.label}
              </button>
            ))}
          </div>
          {filter && (
            <p className="sv-filters__active">
              {t('pages.services.showing')} <strong>{activeType?.label}</strong> {t('pages.services.services')}
              <button onClick={() => setFilter('')}><i className="fas fa-times" /> {t('pages.services.clear')}</button>
            </p>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="sv-loading"><div className="admin-spinner" /><p>{t('pages.services.loading')}</p></div>
        ) : listings.length === 0 ? (
          <div className="sv-empty">
            <div className="sv-empty__icon"><i className="fas fa-briefcase" /></div>
            <h2>{t('pages.services.noResults')}</h2>
            <p>{t('pages.services.noResultsDesc')}</p>
            <Link to="/professionals" className="sv-empty__btn">
              <i className="fas fa-users" /> {t('pages.services.browseProfessionals')}
            </Link>
          </div>
        ) : (
          <>
            <p className="sv-count">{listings.length} {t(listings.length > 1 ? 'pages.services.servicesPlural' : 'pages.services.servicesSingular')} {t('pages.services.available')}</p>
            <div className="sv-grid">
              {listings.map((listing) => {
                const typeInfo = SERVICE_TYPES.find(t => t.value === listing.service_type);
                return (
                  <Link key={listing.id} to={`/services/${listing.slug || listing.id}`} className="sv-card">
                    <div className="sv-card__top">
                      <div className="sv-card__type-icon" style={{ color: typeInfo?.color || 'var(--color-primary)' }}>
                        <i className={typeInfo?.icon || 'fas fa-briefcase'} />
                      </div>
                      <div className="sv-card__type-info">
                        <span className="sv-card__type" style={{ color: typeInfo?.color }}>{listing.service_type_display || listing.service_type}</span>
                        {listing.provider_verified && <span className="sv-card__verified"><i className="fas fa-check-circle" /> {t('pages.services.verified')}</span>}
                      </div>
                    </div>

                    <h3 className="sv-card__title">{listing.title}</h3>

                    <div className="sv-card__provider">
                      <div className="sv-card__provider-avatar">
                        {listing.provider_image
                          ? <img src={listing.provider_image} alt={listing.provider_name} />
                          : <span>{(listing.provider_name || '?')[0].toUpperCase()}</span>
                        }
                      </div>
                      <span>{listing.provider_name}</span>
                    </div>

                    <p className="sv-card__desc">{listing.description?.slice(0, 140)}{listing.description?.length > 140 ? '...' : ''}</p>

                    {listing.languages?.length > 0 && (
                      <div className="sv-card__langs">
                        {listing.languages.slice(0, 3).map((l, i) => (
                          <span key={i} className="sv-card__lang">{l}</span>
                        ))}
                      </div>
                    )}

                    <div className="sv-card__footer">
                      <div className="sv-card__price">
                        <strong>{parseInt(listing.base_price).toLocaleString()} FCFA</strong>
                        <span>/ {listing.price_type_display || listing.price_type}</span>
                      </div>
                      <div className="sv-card__delay">
                        <i className="fas fa-clock" /> {listing.turnaround_days} {t(listing.turnaround_days > 1 ? 'pages.services.days' : 'pages.services.day')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="sv-footer-fade" />
    </div>
  );
};

export default Services;
