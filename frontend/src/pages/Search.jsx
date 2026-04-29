import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookService from '../services/bookService';
import BookCard from '../components/BookCard';
import SEO from '../components/SEO';
import analyticsService from '../services/analyticsService';
import aiService from '../services/aiService';
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
  const [aiSuggestion, setAiSuggestion] = useState(null);

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
      const searchResults = booksData.results || booksData || [];
      searchResults.forEach(book => analyticsService.trackSearchResult(book.id));
      setSearched(true);
      // AI suggestion when no results
      if (searchResults.length === 0 && q.length >= 3) {
        aiService.semanticSearch({ query: q }).then(data => {
          if (data.suggestions?.length) setAiSuggestion(data);
        }).catch(() => {});
      } else {
        setAiSuggestion(null);
      }
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
                <Link key={author.id} to={author.user_slug ? `/u/${author.user_slug}` : `/authors/${author.id}`} className="search-author-card">
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
              {fullResults.map(book => (
                <div key={book.id} onClick={() => analyticsService.trackSearchClick(book.id, query)}>
                  <BookCard book={book} />
                </div>
              ))}
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
            {aiSuggestion && (
              <div className="search-ai-suggest">
                <div className="search-ai-suggest__label"><i className="fas fa-wand-magic-sparkles" /> L'IA suggère</div>
                {aiSuggestion.corrected_query && aiSuggestion.corrected_query !== query && (
                  <p className="search-ai-suggest__correction">
                    Vouliez-vous dire{' '}
                    <button className="search-ai-suggest__link" onClick={() => setSearchParams({ q: aiSuggestion.corrected_query })}>
                      « {aiSuggestion.corrected_query} »
                    </button> ?
                  </p>
                )}
                {aiSuggestion.suggestions?.length > 0 && (
                  <div className="search-ai-suggest__list">
                    {aiSuggestion.suggestions.map((s, i) => (
                      <button key={i} className="search-ai-suggest__tag" onClick={() => setSearchParams({ q: s })}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
