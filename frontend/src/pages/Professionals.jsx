import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import '../styles/Professionals.css';

const Professionals = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);

  const type = searchParams.get('type') || '';
  const city = searchParams.get('city') || '';
  const ordering = searchParams.get('ordering') || 'rating';
  const search = searchParams.get('search') || '';
  const verified = searchParams.get('verified') || '';

  const PROFILE_TYPES = [
    { value: '', label: t('pages.professionals.all'), icon: 'fas fa-users' },
    { value: 'CORRECTEUR', label: t('pages.professionals.correctors'), icon: 'fas fa-spell-check' },
    { value: 'ILLUSTRATEUR', label: t('pages.professionals.illustrators'), icon: 'fas fa-palette' },
    { value: 'TRADUCTEUR', label: t('pages.professionals.translators'), icon: 'fas fa-language' },
  ];

  const SORT_OPTIONS = [
    { value: 'rating', label: t('pages.professionals.sortRating') },
    { value: 'projects', label: t('pages.professionals.sortProjects') },
    { value: 'recent', label: t('pages.professionals.sortRecent') },
    { value: 'name', label: t('pages.professionals.sortName') },
  ];

  useEffect(() => {
    const fetchPros = async () => {
      setLoading(true);
      try {
        const params = {};
        if (type) params.type = type;
        if (city) params.city = city;
        if (ordering) params.ordering = ordering;
        if (search) params.search = search;
        if (verified) params.verified = 'true';
        const res = await organizationService.getProfessionals(params);
        setPros(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch {
        setPros([]);
      }
      setLoading(false);
    };
    fetchPros();
  }, [type, city, ordering, search, verified]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div className="pro-directory">
      <SEO title={t('pages.professionals.title')} description={t('pages.professionals.subtitle')} />

      <div className="pro-directory__header">
        <h1>{t('pages.professionals.title')}</h1>
        <p>{t('pages.professionals.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="pro-directory__search">
        <div className="pro-directory__search-input">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder={t('pages.professionals.searchPlaceholder')}
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="pro-directory__filters">
        <div className="pro-directory__filter-pills">
          {PROFILE_TYPES.map((pt) => (
            <button
              key={pt.value}
              className={`filter-pill ${type === pt.value ? 'active' : ''}`}
              onClick={() => updateFilter('type', pt.value === type ? '' : pt.value)}
            >
              <i className={pt.icon} /> {pt.label}
            </button>
          ))}
        </div>

        <div className="pro-directory__filter-row">
          <div className="pro-directory__filter-group">
            <label>{t('pages.professionals.cityPlaceholder')}</label>
            <input
              type="text"
              placeholder={t('pages.professionals.cityPlaceholder')}
              value={city}
              onChange={(e) => updateFilter('city', e.target.value)}
            />
          </div>

          <div className="pro-directory__filter-group">
            <label>{t('pages.organizations.filterSort')}</label>
            <select value={ordering} onChange={(e) => updateFilter('ordering', e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <label className="pro-directory__checkbox">
            <input
              type="checkbox"
              checked={verified === 'true'}
              onChange={(e) => updateFilter('verified', e.target.checked ? 'true' : '')}
            />
            {t('pages.professionals.verifiedOnly')}
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="dashboard-loading"><div className="admin-spinner" /></div>
      ) : pros.length === 0 ? (
        <div className="pro-directory__empty">
          <i className="fas fa-user-tie" />
          <p>{t('pages.professionals.noResults')}</p>
        </div>
      ) : (
        <>
          <p className="pro-directory__count">{pros.length} {t('pages.professionals.count', { count: pros.length })}</p>
          <div className="pro-directory__grid">
            {pros.map((pro) => (
              <Link key={pro.id} to={`/professionals/${pro.slug}`} className="pro-card">
                <div className="pro-card__avatar">
                  {pro.avatar ? (
                    <img src={pro.avatar} alt={pro.user_name} />
                  ) : (
                    <div className="pro-card__avatar-placeholder">
                      <i className="fas fa-user" />
                    </div>
                  )}
                </div>
                <div className="pro-card__body">
                  <div className="pro-card__top">
                    <h3>{pro.user_name}</h3>
                    {pro.is_verified && <i className="fas fa-check-circle pro-card__verified" title={t('pages.professionals.verifiedOnly')} />}
                  </div>
                  <span className="pro-card__type">{pro.profile_type_display}</span>
                  {(pro.city || pro.country) && (
                    <p className="pro-card__location">
                      <i className="fas fa-map-marker-alt" /> {pro.city || pro.country}
                    </p>
                  )}
                  {pro.bio && (
                    <p className="pro-card__bio">{pro.bio.slice(0, 100)}{pro.bio.length > 100 ? '...' : ''}</p>
                  )}
                  <div className="pro-card__stats">
                    <span className="pro-card__rating">
                      <i className="fas fa-star" /> {parseFloat(pro.avg_rating).toFixed(1)}
                      <span className="pro-card__review-count">({pro.review_count})</span>
                    </span>
                    {pro.completed_projects > 0 && (
                      <span className="pro-card__projects">
                        <i className="fas fa-check-double" /> {pro.completed_projects} {t('pages.proDetail.completedProjects')}
                      </span>
                    )}
                    {pro.listings_count > 0 && (
                      <span className="pro-card__listings">
                        <i className="fas fa-briefcase" /> {pro.listings_count} {t('pages.proDetail.servicesCount', { count: pro.listings_count })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Professionals;
