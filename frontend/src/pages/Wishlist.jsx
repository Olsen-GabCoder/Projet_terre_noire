import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import BookCard from '../components/BookCard';
import { useReveal } from '../hooks/useReveal';
import '../styles/Wishlist.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const Wishlist = ({ embedded = false }) => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const { wishlistItems, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart, isInCart } = useCart();
  const [error, setError] = useState(null);

  const handleRemove = (bookId) => {
    try {
      setError(null);
      removeFromWishlist(bookId);
    } catch {
      setError(t('pages.wishlist.errorRemove'));
    }
  };

  const handleAddToCart = (book) => {
    try {
      setError(null);
      addToCart(book);
    } catch {
      setError(t('pages.wishlist.errorAddToCart'));
    }
  };

  if (!wishlistItems.length) {
    return (
      <div className="wishlist-page">
        <SEO title={t('pages.wishlist.title')} />
        {!embedded && (
          <PageHero
            title={t('pages.wishlist.title', "Ma liste d'envie")}
            subtitle={t('pages.wishlist.emptySubtitle', "Votre liste d'envie est vide.")}
          />
        )}

        <div ref={embedded ? undefined : revealRef} className="wishlist-content reveal-section">
          <div className="wishlist-empty">
            <div className="wishlist-empty__ico">
              <i className="far fa-heart" />
            </div>
            <h2>{t('pages.wishlist.noFavorites', 'Aucun livre favori')}</h2>
            <p>{t('pages.wishlist.noFavoritesDesc', "Cliquez sur le coeur sur un livre pour l'ajouter à votre liste d'envie.")}</p>
            <div className="wishlist-empty__actions">
              <Link to="/catalog" className="wishlist-btn wishlist-btn--primary">
                <i className="fas fa-book" /> {t('pages.wishlist.exploreCatalog', 'Explorer le catalogue')}
              </Link>
            </div>
          </div>
        </div>
        <div className="wishlist-footer-fade" />
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      {!embedded && (
        <PageHero
          title={t('pages.wishlist.title')}
          subtitle={t('pages.wishlist.count', { count: wishlistItems.length })}
        />
      )}

      <div ref={embedded ? undefined : revealRef} className="wishlist-content reveal-section">
        {error && (
          <div className="wishlist-error">
            <i className="fas fa-exclamation-circle" aria-hidden="true" /> {error}
          </div>
        )}
        <div className="wishlist-grid">
          {wishlistItems.map((book) => (
            <div key={book.id} className="wishlist-card-wrapper">
              <BookCard book={book} />
              <div className="wishlist-card-actions">
                <button
                  type="button"
                  className="wishlist-remove"
                  onClick={() => handleRemove(book.id)}
                  aria-label={t('pages.wishlist.remove')}
                >
                  <i className="fas fa-heart-broken" aria-hidden="true" />
                  {t('pages.wishlist.remove')}
                </button>
                {book.available && !isInCart(book.id) && (
                  <button
                    type="button"
                    className="wishlist-add-cart"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddToCart(book);
                    }}
                    aria-label={t('bookCard.addToCart', 'Ajouter au panier')}
                  >
                    <i className="fas fa-shopping-cart" />
                    {t('pages.wishlist.addToCart', 'Au panier')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="wishlist-footer-fade" />
    </div>
  );
};

export default Wishlist;
