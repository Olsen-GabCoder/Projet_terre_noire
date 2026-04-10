// frontend/src/components/BookCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FastAverageColor } from 'fast-average-color';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/BookCard.css';

/* ── Cache global : couleur dominante par book.id ── */
const bloomColorCache = new Map();
const fac = new FastAverageColor();

/* Palette de fallback dérivée de l'ID du livre */
const FALLBACK_PALETTE = [
  'rgb(99, 102, 241)',    // indigo
  'rgb(20, 184, 166)',    // teal
  'rgb(239, 68, 68)',     // coral
  'rgb(245, 158, 11)',    // amber
  'rgb(139, 92, 246)',    // violet
  'rgb(59, 130, 246)',    // blue
];

/* Dégradés de fond pour la scène — jamais le même noir plat */
const STAGE_GRADIENTS = [
  'linear-gradient(160deg, #0c1222 0%, #1a1035 55%, #0d0d1a 100%)',  // indigo nuit
  'linear-gradient(160deg, #0a1218 0%, #0d2028 55%, #0a0f14 100%)',  // teal profond
  'linear-gradient(160deg, #14080a 0%, #1f0e12 55%, #0d0808 100%)',  // bordeaux sombre
  'linear-gradient(160deg, #121008 0%, #1c1608 55%, #0e0c06 100%)',  // ambre nuit
  'linear-gradient(160deg, #0e0a18 0%, #180e2a 55%, #0a0814 100%)',  // violet cosmos
  'linear-gradient(160deg, #080e18 0%, #0c1628 55%, #080c14 100%)',  // bleu abysse
];

const BookCard = React.memo(function BookCard({ book }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [bloomColor, setBloomColor] = useState(() =>
    bloomColorCache.get(book.id) || FALLBACK_PALETTE[book.id % FALLBACK_PALETTE.length]
  );
  const imgRef = useRef(null);

  // Listings marketplace triés par prix (en stock uniquement)
  const listings = (book.listings || []).filter((l) => l.in_stock);
  const bestListing = listings.length === 1 ? listings[0] : null;

  // Extraction couleur dominante depuis la couverture (avec cache)
  useEffect(() => {
    if (bloomColorCache.has(book.id)) return;
    if (!imageLoaded || imageError || !imgRef.current) return;

    const img = imgRef.current;
    // Attendre que l'image soit décodée
    const extract = () => {
      try {
        const result = fac.getColor(img, { algorithm: 'dominant', mode: 'precision' });
        const [r, g, b] = result.value;
        const color = `rgb(${r}, ${g}, ${b})`;
        bloomColorCache.set(book.id, color);
        setBloomColor(color);
      } catch {
        // CORS ou erreur — on garde le fallback
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      extract();
    }
  }, [imageLoaded, imageError, book.id]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(book, 1, bestListing);
    toast.success(t('bookCard.addedToCart', { title: book.title }));
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wasInWishlist = isInWishlist(book.id);
    toggleWishlist(book);
    if (wasInWishlist) {
      toast(t('bookCard.removedFromWishlist'), { icon: '💔' });
    } else {
      toast.success(t('bookCard.addedToWishlist'));
    }
  };

  const formatPrice = (price) => {
    if (price == null) return '—';
    return parseFloat(price).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const coverImage = imageError
    ? '/images/default-book-cover.svg'
    : (book.cover_image || '/images/default-book-cover.svg');

  const authorObj = typeof book.author === 'object' ? book.author : null;
  const authorName = authorObj?.display_name || authorObj?.full_name || book.author;
  const authorId = authorObj?.id;
  const categoryName = typeof book.category === 'object' ? book.category?.name : book.category;
  const rating = book.rating ? parseFloat(book.rating) : 0;
  const formatDisplay = book.format_display
    || (book.format === 'EBOOK' ? t('bookCard.formatEbook', 'Ebook') : book.format === 'PAPIER' ? t('bookCard.formatPaper', 'Papier') : null);

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

  const isEbook = book.format === 'EBOOK';
  const stageGradient = STAGE_GRADIENTS[book.id % STAGE_GRADIENTS.length];

  return (
    <Link
      to={`/books/${book.id}`}
      className={`book-card ${!book.available ? 'book-card--unavailable' : ''}`}
    >
      {/* ── SCÈNE MUSÉALE ── */}
      <div className="book-card__stage" style={{ '--bloom-color': bloomColor, background: stageGradient }}>
        <div className="book-card__bloom" />
        <div className="book-card__floor" />
        <div className="book-card__topline" />

        {book.publisher_name && (
          <span className="book-card__publisher">{book.publisher_name}</span>
        )}

        <button
          type="button"
          className={`book-card__wishlist ${isInWishlist(book.id) ? 'book-card__wishlist--active' : ''}`}
          onClick={handleToggleWishlist}
          aria-label={isInWishlist(book.id) ? t('bookCard.removeFromWishlist') : t('bookCard.addToWishlist')}
        >
          <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} />
        </button>

        <div className="book-card__cover-wrap">
          {!imageLoaded && <div className="book-card__cover-placeholder" />}
          <img
            ref={imgRef}
            className="book-card__cover"
            src={coverImage}
            alt={book.title}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            onLoad={() => setImageLoaded(true)}
            onError={() => { setImageError(true); setImageLoaded(true); }}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
        </div>

        {/* Reflet */}
        {imageLoaded && !imageError && (
          <div className="book-card__reflect">
            <img src={coverImage} alt="" aria-hidden="true" />
          </div>
        )}

        {/* Badges scène */}
        {book.has_discount && (
          <span className="book-card__discount">-{book.discount_percentage}%</span>
        )}
        {book.is_new && (
          <span className="book-card__new-badge">{t('bookCard.new', 'Nouveauté')}</span>
        )}
      </div>

      {/* ── CORPS MÉTADONNÉES ── */}
      <div className="book-card__body">
        <div className="book-card__meta">
          {categoryName && (
            <span className="book-card__category">{categoryName}</span>
          )}
          {categoryName && formatDisplay && (
            <span className="book-card__meta-dot" />
          )}
          {formatDisplay && (
            <span className={`book-card__format ${isEbook ? 'book-card__format--ebook' : 'book-card__format--paper'}`}>
              {formatDisplay}
            </span>
          )}
        </div>

        <h3 className="book-card__title">{book.title}</h3>

        {authorId ? (
          <p
            className="book-card__author book-card__author--link"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/authors/${authorId}`); }}
            role="link"
            tabIndex={0}
          >
            {authorName}
          </p>
        ) : (
          <p className="book-card__author">{authorName || '\u00A0'}</p>
        )}

        <div className="book-card__rating">
          {rating > 0 ? (
            <>
              <span className="book-card__stars">{renderStars(rating)}</span>
              <span className="book-card__rating-value">{rating.toFixed(1)}</span>
              {book.rating_count > 0 && (
                <span className="book-card__rating-count">({book.rating_count})</span>
              )}
            </>
          ) : (
            <span className="book-card__rating-placeholder">{'\u00A0'}</span>
          )}
        </div>

        {/* Badges info */}
        <div className="book-card__badges">
          {book.is_bestseller && (
            <span className="book-card__badge-bestseller">
              <i className="fas fa-fire" /> Best-seller
            </span>
          )}
          {book.best_listing_price && parseFloat(book.best_listing_price) < parseFloat(book.price) && (
            <span className="book-card__badge-listing">
              <i className="fas fa-store" /> {formatPrice(book.best_listing_price)} FCFA
            </span>
          )}
          {listings.length > 0 && (
            <span className="book-card__badge-vendors">
              {listings.length} {listings.length > 1 ? t('bookCard.vendors_plural') : t('bookCard.vendor')}
            </span>
          )}
          {book.library_count > 0 && (
            <span className="book-card__badge-library">
              <i className="fas fa-landmark" /> {book.library_count} {book.library_count > 1 ? 'bibliothèques' : 'bibliothèque'}
            </span>
          )}
        </div>

        <div className="book-card__footer">
          <div className="book-card__price">
            {book.has_discount && book.original_price && (
              <span className="book-card__price-old">
                {formatPrice(book.original_price)}
              </span>
            )}
            <span className="book-card__price-current">
              {formatPrice(book.price)}
            </span>
            <span className="book-card__price-currency">FCFA</span>
          </div>

          {book.available ? (
            listings.length > 1 ? (
              <span className="book-card__btn book-card__btn--compare">
                <i className="fas fa-balance-scale" /> {t('bookCard.compare')}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`book-card__btn ${isInCart(book.id) ? 'book-card__btn--in-cart' : ''}`}
                disabled={isInCart(book.id)}
                aria-label={isInCart(book.id) ? t('bookCard.alreadyInCart') : t('bookCard.addToCart')}
              >
                {isInCart(book.id)
                  ? <><i className="fas fa-check" /> {t('bookCard.inCart')}</>
                  : <><i className="fas fa-shopping-bag" /> {t('bookCard.add')}</>
                }
              </button>
            )
          ) : (
            <span className="book-card__unavailable">{t('bookCard.unavailable')}</span>
          )}
        </div>
      </div>
    </Link>
  );
});

export default BookCard;
