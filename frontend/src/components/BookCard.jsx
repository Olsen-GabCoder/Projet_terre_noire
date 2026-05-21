import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { TnPrice, TnStars, TnBookCover } from './ui';
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

        {/* Promo badge */}
        {book.has_discount && book.discount_percentage && (
          <span className="tn-book-card__badge tn-book-card__badge--promo">
            -{book.discount_percentage}%
          </span>
        )}

        {/* New badge (if no promo, added < 30 days) */}
        {isNew && !book.has_discount && (
          <span className="tn-book-card__badge tn-book-card__badge--new">Nouveau</span>
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
          {book.format_display && <span className="tn-pill tn-pill--gray">{book.format_display}</span>}
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

        {/* Rating + ref */}
        <div className="tn-book-card__rating-row">
          {rating > 0 && <TnStars value={rating} count={book.rating_count} />}
          {book.reference && <span className="tn-book-card__ref">{book.reference}</span>}
        </div>

        {/* Price + action */}
        <div className="tn-book-card__footer">
          <TnPrice amount={price} oldAmount={oldPrice} size="sm" />
          {oos ? (
            <button className="tn-btn tn-btn--sm" disabled>Indisponible</button>
          ) : inCart ? (
            <button className="tn-btn tn-btn--dark tn-btn--sm" disabled>
              <i className="fas fa-check" /> Dans le panier
            </button>
          ) : (
            <button
              type="button"
              className="tn-btn tn-btn--primary tn-btn--sm"
              onClick={handleAddToCart}
            >
              <i className="fas fa-bag-shopping" /> Ajouter
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
