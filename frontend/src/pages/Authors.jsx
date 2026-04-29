import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookService from '../services/bookService';
import aiService from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Authors.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function AuthorSuggestions({ t }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (suggestions) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const { suggestions: data } = await aiService.suggestAuthors(6);
      setSuggestions(data || []);
      setOpen(true);
    } catch { /* silent */ }
    setLoading(false);
  };

  const ini = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="auth-suggestions">
      <button className="auth-suggestions__btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> {t('pages.authors.loadingSuggestions', 'Analyse...')}</>
          : open
            ? <><i className="fas fa-chevron-up" /> {t('pages.authors.hideSuggestions', 'Masquer')}</>
            : <><i className="fas fa-robot" /> {t('pages.authors.aiSuggestions', 'Auteurs suggérés pour vous')}</>
        }
      </button>
      {open && suggestions?.length > 0 && (
        <div className="auth-suggestions__grid">
          {suggestions.map((s, i) => (
            <Link key={i} to={`/authors/${s.author?.slug || s.author_id}`} className="auth-suggestions__card">
              <div className="auth-suggestions__av">
                {s.author?.photo
                  ? <img src={s.author.photo} alt="" />
                  : <span>{ini(s.author?.full_name)}</span>
                }
              </div>
              <div className="auth-suggestions__info">
                <strong>{s.author?.full_name || `Auteur #${s.author_id}`}</strong>
                <p className="auth-suggestions__reason">{s.reason}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const Authors = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const [sortBy, setSortBy] = useState('name');
  const [letterFilter, setLetterFilter] = useState('');

  useEffect(() => { loadAuthors(); }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookService.getAuthors();
      setAuthors(Array.isArray(data) ? data : data.results || []);
    } catch {
      setError(t('pages.authors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...authors];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => (a.display_name || a.full_name || '').toLowerCase().includes(q) || (a.display_bio || a.biography || '').toLowerCase().includes(q));
    }
    if (letterFilter) {
      list = list.filter(a => ((a.display_name || a.full_name || '')[0] || '').toUpperCase() === letterFilter);
    }
    list.sort((a, b) =>
      sortBy === 'books'
        ? (b.books_count || 0) - (a.books_count || 0)
        : (a.display_name || a.full_name || '').localeCompare(b.display_name || b.full_name || '')
    );
    return list;
  }, [authors, search, sortBy, letterFilter]);

  // Lettres disponibles dans les données
  const availableLetters = useMemo(() => {
    const s = new Set(authors.map(a => ((a.display_name || a.full_name || '')[0] || '').toUpperCase()).filter(Boolean));
    return s;
  }, [authors]);

  const stats = useMemo(() => ({
    authors: authors.length,
    books: authors.reduce((s, a) => s + (a.books_count || 0), 0),
  }), [authors]);

  const clearFilters = () => { setSearch(''); setLetterFilter(''); setSortBy('name'); };
  const hasActiveFilters = search || letterFilter || sortBy !== 'name';

  if (loading) return <LoadingSpinner fullPage />;

  if (error) {
    return (
      <div className="auth-page">
        <SEO title={t('pages.authors.title')} />
        <div className="auth-state">
          <div className="auth-state__ico auth-state__ico--err"><i className="fas fa-exclamation-triangle" /></div>
          <h3>{error}</h3>
          <button type="button" className="auth-state__btn" onClick={loadAuthors}><i className="fas fa-redo" /> {t('pages.authors.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <SEO title={t('pages.authors.title')} />
      <PageHero
        title={t('pages.authors.title')}
        subtitle={t('pages.authors.subtitle')}
      >
        <div className="auth-hero__stats">
          <div className="auth-hero__stat">
            <span className="auth-hero__stat-val">{stats.authors}</span>
            <span className="auth-hero__stat-lbl">{t('pages.authors.authorsLabel')}</span>
          </div>
          <div className="auth-hero__stat">
            <span className="auth-hero__stat-val">{stats.books}+</span>
            <span className="auth-hero__stat-lbl">{t('pages.authors.worksLabel')}</span>
          </div>
        </div>
      </PageHero>

      {/* AI Suggestions */}
      {user && (
        <div className="authors-content" style={{ paddingBottom: 0 }}>
          <div className="auth-wrap">
            <AuthorSuggestions t={t} />
          </div>
        </div>
      )}

      {/* CONTENU */}
      <div className="authors-content">
        <div className="auth-wrap">

          {/* Barre de recherche + tri */}
          <div className="auth-toolbar">
            <div className={`search-expand__field auth-search-open ${searchFocused ? 'auth-search-focused' : ''}`}>
              <input
                ref={searchRef}
                type="text"
                className="search-expand__input"
                placeholder={t('pages.authors.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search && (
                <button type="button" className="search-expand__clear" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>
                  <i className="fas fa-times" />
                </button>
              )}
              <button type="button" className="search-expand__submit" onClick={() => searchRef.current?.focus()} aria-label={t('common.search')}>
                <i className="fas fa-search" />
              </button>
            </div>
            <div className="auth-toolbar__right">
              <div className="auth-sort">
                <i className="fas fa-arrow-up-wide-short" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">{t('pages.authors.sortName')}</option>
                  <option value="books">{t('pages.authors.sortBooks')}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button type="button" className="auth-clear-btn" onClick={clearFilters}>
                  <i className="fas fa-filter-circle-xmark" /> {t('pages.authors.reset')}
                </button>
              )}
            </div>
          </div>

          {/* Index alphabetique */}
          <div className="auth-alpha">
            <button
              className={`auth-alpha__btn ${!letterFilter ? 'active' : ''}`}
              onClick={() => setLetterFilter('')}
            >
              {t('pages.authors.all')}
            </button>
            {ALPHABET.map(letter => {
              const available = availableLetters.has(letter);
              return (
                <button
                  key={letter}
                  className={`auth-alpha__btn ${letterFilter === letter ? 'active' : ''} ${!available ? 'disabled' : ''}`}
                  onClick={() => available && setLetterFilter(letterFilter === letter ? '' : letter)}
                  disabled={!available}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Compteur de resultats */}
          <div className="auth-results-bar">
            <span className="auth-results-count">
              <strong>{filtered.length}</strong> {filtered.length > 1 ? t('common.authors_plural') : t('common.authors')}
              {hasActiveFilters && ` ${t('pages.authors.found')}`}
            </span>
          </div>

          {/* Grille */}
          {filtered.length === 0 ? (
            <div className="auth-state">
              <div className="auth-state__ico"><i className="fas fa-user-slash" /></div>
              <h3>{t('pages.authors.noResults')}</h3>
              <p>{t('pages.authors.noResultsDesc')}</p>
              <button type="button" className="auth-state__btn" onClick={clearFilters}>
                <i className="fas fa-redo" /> {t('pages.authors.viewAll')}
              </button>
            </div>
          ) : (
            <div className="auth-grid">
              {filtered.map((author) => (
                <Link key={author.id} to={author.user_slug ? `/u/${author.user_slug}` : `/authors/${author.id}`} className="acard">
                  <div className="acard__visual">
                    <div className="acard__avatar">
                      {(author.display_photo || author.photo) ? (
                        <img
                          src={author.display_photo || author.photo}
                          alt={author.display_name || author.full_name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className="acard__initials" style={(author.display_photo || author.photo) ? { display: 'none' } : undefined}>
                        {((author.display_name || author.full_name || '?').charAt(0)).toUpperCase()}
                      </div>
                    </div>
                    <div className="acard__badges">
                      {(author.books_count || 0) > 0 && (
                        <span className="acard__badge">
                          <i className="fas fa-book" /> {author.books_count} {t(author.books_count > 1 ? 'pages.authors.booksPlural' : 'pages.authors.booksSingular')}
                        </span>
                      )}
                      {author.is_registered && (
                        <span className="acard__badge acard__badge--registered">
                          <i className="fas fa-check-circle" /> Inscrit
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="acard__body">
                    <h3 className="acard__name">{author.display_name || author.full_name || t('pages.authors.unknownAuthor')}</h3>
                    {(author.display_bio || author.biography) ? (
                      <p className="acard__bio">{author.display_bio || author.biography}</p>
                    ) : (
                      <p className="acard__bio acard__bio--empty">{t('pages.authors.biographyComing')}</p>
                    )}
                    <div className="acard__cta">
                      <span>{t('pages.authors.viewProfile')}</span>
                      <i className="fas fa-arrow-right" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="auth-footer-fade" />
    </div>
  );
};

export default Authors;
