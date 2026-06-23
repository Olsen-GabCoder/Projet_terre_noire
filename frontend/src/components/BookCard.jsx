import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { TnPrice, TnStars, TnBookCover } from './ui';
import TnBadge from './ui/TnBadge';
import TnButton from './ui/TnButton';
import '../styles/BookCard.css';

const BookCard = ({ book, featured = false }) => {
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(book);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(book);
  };

  const authorName = typeof book.author === 'object' ? book.author?.full_name : book.author;
  const categoryName = typeof book.category === 'object' ? book.category?.name : book.category;
  const rating = book.rating ? parseFloat(book.rating) : 0;
  const price = parseFloat(book.price) || 0;
  const oldPrice = book.has_discount && book.original_price ? parseFloat(book.original_price) : null;
  const liked = isInWishlist(book.id);
  const inCart = isInCart(book.id);
  const oos = !book.available;
  const hasCoverImage = book.cover_image && !imageError;
  const isNew = book.created_at && (Date.now() - new Date(book.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;
  const isValidIsbn = book.reference && /^(\d{10}|\d{13})$/.test(String(book.reference).replace(/[-\s]/g, ''));

  return (
    <Link
      to={`/books/${book.id}`}
      className={`tn-book-card ${oos ? 'tn-book-card--oos' : ''} ${featured ? 'tn-book-card--featured' : ''}`}
    >
      {/* Cover */}
      <div className="tn-book-card__cover">
        {hasCoverImage ? (
          <>
            {!imageLoaded && <div className="tn-book-card__cover-skeleton" />}
            <img
              src={book.cover_image}
              alt={book.title}
              loading="lazy"
              decoding="async"
              className="tn-book-card__cover-img"
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageError(true); setImageLoaded(true); }}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <TnBookCover book={book} />
        )}

        {/* Promo badge (V2 TnBadge) */}
        {book.has_discount && book.discount_percentage && (
          <div className="tn-book-card__badge-slot">
            <TnBadge variant="promo" pop>-{book.discount_percentage}%</TnBadge>
          </div>
        )}

        {/* New badge (V2 TnBadge) */}
        {isNew && !book.has_discount && (
          <div className="tn-book-card__badge-slot">
            <TnBadge variant="new" pop>Nouveau</TnBadge>
          </div>
        )}

        {/* Wishlist */}
        <button
          type="button"
          className={`tn-book-card__wishlist ${liked ? 'tn-book-card__wishlist--active' : ''}`}
          onClick={handleToggleWishlist}
          aria-label={liked ? 'Retirer de la liste d\'envie' : 'Ajouter à la liste d\'envie'}
        >
          <i className={`${liked ? 'fas' : 'far'} fa-heart`} />
        </button>

        {/* Out of stock overlay */}
        {oos && (
          <div className="tn-book-card__oos-overlay">
            <span className="tn-book-card__oos-label">Indisponible</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="tn-book-card__body">
        {/* Meta pills */}
        <div className="tn-book-card__meta">
          {categoryName && <span className="tn-pill tn-pill--orange">{categoryName}</span>}
          <span className="tn-pill tn-pill--gray">{book.has_ebook ? 'Papier + Ebook' : 'Papier'}</span>
          {book.is_bestseller && <span className="tn-pill tn-pill--dark">★ Best-seller</span>}
        </div>

        {/* Title */}
        <h3 className="tn-book-card__title">{book.title}</h3>

        {/* Author */}
        {authorName && (
          <p className="tn-book-card__author">
            par <span>{authorName}</span>
          </p>
        )}

        {/* Ref/ISBN — own line */}
        {isValidIsbn && <p className="tn-book-card__ref">{book.reference}</p>}

        {/* Rating */}
        {rating > 0 && (
          <div className="tn-book-card__rating-row">
            <TnStars value={rating} count={book.rating_count} />
          </div>
        )}

        {/* Price + action */}
        <div className="tn-book-card__footer">
          <TnPrice amount={price} oldAmount={oldPrice} size="sm" />
          {oos ? (
            <TnButton size="sm" disabled>Indisponible</TnButton>
          ) : inCart ? (
            <TnButton variant="dark" size="sm" disabled leftIcon={<i className="fas fa-check" />}>
              Dans le panier
            </TnButton>
          ) : (
            <TnButton
              variant="primary"
              size="sm"
              onClick={handleAddToCart}
              leftIcon={<i className="fas fa-bag-shopping" />}
            >
              Ajouter
            </TnButton>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
