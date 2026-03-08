// frontend/src/components/BookCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/BookCard.css';

const BookCard = ({ book }) => {
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

  const formatPrice = (price) => {
    if (price == null) return '—';
    return parseFloat(price).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const coverImage = imageError
    ? '/images/default-book-cover.jpg'
    : (book.cover_image || '/images/default-book-cover.jpg');

  const authorName = typeof book.author === 'object' ? book.author?.full_name : book.author;
  const categoryName = typeof book.category === 'object' ? book.category?.name : book.category;
  const rating = book.rating ? parseFloat(book.rating) : 0;
  const formatDisplay = book.format_display || (book.format === 'EBOOK' ? 'Ebook' : book.format === 'PAPIER' ? 'Papier' : null);

  const renderStars = (value) => {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push(<i key={i} className="fas fa-star" />);
      else if (i === full && half) stars.push(<i key={i} className="fas fa-star-half-alt" />);
      else stars.push(<i key={i} className="far fa-star" />);
    }
    return stars;
  };

  return (
    <Link
      to={`/books/${book.id}`}
      className={`book-card ${!book.available ? 'book-card--unavailable' : ''}`}
    >
      <div className="book-card__cover">
        <button
          type="button"
          className={`book-card__wishlist ${isInWishlist(book.id) ? 'book-card__wishlist--active' : ''}`}
          onClick={handleToggleWishlist}
          aria-label={isInWishlist(book.id) ? 'Retirer de la liste d\'envie' : 'Ajouter à la liste d\'envie'}
        >
          <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} />
        </button>
        {!imageLoaded && <div className="book-card__cover-placeholder" />}
        <img
          src={coverImage}
          alt={book.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
        {book.has_discount && (
          <span className="book-card__badge">−{book.discount_percentage}%</span>
        )}
      </div>

      <div className="book-card__body">
        <div className="book-card__meta">
          {categoryName && (
            <span className="book-card__category">{categoryName}</span>
          )}
          {formatDisplay && (
            <span className="book-card__format">{formatDisplay}</span>
          )}
          {book.is_bestseller && (
            <span className="book-card__bestseller">Best-seller</span>
          )}
        </div>
        <h3 className="book-card__title">{book.title}</h3>
        {authorName && <p className="book-card__author">{authorName}</p>}

        {book.description && (
          <p className="book-card__desc">{book.description}</p>
        )}

        <div className="book-card__bottom">
          {rating > 0 && (
            <div className="book-card__rating">
              <span className="book-card__stars">{renderStars(rating)}</span>
              {book.rating_count > 0 && (
                <span className="book-card__rating-count">({book.rating_count})</span>
              )}
            </div>
          )}
          {book.reference && (
            <span className="book-card__ref">Ref. {book.reference}</span>
          )}
        </div>

        <div className="book-card__footer">
          <div className="book-card__price">
            {book.has_discount && book.original_price && (
              <span className="book-card__price-old">
                {formatPrice(book.original_price)} FCFA
              </span>
            )}
            <span className="book-card__price-current">
              {formatPrice(book.price)} FCFA
            </span>
          </div>
          {book.available ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className={`book-card__btn ${isInCart(book.id) ? 'book-card__btn--in-cart' : ''}`}
              disabled={isInCart(book.id)}
              aria-label={isInCart(book.id) ? 'Déjà dans le panier' : 'Ajouter au panier'}
            >
              {isInCart(book.id) ? 'Dans le panier' : 'Ajouter'}
            </button>
          ) : (
            <span className="book-card__unavailable">Indisponible</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
