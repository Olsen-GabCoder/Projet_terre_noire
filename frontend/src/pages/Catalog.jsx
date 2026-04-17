import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import { organizationAPI } from '../services/api';
import PageHero from '../components/PageHero';
import { useReveal } from '../hooks/useReveal';
import '../styles/Home.css';
import '../styles/Catalog.css';
import SEO from '../components/SEO';

const Catalog = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const staggerRef = useReveal({ stagger: true });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    author: searchParams.get('author') || '',
    book_format: searchParams.get('book_format') || '',
    available: searchParams.get('available') || '',
    has_listings: searchParams.get('has_listings') || '',
    in_library: searchParams.get('in_library') || '',
    publisher: searchParams.get('publisher') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  });
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
      const onEscape = (e) => { if (e.key === 'Escape') setMobileFiltersOpen(false); };
      document.addEventListener('keydown', onEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onEscape);
      };
    } else {
      document.body.style.overflow = '';
      return undefined;
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      author: searchParams.get('author') || '',
      book_format: searchParams.get('book_format') || '',
      available: searchParams.get('available') || '',
      has_listings: searchParams.get('has_listings') || '',
      in_library: searchParams.get('in_library') || '',
      publisher: searchParams.get('publisher') || '',
      ordering: searchParams.get('ordering') || '-created_at',
    });
  }, [searchParams]);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [catData, authData, orgData] = await Promise.allSettled([
          bookService.getCategories(),
          bookService.getAuthors(),
          organizationAPI.list(),
        ]);
        if (catData.status === 'fulfilled') setCategories(catData.value.results || catData.value);
        if (authData.status === 'fulfilled') {
          const list = Array.isArray(authData.value) ? authData.value : authData.value.results || [];
          setAuthors(list);
        }
        if (orgData.status === 'fulfilled') {
          const list = Array.isArray(orgData.value.data) ? orgData.value.data : orgData.value.data?.results || [];
          setPublishers(list.filter(o => o.org_type === 'MAISON_EDITION'));
        }
      } catch {
        // Silenced: filter dropdowns will remain empty
      }
    };
    loadFiltersData();
  }, []);

  const loadBooks = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        page_size: 12,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      };
      const data = await bookService.getBooks(params);
      setBooks(data.results || data);
      setPagination({
        count: data.count || data.length,
        next: data.next,
        previous: data.previous,
        currentPage: page,
      });
    } catch {
      setError(t('catalog.loadingError'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBooks(1);
  }, [loadBooks]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    const params = new URLSearchParams();
    Object.entries(updated).forEach(([k, v]) => { if (v) params.set(k, v); });
    navigate(`/catalog?${params.toString()}`);
  };

  const closeMobileFilters = () => setMobileFiltersOpen(false);

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      author: '',
      book_format: '',
      available: '',
      has_listings: '',
      in_library: '',
      publisher: '',
      ordering: '-created_at',
    });
    navigate('/catalog');
    setMobileFiltersOpen(false);
  };

  const handlePageChange = (page) => {
    loadBooks(page);
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'ordering'
  ).length;

  const totalPages = Math.ceil(pagination.count / 12);

  const ORDER_OPTIONS = [
    { value: '-created_at', label: t('catalog.sortNewest') },
    { value: 'created_at', label: t('catalog.sortOldest') },
    { value: 'title', label: t('catalog.sortTitleAZ') },
    { value: '-title', label: t('catalog.sortTitleZA') },
    { value: 'price', label: t('catalog.sortPriceAsc') },
    { value: '-price', label: t('catalog.sortPriceDesc') },
    { value: '-rating', label: t('catalog.sortRating', 'Mieux notés') },
  ];

  if (loading && books.length === 0) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="catalog catalog--home-style">
      <SEO
        title={`${t('catalog.title')}${filters.category ? ` — ${categories.find(c => c.id === parseInt(filters.category))?.name || ''}` : ''} — Frollot`}
        description={`${t('catalog.subtitle')}`}
      />
      {/* Hero */}
      <PageHero
        title={t('catalog.title')}
        subtitle={t('catalog.subtitle')}
        orbCount={3}
        className="catalog-hero"
      >
        {pagination.count > 0 && (
          <div className="home-hero-stats">
            <div className="home-hero-stat">
              <span className="home-hero-stat__value">{pagination.count}</span>
              <span className="home-hero-stat__label">{t('home.works')}</span>
            </div>
          </div>
        )}
      </PageHero>

      {/* Section livres — structure Home */}
      <section className="home-books" ref={gridRef}>
        <div className="home-books-inner">
          <div className="home-books-heading">
            <span className="home-books-label">{t('catalog.filtersLabel')}</span>
            <h2 className="home-books-title">{t('catalog.refineSearch')}</h2>
          </div>

          {/* Barre de filtres professionnelle — sur mobile: recherche + bouton Filtres → drawer */}
          <div className={`cat-filters ${mobileFiltersOpen ? 'cat-filters--drawer-open' : ''}`}>
            <div className="cat-filters__head">
              <div className="cat-filters__search">
                <div className="cat-filters__search-wrap">
                  <i className="fas fa-search cat-filters__search-ico" />
                  <input
                    type="text"
                    placeholder={t('catalog.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="cat-filters__search-input"
                    aria-label={t('catalog.searchPlaceholder')}
                  />
                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('search', '')}
                      className="cat-filters__search-clear"
                      aria-label={t('header.clearSearch')}
                    >
                      <i className="fas fa-times" />
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={`cat-filters__mobile-btn ${mobileFiltersOpen ? 'cat-filters__mobile-btn--active' : ''}`}
                onClick={() => setMobileFiltersOpen(prev => !prev)}
                aria-label={mobileFiltersOpen ? t('catalog.closeFilters') : t('catalog.openFilters')}
                aria-expanded={mobileFiltersOpen}
              >
                <i className={`fas fa-${mobileFiltersOpen ? 'times' : 'sliders-h'}`} />
                <span>{t('catalog.filtersLabel')}</span>
                {activeFilterCount > 0 && (
                  <span className="cat-filters__mobile-btn-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>

            <div
              className="cat-filters__backdrop"
              onClick={closeMobileFilters}
              aria-hidden="true"
            />

            <div className="cat-filters__drawer">
              <div className="cat-filters__drawer-header">
                <h3 className="cat-filters__drawer-title">{t('catalog.filtersLabel')}</h3>
                <button
                  type="button"
                  className="cat-filters__drawer-close"
                  onClick={closeMobileFilters}
                  aria-label={t('catalog.closeFilters')}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="cat-filters__drawer-body">
            <div className="cat-filters__row">
              {/* Catégories — pills */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">{t('catalog.category')}</span>
                <div className="cat-filters__pills">
                  <button
                    type="button"
                    className={`cat-filters__pill ${!filters.category ? 'cat-filters__pill--active' : ''}`}
                    onClick={() => handleFilterChange('category', '')}
                  >
                    {t('catalog.allCategories')}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat-filters__pill ${filters.category === String(c.id) ? 'cat-filters__pill--active' : ''}`}
                      onClick={() => handleFilterChange('category', filters.category === String(c.id) ? '' : c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auteur */}
              {authors.length > 0 && (
                <div className="cat-filters__group">
                  <span className="cat-filters__label">{t('catalog.authorFilter')}</span>
                  <div className="cat-filters__select-wrap">
                    <select
                      value={filters.author}
                      onChange={(e) => handleFilterChange('author', e.target.value)}
                      className="cat-filters__select"
                    >
                      <option value="">{t('catalog.allAuthors')}</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down cat-filters__select-arrow" />
                  </div>
                </div>
              )}

              {/* Éditeur */}
              {publishers.length > 0 && (
                <div className="cat-filters__group">
                  <span className="cat-filters__label">{t('catalog.publisherFilter', 'Éditeur')}</span>
                  <div className="cat-filters__select-wrap">
                    <select
                      value={filters.publisher}
                      onChange={(e) => handleFilterChange('publisher', e.target.value)}
                      className="cat-filters__select"
                    >
                      <option value="">{t('catalog.allPublishers', 'Tous les éditeurs')}</option>
                      {publishers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down cat-filters__select-arrow" />
                  </div>
                </div>
              )}

              {/* Format */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">{t('catalog.format')}</span>
                <div className="cat-filters__toggles">
                  <button
                    type="button"
                    className={`cat-filters__toggle ${!filters.book_format ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', '')}
                  >
                    {t('catalog.allFormats')}
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.book_format === 'PAPIER' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', filters.book_format === 'PAPIER' ? '' : 'PAPIER')}
                  >
                    <i className="fas fa-book" /> {t('catalog.paper')}
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.book_format === 'EBOOK' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', filters.book_format === 'EBOOK' ? '' : 'EBOOK')}
                  >
                    <i className="fas fa-file-pdf" /> {t('catalog.ebook')}
                  </button>
                </div>
              </div>

              {/* Disponibilité */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">{t('catalog.availability')}</span>
                <div className="cat-filters__toggles">
                  <button
                    type="button"
                    className={`cat-filters__toggle ${!filters.available ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', '')}
                  >
                    {t('catalog.allAvailability')}
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.available === 'true' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', filters.available === 'true' ? '' : 'true')}
                  >
                    <i className="fas fa-check" /> {t('catalog.inStock')}
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.available === 'false' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', filters.available === 'false' ? '' : 'false')}
                  >
                    <i className="fas fa-times" /> {t('catalog.outOfStock')}
                  </button>
                </div>
              </div>

              {/* Disponible en librairie */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">
                  <i className="fas fa-store" /> Marketplace
                </span>
                <div className="cat-filters__toggles">
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.has_listings === 'true' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('has_listings', filters.has_listings === 'true' ? '' : 'true')}
                  >
                    <i className="fas fa-store" /> En librairie
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.in_library === 'true' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('in_library', filters.in_library === 'true' ? '' : 'true')}
                  >
                    <i className="fas fa-landmark" /> En bibliothèque
                  </button>
                </div>
              </div>

              {/* Tri */}
              <div className="cat-filters__group cat-filters__group--sort">
                <span className="cat-filters__label">{t('catalog.sortBy')}</span>
                <div className="cat-filters__select-wrap">
                  <select
                    value={filters.ordering}
                    onChange={(e) => handleFilterChange('ordering', e.target.value)}
                    className="cat-filters__select"
                  >
                    {ORDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down cat-filters__select-arrow" />
                </div>
              </div>
            </div>

            {/* Filtres actifs + réinitialiser */}
            {activeFilterCount > 0 && (
              <div className="cat-filters__active">
                <span className="cat-filters__active-label">
                  <i className="fas fa-filter" /> {activeFilterCount} {t('catalog.activeFilters', { s: activeFilterCount > 1 ? 's' : '' })}
                </span>
                {filters.search && (
                  <span className="cat-filters__chip">
                    « {filters.search} »
                    <button type="button" onClick={() => handleFilterChange('search', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.category && (
                  <span className="cat-filters__chip">
                    {categories.find((c) => c.id === parseInt(filters.category))?.name || t('catalog.category')}
                    <button type="button" onClick={() => handleFilterChange('category', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.author && (
                  <span className="cat-filters__chip">
                    {authors.find((a) => a.id === parseInt(filters.author))?.full_name || t('catalog.authorFilter')}
                    <button type="button" onClick={() => handleFilterChange('author', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.book_format && (
                  <span className="cat-filters__chip">
                    {filters.book_format === 'EBOOK' ? t('catalog.ebook') : t('catalog.paper')}
                    <button type="button" onClick={() => handleFilterChange('book_format', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.available && (
                  <span className="cat-filters__chip">
                    {filters.available === 'true' ? t('catalog.inStock') : t('catalog.outOfStock')}
                    <button type="button" onClick={() => handleFilterChange('available', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.has_listings === 'true' && (
                  <span className="cat-filters__chip">
                    <i className="fas fa-store" /> En librairie
                    <button type="button" onClick={() => handleFilterChange('has_listings', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.in_library === 'true' && (
                  <span className="cat-filters__chip">
                    <i className="fas fa-landmark" /> En bibliothèque
                    <button type="button" onClick={() => handleFilterChange('in_library', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.publisher && (
                  <span className="cat-filters__chip">
                    <i className="fas fa-book-open" /> {publishers.find(p => String(p.id) === filters.publisher)?.name || filters.publisher}
                    <button type="button" onClick={() => handleFilterChange('publisher', '')} aria-label={t('catalog.remove')}><i className="fas fa-times" /></button>
                  </span>
                )}
                <button type="button" className="cat-filters__reset" onClick={resetFilters}>
                  <i className="fas fa-undo" /> {t('catalog.reset')}
                </button>
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Grille livres */}
          <main className="cat-main">
            {error ? (
              <div className="cat-empty">
                <div className="cat-empty__icon cat-empty__icon--err">
                  <i className="fas fa-exclamation-triangle" />
                </div>
                <h3 className="cat-empty__title">{error}</h3>
                <button type="button" className="cat-empty__btn" onClick={() => loadBooks(1)}>
                  <i className="fas fa-redo" /> {t('common.retry')}
                </button>
              </div>
            ) : books.length > 0 ? (
              <>
                <div className="home-books-grid" ref={staggerRef}>
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="cat-pag" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.previous}
                      className="cat-pag__btn"
                    >
                      <i className="fas fa-chevron-left" />
                      <span>{t('common.previous')}</span>
                    </button>
                    <div className="cat-pag__pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          const c = pagination.currentPage;
                          return p === 1 || p === totalPages || (p >= c - 1 && p <= c + 1);
                        })
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="cat-pag__dots">&hellip;</span>
                            )}
                            <button
                              type="button"
                              className={`cat-pag__page ${p === pagination.currentPage ? 'is-active' : ''}`}
                              onClick={() => handlePageChange(p)}
                              {...(p === pagination.currentPage ? { 'aria-current': 'page' } : {})}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.next}
                      className="cat-pag__btn"
                    >
                      <span>{t('common.next')}</span>
                      <i className="fas fa-chevron-right" />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="cat-empty">
                <div className="cat-empty__icon">
                  <i className="fas fa-book-open" />
                </div>
                <h3 className="cat-empty__title">{t('catalog.emptyTitle')}</h3>
                <p className="cat-empty__text">{t('catalog.emptyText')}</p>
                <button type="button" className="cat-empty__btn" onClick={resetFilters}>
                  <i className="fas fa-undo" /> {t('catalog.viewAll')}
                </button>
              </div>
            )}
          </main>
        </div>
      </section>

      <div className="home-footer-fade" />
    </div>
  );
};

export default Catalog;
