import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookService from '../services/bookService';
import BookCard from '../components/BookCard';
import SEO from '../components/SEO';
import '../styles/Search.css';

const Search = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState({ books: [], authors: [] });
  const [fullResults, setFullResults] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, currentPage: 1 });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async (q, page = 1) => {
    if (!q || q.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const [booksRes, autoRes] = await Promise.allSettled([
        bookService.getBooks({ search: q, page, page_size: 12 }),
        bookService.autocomplete(q),
      ]);

      const booksData = booksRes.status === 'fulfilled' ? booksRes.value : {};
      const autoData = autoRes.status === 'fulfilled' ? autoRes.value : { books: [], authors: [] };

      setFullResults(booksData.results || booksData || []);
      setPagination({
        count: booksData.count || 0,
        next: booksData.next,
        previous: booksData.previous,
        currentPage: page,
      });
      setResults({ books: autoData.books || [], authors: autoData.authors || [] });
      setSearched(true);
    } catch (err) {
      setFullResults([]);
      setSearched(true);
      setError(t('search.error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) fetchResults(query);
  }, [query, fetchResults]);

  const handlePageChange = (page) => {
    fetchResults(query, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(pagination.count / 12);

  return (
    <div className="search-page">
      <SEO
        title={t('search.pageTitle')}
        description={t('search.resultCount', { count: pagination.count, s: pagination.count > 1 ? 's' : '' })}
      />

      <div className="search-page__header">
        <div className="search-page__header-inner">
          {query ? (
            <>
              <h1 className="search-page__title">
                {t('search.resultsFor', { query })} <span className="search-page__query">{query}</span> »
              </h1>
              <p className="search-page__count">
                {loading ? t('search.searching') : t('search.resultCount', { count: pagination.count, s: pagination.count !== 1 ? 's' : '' })}
              </p>
            </>
          ) : (
            <h1 className="search-page__title">{t('search.pageTitle')}</h1>
          )}
        </div>
      </div>

      <div className="search-page__body">
        {/* Auteurs trouvés */}
        {results.authors.length > 0 && (
          <section className="search-authors">
            <h2 className="search-authors__title"><i className="fas fa-user-pen" /> {t('search.authorsSection')}</h2>
            <div className="search-authors__list">
              {results.authors.map(author => (
                <Link key={author.id} to={`/authors/${author.id}`} className="search-author-card">
                  <div className="search-author-card__avatar">
                    {author.photo ? <img src={author.photo} alt={author.full_name} /> : <span>{(author.full_name || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div className="search-author-card__info">
                    <strong>{author.full_name}</strong>
                    <span>{author.books_count || 0} livre{(author.books_count || 0) > 1 ? 's' : ''}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Erreur */}
        {error && (
          <div className="search-error">
            <i className="fas fa-exclamation-circle" aria-hidden="true" /> {error}
          </div>
        )}

        {/* Résultats livres */}
        {loading ? (
          <div className="search-loading">
            <div className="search-loading__spinner" />
            <p>{t('search.searching')}</p>
          </div>
        ) : fullResults.length > 0 ? (
          <section className="search-books">
            <h2 className="search-books__title"><i className="fas fa-book" /> {t('search.booksSection')}</h2>
            <div className="search-books__grid">
              {fullResults.map(book => <BookCard key={book.id} book={book} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="search-pagination" aria-label="Pagination des résultats">
                <button
                  disabled={!pagination.previous}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  className="search-pagination__btn"
                >
                  <i className="fas fa-chevron-left" /> {t('common.previous')}
                </button>
                <span className="search-pagination__info">
                  {t('search.pageInfo', { current: pagination.currentPage, total: totalPages })}
                </span>
                <button
                  disabled={!pagination.next}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  className="search-pagination__btn"
                >
                  {t('common.next')} <i className="fas fa-chevron-right" />
                </button>
              </nav>
            )}
          </section>
        ) : searched && (
          <div className="search-empty">
            <div className="search-empty__icon"><i className="fas fa-search" /></div>
            <h2>{t('search.noResults')}</h2>
            <p>{t('search.noResultsText', { query })}</p>
            <div className="search-empty__suggestions">
              <Link to="/catalog" className="search-empty__link"><i className="fas fa-compass" /> {t('search.exploreCatalog')}</Link>
              <Link to="/authors" className="search-empty__link"><i className="fas fa-user-pen" /> {t('search.viewAuthors')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
