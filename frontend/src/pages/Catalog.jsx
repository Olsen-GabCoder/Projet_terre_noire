import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import '../styles/Home.css';
import '../styles/Catalog.css';

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const [heroReady, setHeroReady] = useState(false);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    author: searchParams.get('author') || '',
    book_format: searchParams.get('book_format') || '',
    available: searchParams.get('available') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      author: searchParams.get('author') || '',
      book_format: searchParams.get('book_format') || '',
      available: searchParams.get('available') || '',
      ordering: searchParams.get('ordering') || '-created_at',
    });
  }, [searchParams]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await bookService.getCategories();
        setCategories(data.results || data);
      } catch (err) {
        console.error('Erreur catégories:', err);
      }
    };
    loadCategories();
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
      setError('Erreur lors du chargement des livres');
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

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      author: '',
      book_format: '',
      available: '',
      ordering: '-created_at',
    });
    navigate('/catalog');
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
    { value: '-created_at', label: 'Plus récents' },
    { value: 'created_at', label: 'Plus anciens' },
    { value: 'title', label: 'Titre A-Z' },
    { value: '-title', label: 'Titre Z-A' },
    { value: 'price', label: 'Prix croissant' },
    { value: '-price', label: 'Prix décroissant' },
  ];

  if (loading && books.length === 0) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="catalog catalog--home-style">
      {/* Hero — identique à Home */}
      <section className="home-hero">
        <div className="home-hero-orb home-hero-orb--1" />
        <div className="home-hero-orb home-hero-orb--2" />
        <div className="home-hero-orb home-hero-orb--3" />
        <div className="home-hero-grid-bg" />

        <div className={`home-hero-inner ${heroReady ? 'is-ready' : ''}`}>
          <div className="home-hero-line" />
          <h1 className="home-hero-tagline phase-in">
            Notre catalogue
          </h1>
          <p className="home-hero-sub">
            Explorez l&apos;ensemble de nos publications — romans, essais, poésie et plus encore.
          </p>
          {pagination.count > 0 && (
            <div className="home-hero-stats">
              <div className="home-hero-stat">
                <span className="home-hero-stat__value">{pagination.count}</span>
                <span className="home-hero-stat__label">Ouvrage{pagination.count > 1 ? 's' : ''} disponible{pagination.count > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section livres — structure Home */}
      <section className="home-books" ref={gridRef}>
        <div className="home-books-inner">
          <div className="home-books-heading">
            <span className="home-books-label">Filtres</span>
            <h2 className="home-books-title">Affiner votre recherche</h2>
          </div>

          {/* Barre de filtres professionnelle */}
          <div className="cat-filters">
            <div className="cat-filters__search">
              <div className="cat-filters__search-wrap">
                <i className="fas fa-search cat-filters__search-ico" />
                <input
                  type="text"
                  placeholder="Rechercher un titre, un auteur…"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="cat-filters__search-input"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('search', '')}
                    className="cat-filters__search-clear"
                    aria-label="Effacer la recherche"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            </div>

            <div className="cat-filters__row">
              {/* Catégories — pills */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">Catégorie</span>
                <div className="cat-filters__pills">
                  <button
                    type="button"
                    className={`cat-filters__pill ${!filters.category ? 'cat-filters__pill--active' : ''}`}
                    onClick={() => handleFilterChange('category', '')}
                  >
                    Toutes
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

              {/* Format */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">Format</span>
                <div className="cat-filters__toggles">
                  <button
                    type="button"
                    className={`cat-filters__toggle ${!filters.book_format ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', '')}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.book_format === 'PAPIER' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', filters.book_format === 'PAPIER' ? '' : 'PAPIER')}
                  >
                    <i className="fas fa-book" /> Papier
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.book_format === 'EBOOK' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('book_format', filters.book_format === 'EBOOK' ? '' : 'EBOOK')}
                  >
                    <i className="fas fa-file-pdf" /> Ebook
                  </button>
                </div>
              </div>

              {/* Disponibilité */}
              <div className="cat-filters__group">
                <span className="cat-filters__label">Disponibilité</span>
                <div className="cat-filters__toggles">
                  <button
                    type="button"
                    className={`cat-filters__toggle ${!filters.available ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', '')}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.available === 'true' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', filters.available === 'true' ? '' : 'true')}
                  >
                    <i className="fas fa-check" /> En stock
                  </button>
                  <button
                    type="button"
                    className={`cat-filters__toggle ${filters.available === 'false' ? 'cat-filters__toggle--active' : ''}`}
                    onClick={() => handleFilterChange('available', filters.available === 'false' ? '' : 'false')}
                  >
                    <i className="fas fa-times" /> Épuisé
                  </button>
                </div>
              </div>

              {/* Tri */}
              <div className="cat-filters__group cat-filters__group--sort">
                <span className="cat-filters__label">Trier par</span>
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
                  <i className="fas fa-filter" /> {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
                {filters.search && (
                  <span className="cat-filters__chip">
                    « {filters.search} »
                    <button type="button" onClick={() => handleFilterChange('search', '')} aria-label="Retirer"><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.category && (
                  <span className="cat-filters__chip">
                    {categories.find((c) => c.id === parseInt(filters.category))?.name || 'Catégorie'}
                    <button type="button" onClick={() => handleFilterChange('category', '')} aria-label="Retirer"><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.book_format && (
                  <span className="cat-filters__chip">
                    {filters.book_format === 'EBOOK' ? 'Ebook' : 'Papier'}
                    <button type="button" onClick={() => handleFilterChange('book_format', '')} aria-label="Retirer"><i className="fas fa-times" /></button>
                  </span>
                )}
                {filters.available && (
                  <span className="cat-filters__chip">
                    {filters.available === 'true' ? 'En stock' : 'Épuisé'}
                    <button type="button" onClick={() => handleFilterChange('available', '')} aria-label="Retirer"><i className="fas fa-times" /></button>
                  </span>
                )}
                <button type="button" className="cat-filters__reset" onClick={resetFilters}>
                  <i className="fas fa-undo" /> Réinitialiser
                </button>
              </div>
            )}
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
                  <i className="fas fa-redo" /> Réessayer
                </button>
              </div>
            ) : books.length > 0 ? (
              <>
                <div className="home-books-grid">
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
                      <span>Précédent</span>
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
                      <span>Suivant</span>
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
                <h3 className="cat-empty__title">Aucun livre trouvé</h3>
                <p className="cat-empty__text">Modifiez vos critères de recherche pour afficher des résultats.</p>
                <button type="button" className="cat-empty__btn" onClick={resetFilters}>
                  <i className="fas fa-undo" /> Voir tout le catalogue
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
