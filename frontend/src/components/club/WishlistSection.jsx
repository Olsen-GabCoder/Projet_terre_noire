/**
 * WishlistSection — Collective book wishlist with suggestions and voting
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ini } from './clubUtils';

export default function WishlistSection({ slug, isMember, isAdmin, user, socialService, toast, handleApiError, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await socialService.getWishlist(slug);
        setItems(Array.isArray(r.data) ? r.data : []);
      } catch {} setLoading(false);
    })();
  }, [slug]);

  // Book search debounce
  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const bs = await import('../../services/bookService');
        const r = await bs.default.searchBooks(bookSearch);
        const books = Array.isArray(r) ? r : r?.results || [];
        setBookResults(books.slice(0, 6));
      } catch { setBookResults([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const suggest = async (bookId) => {
    try {
      const r = await socialService.suggestBook(slug, bookId);
      setItems(prev => [r.data, ...prev]);
      setBookSearch('');
      setBookResults([]);
      setShowSuggest(false);
      toast.success(t('pages.bookClubDetail.wishlistAdded', 'Livre suggéré !'));
    } catch (e) {
      const msg = e.response?.status === 409
        ? t('pages.bookClubDetail.wishlistAlreadyExists', 'Ce livre est déjà dans la wishlist')
        : handleApiError(e);
      toast.error(msg);
    }
  };

  const vote = async (itemId) => {
    try {
      const r = await socialService.voteWishlistItem(slug, itemId);
      setItems(prev => prev.map(it => it.id === itemId ? r.data.item : it)
        .sort((a, b) => b.votes_count - a.votes_count));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  const remove = async (itemId) => {
    try {
      await socialService.removeWishlistItem(slug, itemId);
      setItems(prev => prev.filter(it => it.id !== itemId));
    } catch (e) { toast.error(handleApiError(e)); }
  };

  if (loading) return null;

  return (
    <div className="cc-wishlist">
      <div className="cc-wishlist__header">
        <h3 className="cc-wishlist__title">{t('pages.bookClubDetail.wishlistTitle', 'Envies de lecture')}</h3>
        {isMember && (
          <button className="cc-wishlist__add-btn" onClick={() => setShowSuggest(p => !p)}>
            <i className={`fas ${showSuggest ? 'fa-times' : 'fa-plus'}`} /> {showSuggest ? t('common.cancel', 'Annuler') : t('pages.bookClubDetail.wishlistSuggest', 'Suggérer')}
          </button>
        )}
      </div>

      {showSuggest && (
        <div className="cc-wishlist__suggest">
          <div className="cc-wishlist__search">
            <i className="fas fa-search" />
            <input
              value={bookSearch}
              onChange={e => setBookSearch(e.target.value)}
              placeholder={t('pages.bookClubDetail.wishlistSearchPlaceholder', 'Rechercher un livre...')}
              autoFocus
            />
          </div>
          {bookResults.length > 0 && (
            <div className="cc-wishlist__results">
              {bookResults.map(b => (
                <button key={b.id} className="cc-wishlist__result" onClick={() => suggest(b.id)}>
                  {b.cover_image && <img src={b.cover_image} alt="" className="cc-wishlist__result-cover" />}
                  <div className="cc-wishlist__result-info">
                    <strong>{b.title}</strong>
                    <span>{b.author?.full_name || ''}</span>
                  </div>
                  <i className="fas fa-plus cc-wishlist__result-add" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div className="cc-wishlist__list">
          {items.map((item, idx) => (
            <div key={item.id} className="cc-wishlist__item">
              <div className="cc-wishlist__rank">{idx + 1}</div>
              {item.book?.cover_image && (
                <Link to={`/books/${item.book.id}`} className="cc-wishlist__cover">
                  <img src={item.book.cover_image} alt="" />
                </Link>
              )}
              <div className="cc-wishlist__info">
                <Link to={`/books/${item.book?.id}`} className="cc-wishlist__book-title">{item.book?.title}</Link>
                <div className="cc-wishlist__book-author">{item.book?.author?.full_name || ''}</div>
                <div className="cc-wishlist__meta">
                  {t('pages.bookClubDetail.wishlistSuggestedBy', 'Suggéré par')} {item.suggested_by?.full_name || item.suggested_by?.username || '—'}
                </div>
              </div>
              <div className="cc-wishlist__actions">
                {isMember && (
                  <button
                    className={`cc-wishlist__vote${item.voted_by_me ? ' cc-wishlist__vote--active' : ''}`}
                    onClick={() => vote(item.id)}
                    title={item.voted_by_me ? t('pages.bookClubDetail.wishlistUnvote', 'Retirer mon vote') : t('pages.bookClubDetail.wishlistVote', 'Voter')}
                  >
                    <i className={`fas fa-arrow-up`} />
                    <span>{item.votes_count}</span>
                  </button>
                )}
                {(isAdmin || item.suggested_by?.id === user?.id) && (
                  <button className="cc-wishlist__remove" onClick={() => remove(item.id)} title={t('pages.bookClubDetail.wishlistRemove', 'Retirer')}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showSuggest && <p className="cc-wishlist__empty">{t('pages.bookClubDetail.wishlistEmpty', 'Aucune suggestion pour le moment. Proposez un livre !')}</p>
      )}
    </div>
  );
}
