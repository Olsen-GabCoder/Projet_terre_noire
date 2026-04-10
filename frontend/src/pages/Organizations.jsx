import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import organizationService from '../services/organizationService';
import SEO from '../components/SEO';
import '../styles/Organizations.css';

const GENRES = [
  'ROMAN', 'NOUVELLE', 'POESIE', 'ESSAI', 'THEATRE', 'JEUNESSE', 'BD',
];

const Organizations = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const type = searchParams.get('type') || '';
  const genre = searchParams.get('genre') || '';
  const city = searchParams.get('city') || '';
  const ordering = searchParams.get('ordering') || 'rating';
  const search = searchParams.get('search') || '';
  const accepting = searchParams.get('accepting') || '';

  const ORG_TYPES = [
    { value: '', label: t('pages.organizations.allTypes') },
    { value: 'MAISON_EDITION', label: t('pages.organizations.publisher'), icon: 'fas fa-book-open' },
    { value: 'LIBRAIRIE', label: t('pages.organizations.bookstore'), icon: 'fas fa-store' },
    { value: 'BIBLIOTHEQUE', label: t('pages.organizations.library'), icon: 'fas fa-landmark' },
    { value: 'IMPRIMERIE', label: t('pages.organizations.printer'), icon: 'fas fa-print' },
  ];

  const SORT_OPTIONS = [
    { value: 'rating', label: t('pages.organizations.bestRated') },
    { value: 'reviews', label: t('pages.organizations.mostReviews') },
    { value: 'recent', label: t('pages.organizations.recent') },
    { value: 'name', label: t('pages.organizations.nameAZ') },
  ];

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        const params = {};
        if (type) params.type = type;
        if (genre) params.genre = genre;
        if (city) params.city = city;
        if (ordering) params.ordering = ordering;
        if (search) params.search = search;
        if (accepting) params.accepting_manuscripts = 'true';
        const res = await organizationService.getDirectory(params);
        setOrgs(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch {
        setOrgs([]);
      }
      setLoading(false);
    };
    fetchOrgs();
  }, [type, genre, city, ordering, search, accepting]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <div className="org-directory">
      <SEO title={t('pages.organizations.title')} description={t('pages.organizations.subtitle')} />

      <div className="org-directory__header">
        <h1>{t('pages.organizations.title')}</h1>
        <p>{t('pages.organizations.subtitle')}</p>
      </div>

      {/* Search bar */}
      <div className="org-directory__search">
        <div className="org-directory__search-input">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder={t('pages.organizations.searchPlaceholder')}
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="org-directory__filters">
        <div className="org-directory__filter-group">
          <label>{t('pages.organizations.filterType')}</label>
          <div className="org-directory__filter-pills">
            {ORG_TYPES.map((t_item) => (
              <button
                key={t_item.value}
                className={`filter-pill ${type === t_item.value ? 'active' : ''}`}
                onClick={() => updateFilter('type', t_item.value === type ? '' : t_item.value)}
              >
                {t_item.icon && <i className={t_item.icon} />} {t_item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="org-directory__filter-row">
          <div className="org-directory__filter-group">
            <label>{t('pages.organizations.filterGenre')}</label>
            <select value={genre} onChange={(e) => updateFilter('genre', e.target.value)}>
              <option value="">{t('pages.organizations.filterGenre')}</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          <div className="org-directory__filter-group">
            <label>{t('pages.organizations.filterCity')}</label>
            <input
              type="text"
              placeholder={t('pages.organizations.filterCity')}
              value={city}
              onChange={(e) => updateFilter('city', e.target.value)}
            />
          </div>

          <div className="org-directory__filter-group">
            <label>{t('pages.organizations.filterSort')}</label>
            <select value={ordering} onChange={(e) => updateFilter('ordering', e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <label className="org-directory__checkbox">
            <input
              type="checkbox"
              checked={accepting === 'true'}
              onChange={(e) => updateFilter('accepting', e.target.checked ? 'true' : '')}
            />
            {t('pages.organizations.acceptingManuscripts')}
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="dashboard-loading"><div className="admin-spinner" /></div>
      ) : orgs.length === 0 ? (
        <div className="org-directory__empty">
          <i className="fas fa-building" />
          <p>{t('pages.organizations.noResults')}</p>
          <p>{t('pages.organizations.noResultsDesc')}</p>
        </div>
      ) : (
        <>
          <p className="org-directory__count">{orgs.length} {t('pages.organizations.count', { count: orgs.length })}</p>
          <div className="org-directory__grid">
            {orgs.map((org) => (
              <Link key={org.id} to={`/organizations/${org.slug}`} className="org-card">
                <div className="org-card__logo">
                  {org.logo ? (
                    <img src={org.logo} alt={org.name} />
                  ) : (
                    <div className="org-card__logo-placeholder">
                      <i className="fas fa-building" />
                    </div>
                  )}
                </div>
                <div className="org-card__body">
                  <div className="org-card__top">
                    <h3>{org.name}</h3>
                    {org.is_verified && <i className="fas fa-check-circle org-card__verified" title={t('pages.organizations.verifiedOnly')} />}
                  </div>
                  <span className="org-card__type">{org.org_type_display}</span>
                  <p className="org-card__location">
                    <i className="fas fa-map-marker-alt" /> {org.city || org.country}
                  </p>
                  {org.description && (
                    <p className="org-card__desc">{org.description.slice(0, 100)}{org.description.length > 100 ? '...' : ''}</p>
                  )}
                  <div className="org-card__meta">
                    <span className="org-card__rating">
                      <i className="fas fa-star" /> {parseFloat(org.avg_rating).toFixed(1)}
                      <span className="org-card__reviews">({org.review_count} {t('pages.organizations.reviews')})</span>
                    </span>
                    {org.is_accepting_manuscripts && (
                      <span className="org-card__accepting">
                        <i className="fas fa-envelope-open-text" /> {t('pages.organizations.accepting')}
                      </span>
                    )}
                  </div>
                  {org.accepted_genres?.length > 0 && (
                    <div className="org-card__genres">
                      {org.accepted_genres.slice(0, 4).map((g) => (
                        <span key={g} className="org-card__genre-tag">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Organizations;
