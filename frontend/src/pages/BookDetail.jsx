import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BookCard from '../components/BookCard';
import bookService from '../services/bookService';
import SEO from '../components/SEO';
import ShareButtons from '../components/ShareButtons';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import '../styles/BookDetail.css';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [expandedReplies, setExpandedReplies] = useState({});
  const [selectedListing, setSelectedListing] = useState(null);
  const [reviewsPagination, setReviewsPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  });
  const menuRef = useRef(null);

  const isRepliesExpanded = (reviewId) => expandedReplies[reviewId] !== false;
  const toggleReplies = (reviewId) => {
    setExpandedReplies((prev) => ({ ...prev, [reviewId]: prev[reviewId] === false }));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const [bookData, relatedData] = await Promise.all([
          bookService.getBookById(id),
          bookService.getRelatedBooks(id),
        ]);
        setBook(bookData);
        setRelatedBooks(Array.isArray(relatedData) ? relatedData : []);
      } catch (err) {
        setError(t('bookDetail.notFound'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  const fetchReviews = async (page = 1, append = false) => {
    if (!id) return;
    try {
      const data = await bookService.getBookReviews(id, { page, page_size: 10 });
      const list = data.results ?? (Array.isArray(data) ? data : []);
      setReviews((prev) => (append ? [...prev, ...list] : list));
      setReviewsPagination({
        count: data.count ?? list.length,
        next: data.next,
        previous: data.previous,
        page,
      });
    } catch (e) {
      setReviews([]);
      setReviewsPagination({ count: 0, next: null, previous: null, page: 1 });
    }
  };

  const fetchMyReview = async () => {
    if (!id || !isAuthenticated) return;
    try {
      const mine = await bookService.getMyReview(id);
      setMyReview(mine);
    } catch {
      setMyReview(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews' && id) {
      fetchReviews(1);
      fetchMyReview();
    }
  }, [activeTab, id, isAuthenticated]);

  const handleAddToCart = (listing = selectedListing) => {
    if (book?.available) {
      addToCart(book, quantity, listing);
      toast.success(t('bookDetail.addedToCart'));
    }
  };

  const handleBuyNow = () => {
    if (book?.available) {
      addToCart(book, quantity, selectedListing);
      toast.success(t('bookDetail.addedToCart'));
      navigate('/cart');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!id || !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/books/${id}` } } });
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const data = await bookService.submitReview(id, {
        rating: parseInt(reviewForm.rating, 10),
        comment: reviewForm.comment.trim(),
      });
      setMyReview(data);
      await fetchReviews(1);
      await fetchMyReview();
      const bookData = await bookService.getBookById(id);
      setBook(bookData);
    } catch (err) {
      setReviewError(err.response?.data?.detail || err.response?.data?.rating?.[0] || t('common.error'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const isMyReview = (r) => user && (r.user === user.id || String(r.user) === String(user.id));

  const handleReviewEdit = (r) => {
    setEditingReviewId(r.id);
    setEditForm({ rating: r.rating ?? 5, comment: r.comment || '' });
    setOpenMenuId(null);
  };

  const handleReviewEditSubmit = async (e) => {
    e.preventDefault();
    if (!id || !editingReviewId || !isAuthenticated) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const data = await bookService.submitReview(id, {
        rating: parseInt(editForm.rating, 10),
        comment: editForm.comment.trim(),
      });
      setMyReview(data);
      setEditingReviewId(null);
      await fetchReviews(reviewsPagination.page);
      await fetchMyReview();
      const bookData = await bookService.getBookById(id);
      setBook(bookData);
    } catch (err) {
      setReviewError(err.response?.data?.detail || err.response?.data?.rating?.[0] || t('common.error'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewDelete = async (review) => {
    if (!id || !review) return;
    setReviewSubmitting(true);
    setOpenMenuId(null);
    setReviewError('');
    try {
      const isMain = !review.parent;
      if (isMain) {
        await bookService.deleteReview(id);
        setMyReview(null);
        setEditingReviewId(null);
        setReviewForm({ rating: 5, comment: '' });
      } else {
        await bookService.deleteReviewById(id, review.id);
      }
      await fetchReviews(reviewsPagination.page);
      if (isMain) {
        await fetchMyReview();
        const bookData = await bookService.getBookById(id);
        setBook(bookData);
      }
    } catch (e) {
      setReviewError(t('common.error'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReplySubmit = async (reviewId) => {
    if (!id || !replyText.trim() || !isAuthenticated) return;
    setReplySubmitting(true);
    try {
      await bookService.replyToReview(id, reviewId, replyText);
      setReplyingTo(null);
      setReplyText('');
      setExpandedReplies((prev) => ({ ...prev, [reviewId]: true }));
      await fetchReviews(reviewsPagination.page);
    } catch (e) {
      setReviewError(e.response?.data?.comment?.[0] || t('common.error'));
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleLikeToggle = async (review) => {
    if (!id || !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/books/${id}` } } });
      return;
    }
    try {
      const liked = review.user_has_liked;
      if (liked) {
        await bookService.unlikeReview(id, review.id);
      } else {
        await bookService.likeReview(id, review.id);
      }
      await fetchReviews(reviewsPagination.page);
    } catch (e) {
      console.error('Erreur like:', e);
    }
  };

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

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) setQuantity(newQuantity);
  };

  const formatPrice = (price) => {
    return Math.round(parseFloat(price)).toLocaleString('fr-FR') + ' FCFA';
  };

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !book) {
    return (
      <div className="bd-page">
        <section className="bd-hero bd-hero--error">
          <div className="bd-hero__inner">
            <h1 className="bd-hero__title">{t('bookDetail.notFound')}</h1>
            <p className="bd-hero__sub">{error || t('bookDetail.notFoundMessage')}</p>
            <Link to="/catalog" className="bd-btn bd-btn--primary">
              <i className="fas fa-arrow-left" /> {t('bookDetail.returnCatalog')}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const authorName = book.author?.display_name || book.author?.full_name || t('bookDetail.unknownAuthor');
  const authorId = book.author?.id;
  const categoryName = book.category?.name || t('bookDetail.uncategorized');

  return (
    <div className="bd-page">
      {book && <SEO
        title={book.title}
        description={book.description?.slice(0, 160)}
        image={book.cover_image}
        type="book"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: book.title,
          ...(book.isbn && { isbn: book.isbn }),
          ...(typeof book.author === 'object'
            ? { author: { '@type': 'Person', name: book.author?.full_name } }
            : book.author ? { author: { '@type': 'Person', name: book.author } } : {}),
          ...(book.description && { description: book.description.slice(0, 300) }),
          ...(book.cover_image && { image: book.cover_image }),
          ...(book.price && {
            offers: {
              '@type': 'Offer',
              price: book.price,
              priceCurrency: 'XAF',
              availability: book.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          }),
          ...(book.rating && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: book.rating,
              ...(book.rating_count && { ratingCount: book.rating_count }),
            },
          }),
        }}
      />}
      {/* Hero compact */}
      <section className="bd-hero">
        <div className="bd-hero__orb bd-hero__orb--1" />
        <div className="bd-hero__orb bd-hero__orb--2" />
        <div className="bd-hero__grid-bg" />
        <div className="bd-hero__inner">
          <nav className="bd-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/catalog" className="bd-breadcrumb__link">{t('bookDetail.breadcrumbCatalog')}</Link>
            <span className="bd-breadcrumb__sep">/</span>
            <span className="bd-breadcrumb__current">{book.title}</span>
          </nav>
          <div className="bd-hero__line" />
          <h1 className="bd-hero__title">{book.title}</h1>
          <p className="bd-hero__meta">
            {authorId ? <Link to={`/authors/${authorId}`} className="bd-hero__author-link">{authorName}</Link> : authorName} · {categoryName}
            {book.is_bestseller && (
              <span className="bd-hero__bestseller">
                <i className="fas fa-fire" /> Best-seller
                {book.total_sales > 0 && ` · ${book.total_sales} vendu${book.total_sales > 1 ? 's' : ''}`}
              </span>
            )}
          </p>
        </div>
      </section>
      <div className="bd-hero-fade" />

      {/* Contenu principal */}
      <div className="bd-content">
        <div className="bd-wrap">
          <div className="bd-main">
            {/* Couvertures — livre ouvert */}
            <div className={`bd-image-section ${book.back_cover_image ? 'bd-image-section--duo' : ''}`}>
              <div className="bd-book-display">
                {/* Couverture arrière (gauche) */}
                {book.back_cover_image && (
                  <div className="bd-cover bd-cover--back">
                    <div className="bd-cover__label">{t('bookDetail.backCover', '4e de couverture')}</div>
                    <div className="bd-cover__frame">
                      <img
                        src={book.back_cover_image}
                        alt={`Quatrième de couverture — ${book.title}`}
                        width={340}
                        height={480}
                        loading="lazy"
                        onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                      />
                    </div>
                  </div>
                )}
                {/* Couverture avant (droite ou seule) */}
                <div className="bd-cover bd-cover--front">
                  {book.back_cover_image && <div className="bd-cover__label">{t('bookDetail.frontCover', 'Couverture')}</div>}
                  <div className="bd-cover__frame">
                    <button
                      type="button"
                      className={`bd-wishlist ${isInWishlist(book.id) ? 'bd-wishlist--active' : ''}`}
                      onClick={() => toggleWishlist(book)}
                      aria-label={isInWishlist(book.id) ? 'Retirer de la liste d\'envie' : 'Ajouter à la liste d\'envie'}
                    >
                      <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} />
                      <span>{isInWishlist(book.id) ? t('bookDetail.wishlistInList') : t('bookDetail.wishlistAdd')}</span>
                    </button>
                    <img
                      src={book.cover_image || '/images/default-book-cover.svg'}
                      alt={book.title}
                      width={340}
                      height={480}
                      loading="lazy"
                    />
                    {book.has_discount && (
                      <span className="bd-image-badge bd-image-badge--promo">
                        −{book.discount_percentage}%
                      </span>
                    )}
                    {!book.available && (
                      <span className="bd-image-badge bd-image-badge--unavailable">{t('bookDetail.unavailable')}</span>
                    )}
                    {book.format === 'EBOOK' && (
                      <span className="bd-image-badge bd-image-badge--format">
                        <i className="fas fa-file-pdf" /> Ebook
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Reliure centrale */}
              {book.back_cover_image && <div className="bd-book-spine" aria-hidden="true" />}
            </div>

            {/* Infos + actions */}
            <div className="bd-info-section">
              <div className="bd-info-block">
                <div className="bd-meta-row">
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">{t('bookDetail.tabAuthor')}</span>
                    <span className="bd-meta-value">{authorId ? <Link to={`/authors/${authorId}`} className="bd-hero__author-link">{authorName}</Link> : authorName}</span>
                  </span>
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">Catégorie</span>
                    <span className="bd-meta-value">{categoryName}</span>
                  </span>
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">Format</span>
                    <span className="bd-meta-value">
                      {book.format === 'EBOOK' ? t('bookDetail.ebookFormat') : t('bookDetail.paperFormat')}
                    </span>
                  </span>
                  {book.reference && (
                    <span className="bd-meta-item">
                      <span className="bd-meta-label">{t('bookDetail.reference')}</span>
                      <span className="bd-meta-value bd-meta-value--code">{book.reference}</span>
                    </span>
                  )}
                  {book.publisher_name && (
                    <span className="bd-meta-item">
                      <span className="bd-meta-label">Éditeur</span>
                      <Link to={`/organizations/${book.publisher_slug}`} className="bd-meta-value bd-meta-value--link">
                        <i className="fas fa-book-open" /> {book.publisher_name}
                      </Link>
                    </span>
                  )}
                </div>
              </div>

              <div className="bd-price-block">
                <div className="bd-price-row">
                  {selectedListing ? (
                    <>
                      {selectedListing.has_discount && selectedListing.original_price && (
                        <span className="bd-price-old">{formatPrice(selectedListing.original_price)}</span>
                      )}
                      <span className="bd-price">{formatPrice(selectedListing.price)}</span>
                      <span className="bd-price-vendor">chez {selectedListing.vendor_name}</span>
                    </>
                  ) : (
                    <>
                      {book.has_discount && book.original_price && (
                        <span className="bd-price-old">{formatPrice(book.original_price)}</span>
                      )}
                      <span className="bd-price">{formatPrice(book.price)}</span>
                      {book.best_listing_price && parseFloat(book.best_listing_price) < parseFloat(book.price) && (
                        <span className="bd-price-from">
                          ou {formatPrice(book.best_listing_price)} en librairie
                        </span>
                      )}
                    </>
                  )}
                  {book.format === 'EBOOK' && (
                    <span className="bd-price-vat">{t('bookDetail.vatIncluded')}</span>
                  )}
                </div>
                <div className="bd-availability">
                  {book.available ? (
                    <span className="bd-availability--ok">
                      <i className="fas fa-check-circle" /> {t('bookDetail.inStock')}
                    </span>
                  ) : (
                    <span className="bd-availability--no">
                      <i className="fas fa-times-circle" /> {t('bookDetail.outOfStock')}
                    </span>
                  )}
                </div>
              </div>

              {/* Offres vendeurs (marketplace) */}
              {book.listings && book.listings.length > 0 && (
                <div className="bd-vendors">
                  <h3 className="bd-vendors__title">
                    <i className="fas fa-store" /> {book.listings.length} {book.listings.length > 1 ? 'vendeurs proposent ce livre' : 'vendeur propose ce livre'}
                  </h3>
                  <div className="bd-vendors__list">
                    {book.listings.map((listing) => (
                      <button
                        key={listing.id}
                        type="button"
                        className={`bd-vendor-card ${selectedListing?.id === listing.id ? 'bd-vendor-card--selected' : ''}`}
                        onClick={() => setSelectedListing(
                          selectedListing?.id === listing.id ? null : listing
                        )}
                      >
                        <div className="bd-vendor-card__header">
                          <span className="bd-vendor-card__name">
                            {listing.vendor_name}
                            {listing.vendor_is_verified && (
                              <i className="fas fa-check-circle bd-vendor-card__verified" title="Vendeur vérifié" />
                            )}
                          </span>
                          {listing.vendor_city && (
                            <span className="bd-vendor-card__city">
                              <i className="fas fa-map-marker-alt" /> {listing.vendor_city}
                            </span>
                          )}
                        </div>
                        <div className="bd-vendor-card__body">
                          <span className="bd-vendor-card__price">{formatPrice(listing.price)}</span>
                          <span className={`bd-vendor-card__condition bd-vendor-card__condition--${listing.condition.toLowerCase()}`}>
                            {listing.condition_display}
                          </span>
                        </div>
                        <div className="bd-vendor-card__footer">
                          {listing.in_stock ? (
                            <span className="bd-vendor-card__stock bd-vendor-card__stock--ok">
                              <i className="fas fa-check" /> En stock
                            </span>
                          ) : (
                            <span className="bd-vendor-card__stock bd-vendor-card__stock--no">
                              <i className="fas fa-times" /> Rupture
                            </span>
                          )}
                          {listing.has_discount && (
                            <span className="bd-vendor-card__discount">
                              -{listing.discount_percentage}%
                            </span>
                          )}
                        </div>
                        {selectedListing?.id === listing.id && (
                          <span className="bd-vendor-card__check">
                            <i className="fas fa-check-circle" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedListing && (
                    <p className="bd-vendors__selected">
                      <i className="fas fa-info-circle" /> Achat chez <strong>{selectedListing.vendor_name}</strong> pour {formatPrice(selectedListing.price)}
                    </p>
                  )}
                </div>
              )}

              {/* Disponibilité en bibliothèque */}
              {book.library_availability && book.library_availability.length > 0 && (
                <div className="bd-libraries">
                  <h3 className="bd-libraries__title">
                    <i className="fas fa-landmark" /> Disponible dans {book.library_availability.length} {book.library_availability.length > 1 ? 'bibliothèques' : 'bibliothèque'}
                  </h3>
                  <div className="bd-libraries__list">
                    {book.library_availability.map((lib) => (
                      <Link
                        key={lib.id}
                        to={`/library/${lib.library_slug}`}
                        className="bd-library-card"
                      >
                        <div className="bd-library-card__header">
                          <span className="bd-library-card__name">
                            {lib.library_name}
                            {lib.library_is_verified && (
                              <i className="fas fa-check-circle bd-library-card__verified" title="Vérifiée" />
                            )}
                          </span>
                          {lib.library_city && (
                            <span className="bd-library-card__city">
                              <i className="fas fa-map-marker-alt" /> {lib.library_city}
                            </span>
                          )}
                        </div>
                        <div className="bd-library-card__body">
                          <span className={`bd-library-card__stock ${lib.in_stock ? 'bd-library-card__stock--ok' : 'bd-library-card__stock--no'}`}>
                            {lib.in_stock ? (
                              <><i className="fas fa-check" /> {lib.available_copies}/{lib.total_copies} disponible{lib.available_copies > 1 ? 's' : ''}</>
                            ) : (
                              <><i className="fas fa-clock" /> Tous empruntés</>
                            )}
                          </span>
                          <span className="bd-library-card__loan-days">
                            <i className="fas fa-calendar-alt" /> {lib.max_loan_days}j de prêt
                          </span>
                          {lib.allows_digital_loan && (
                            <span className="bd-library-card__digital">
                              <i className="fas fa-tablet-alt" /> Prêt numérique
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {book.pdf_file && isAuthenticated && (
                <div className="bd-read-action">
                  <Link to={`/books/${id}/read`} className="bd-btn bd-btn--read">
                    <i className="fas fa-book-open" /> {t('bookDetail.readBook')}
                  </Link>
                </div>
              )}
              {book.pdf_file && !isAuthenticated && (
                <div className="bd-read-action">
                  <Link to="/login" className="bd-btn bd-btn--read bd-btn--disabled">
                    <i className="fas fa-lock" /> {t('bookDetail.loginToRead')}
                  </Link>
                </div>
              )}

              {book.available && (
                <div className="bd-actions">
                  <div className="bd-quantity">
                    <button
                      type="button"
                      className="bd-quantity__btn"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      aria-label={t('bookDetail.decreaseQty')}
                    >
                      −
                    </button>
                    <span className="bd-quantity__val">{quantity}</span>
                    <button
                      type="button"
                      className="bd-quantity__btn"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= 10}
                      aria-label={t('bookDetail.increaseQty')}
                    >
                      +
                    </button>
                  </div>
                  <div className="bd-action-btns">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`bd-btn bd-btn--cart ${isInCart(book.id) ? 'bd-btn--in-cart' : ''}`}
                      disabled={isInCart(book.id)}
                    >
                      {isInCart(book.id) ? (
                        <><i className="fas fa-check" /> {getItemQuantity(book.id)} {t('bookDetail.itemsInCart')}</>
                      ) : (
                        <><i className="fas fa-shopping-cart" /> {t('bookDetail.addToCart')}</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="bd-btn bd-btn--buy"
                    >
                      <i className="fas fa-bolt" /> {t('bookDetail.buyNow')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Partage social */}
          <ShareButtons book={book} />

          {/* Onglets */}
          <div className="bd-tabs">
            <div className="bd-tabs__header" role="tablist">
              {[
                { id: 'description', label: t('bookDetail.tabDescription'), icon: 'fas fa-align-left' },
                { id: 'details', label: t('bookDetail.tabDetails'), icon: 'fas fa-info-circle' },
                { id: 'author', label: t('bookDetail.tabAuthor'), icon: 'fas fa-user-pen' },
                { id: 'reviews', label: `${t('bookDetail.tabReviews')} (${book?.rating_count || 0})`, icon: 'fas fa-star' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`bd-tabs__btn ${activeTab === tab.id ? 'bd-tabs__btn--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={tab.icon} /> {tab.label}
                </button>
              ))}
            </div>
            <div className="bd-tabs__content">
              {activeTab === 'description' && (
                <div className="bd-tab-panel" role="tabpanel">
                  <h3 className="bd-tab-panel__title">{t('bookDetail.aboutThisBook')}</h3>
                  <p className="bd-description">
                    {book.description || t('bookDetail.noDescription')}
                  </p>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="bd-tab-panel" role="tabpanel">
                  <h3 className="bd-tab-panel__title">{t('bookDetail.characteristics')}</h3>
                  <div className="bd-details-grid">
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">Format</span>
                      <span className="bd-detail-value">
                        {book.format === 'EBOOK' ? t('bookDetail.ebookFormat') : t('bookDetail.paperFormat')}
                      </span>
                    </div>
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">{t('bookDetail.reference')}</span>
                      <span className="bd-detail-value">{book.reference || '—'}</span>
                    </div>
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">{t('bookDetail.publicationDate')}</span>
                      <span className="bd-detail-value">
                        {book.created_at
                          ? new Date(book.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'author' && (
                <div className="bd-tab-panel bd-author-panel" role="tabpanel">
                  {book.author ? (
                    <div className="bd-author">
                      <div className="bd-author__photo">
                        <img
                          src={book.author.display_photo || book.author.photo || '/images/default-author.jpg'}
                          alt={book.author.display_name || book.author.full_name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.target.src = '/images/default-book-cover.svg';
                          }}
                        />
                      </div>
                      <div className="bd-author__info">
                        <h3>{book.author.display_name || book.author.full_name}</h3>
                        <p>
                          {(book.author.display_bio || book.author.biography)
                            ? (book.author.display_bio || book.author.biography).length > 300
                              ? (book.author.display_bio || book.author.biography).substring(0, 300) + '…'
                              : (book.author.display_bio || book.author.biography)
                            : t('bookDetail.noBio')}
                        </p>
                        {book.author.is_registered && (
                          <span className="bd-author__registered"><i className="fas fa-check-circle" /> Auteur inscrit sur Frollot</span>
                        )}
                        <Link
                          to={`/authors/${book.author.id}`}
                          className="bd-btn bd-btn--outline"
                        >
                          <i className="fas fa-book" /> {t('bookDetail.viewAuthorBooks')}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p>{t('bookDetail.noAuthorInfo')}</p>
                  )}
                </div>
              )}
              {activeTab === 'reviews' && (
                <div className="bd-tab-panel bd-tab-panel--reviews" role="tabpanel">
                  <h3 className="bd-tab-panel__title">{t('bookDetail.readerReviews')}</h3>

                  {isAuthenticated && !myReview && (
                    <form className="bd-review-form" onSubmit={handleReviewSubmit}>
                      <div className="bd-review-form__rating">
                        <label>{t('bookDetail.yourRating')}</label>
                        <div className="bd-review-stars-input">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={`bd-review-star-btn ${reviewForm.rating >= star ? 'active' : ''}`}
                              onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                            >
                              <i className={reviewForm.rating >= star ? 'fas fa-star' : 'far fa-star'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bd-review-form__comment">
                        <label htmlFor="review-comment">{t('bookDetail.yourOpinion')}</label>
                        <textarea
                          id="review-comment"
                          rows={4}
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                          placeholder={t('bookDetail.opinionPlaceholder')}
                          maxLength={1000}
                        />
                      </div>
                      {reviewError && <p className="bd-review-form__error">{reviewError}</p>}
                      <div className="bd-review-form__actions">
                        <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>
                          {reviewSubmitting ? t('bookDetail.publishing') : t('bookDetail.publishReview')}
                        </button>
                      </div>
                    </form>
                  )}

                  {reviewError && (
                    <p className="bd-review-form__error">{reviewError}</p>
                  )}

                  {!isAuthenticated && (
                    <p className="bd-review-login-prompt">
                      <Link to="/login" className="bd-btn bd-btn--primary">
                        {t('bookDetail.loginForReview')}
                      </Link>
                    </p>
                  )}

                  <div className="bd-reviews-list">
                    {reviews.length === 0 ? (
                      <div className="bd-no-reviews">
                        <p><i className="far fa-comment-dots" /> {t('bookDetail.noReviews')}</p>
                      </div>
                    ) : (
                      reviews.map((r) => (
                        <div key={r.id} className={`bd-review-card ${r.parent ? 'bd-review-card--reply' : ''}`}>
                          <div className="bd-review-card__top">
                            <div className="bd-review-card__avatar">
                              {r.user_profile_image ? (
                                <img
                                  src={r.user_profile_image}
                                  alt=""
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling?.classList.add('bd-review-card__avatar-fallback--show');
                                  }}
                                />
                              ) : null}
                              <span className="bd-review-card__avatar-fallback" aria-hidden="true">
                                {(r.user_display || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="bd-review-card__main">
                              <div className="bd-review-card__header">
                                <span className="bd-review-card__author">{r.user_display}</span>
                                {r.rating != null && editingReviewId !== r.id && (
                                  <span className="bd-review-card__stars">{renderStars(r.rating)}</span>
                                )}
                                <span className="bd-review-card__date">
                                  {new Date(r.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                                {!r.parent && isMyReview(r) && (
                                  <div className="bd-review-card__menu" ref={openMenuId === r.id ? menuRef : null}>
                                    <button
                                      type="button"
                                      className="bd-review-card__menu-btn"
                                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id); }}
                                      aria-label="Plus d'options"
                                      aria-expanded={openMenuId === r.id}
                                    >
                                      <i className="fas fa-ellipsis-v" />
                                    </button>
                                    {openMenuId === r.id && (
                                      <div className="bd-review-card__dropdown">
                                        <button type="button" onClick={() => handleReviewEdit(r)}>
                                          <i className="far fa-edit" /> {t('common.edit')}
                                        </button>
                                        <button type="button" onClick={() => handleReviewDelete(r)} className="bd-review-card__dropdown-delete">
                                          <i className="far fa-trash-alt" /> {t('common.delete')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingReviewId === r.id ? (
                                <form className="bd-review-edit-form" onSubmit={handleReviewEditSubmit}>
                                  <div className="bd-review-edit-form__stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        className={`bd-review-star-btn ${editForm.rating >= star ? 'active' : ''}`}
                                        onClick={() => setEditForm((f) => ({ ...f, rating: star }))}
                                      >
                                        <i className={editForm.rating >= star ? 'fas fa-star' : 'far fa-star'} />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    value={editForm.comment}
                                    onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
                                    placeholder={t('bookDetail.opinionPlaceholder')}
                                    rows={3}
                                    maxLength={1000}
                                  />
                                  <div className="bd-review-edit-form__actions">
                                    <button type="button" className="bd-btn bd-btn--ghost" onClick={() => { setEditingReviewId(null); setReviewError(''); }}>
                                      {t('common.cancel')}
                                    </button>
                                    <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>
                                      {reviewSubmitting ? t('bookDetail.publishing') : t('common.save')}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                r.comment && <p className="bd-review-card__comment">{r.comment}</p>
                              )}
                              <div className="bd-review-card__actions">
                                <button
                                  type="button"
                                  className={`bd-review-card__like ${r.user_has_liked ? 'bd-review-card__like--active' : ''}`}
                                  onClick={() => handleLikeToggle(r)}
                                  aria-label={r.user_has_liked ? 'Retirer le like' : 'Liker'}
                                >
                                  <i className={r.user_has_liked ? 'fas fa-heart' : 'far fa-heart'} />
                                  <span>{r.likes_count ?? 0}</span>
                                </button>
                                {!r.parent && isAuthenticated && (
                                  <button
                                    type="button"
                                    className="bd-review-card__reply-btn"
                                    onClick={() => setReplyingTo(replyingTo === r.id ? null : r.id)}
                                  >
                                    <i className="far fa-comment" /> {t('bookDetail.reply')}
                                  </button>
                                )}
                              </div>
                              {!r.parent && replyingTo === r.id && (
                                <div className="bd-review-reply-form">
                                  <textarea
                                    rows={3}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={t('bookDetail.replyPlaceholder')}
                                    maxLength={500}
                                  />
                                  <div className="bd-review-reply-form__actions">
                                    <button
                                      type="button"
                                      className="bd-btn bd-btn--outline"
                                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                    >
                                      {t('common.cancel')}
                                    </button>
                                    <button
                                      type="button"
                                      className="bd-btn bd-btn--primary"
                                      onClick={() => handleReplySubmit(r.id)}
                                      disabled={!replyText.trim() || replySubmitting}
                                    >
                                      {replySubmitting ? t('bookDetail.sending') : t('bookDetail.reply')}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {!r.parent && r.replies && r.replies.length > 0 && (
                                <>
                                  <button
                                    type="button"
                                    className="bd-review-replies-toggle"
                                    onClick={() => toggleReplies(r.id)}
                                    aria-expanded={isRepliesExpanded(r.id)}
                                  >
                                    <i className={`fas fa-chevron-${isRepliesExpanded(r.id) ? 'up' : 'down'}`} />
                                    {isRepliesExpanded(r.id)
                                      ? `${t('bookDetail.hideReplies')} (${r.replies.length})`
                                      : `${t('bookDetail.showReplies')} (${r.replies.length})`}
                                  </button>
                                  {isRepliesExpanded(r.id) && (
                                <div className="bd-review-replies">
                                  {r.replies.map((reply) => (
                                    <div key={reply.id} className="bd-review-card bd-review-card--reply">
                                      <div className="bd-review-card__top">
                                        <div className="bd-review-card__avatar">
                                          {reply.user_profile_image ? (
                                            <img
                                              src={reply.user_profile_image}
                                              alt=""
                                              loading="lazy"
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling?.classList.add('bd-review-card__avatar-fallback--show');
                                              }}
                                            />
                                          ) : null}
                                          <span className="bd-review-card__avatar-fallback" aria-hidden="true">
                                            {(reply.user_display || '?').charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="bd-review-card__main">
                                          <div className="bd-review-card__header">
                                            <span className="bd-review-card__author">{reply.user_display}</span>
                                            <span className="bd-review-card__date">
                                              {new Date(reply.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                              })}
                                            </span>
                                            {isMyReview(reply) && (
                                              <div className="bd-review-card__menu" ref={openMenuId === reply.id ? menuRef : null}>
                                                <button
                                                  type="button"
                                                  className="bd-review-card__menu-btn"
                                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === reply.id ? null : reply.id); }}
                                                  aria-label="Plus d'options"
                                                  aria-expanded={openMenuId === reply.id}
                                                >
                                                  <i className="fas fa-ellipsis-v" />
                                                </button>
                                                {openMenuId === reply.id && (
                                                  <div className="bd-review-card__dropdown">
                                                    <button type="button" onClick={() => handleReviewDelete(reply)} className="bd-review-card__dropdown-delete">
                                                      <i className="far fa-trash-alt" /> {t('common.delete')}
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {reply.comment && <p className="bd-review-card__comment">{reply.comment}</p>}
                                          <div className="bd-review-card__actions">
                                            <button
                                              type="button"
                                              className={`bd-review-card__like ${reply.user_has_liked ? 'bd-review-card__like--active' : ''}`}
                                              onClick={() => handleLikeToggle(reply)}
                                              aria-label={reply.user_has_liked ? 'Retirer le like' : 'Liker'}
                                            >
                                              <i className={reply.user_has_liked ? 'fas fa-heart' : 'far fa-heart'} />
                                              <span>{reply.likes_count ?? 0}</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {reviews.length > 0 && reviewsPagination.count > 10 && (
                    <div className="bd-reviews-pagination">
                      <span className="bd-reviews-pagination__info">
                        Page {reviewsPagination.page} — {reviews.length} sur {reviewsPagination.count} avis
                      </span>
                      <div className="bd-reviews-pagination__btns">
                        <button
                          type="button"
                          className="bd-btn bd-btn--outline bd-btn--sm"
                          onClick={() => fetchReviews(reviewsPagination.page - 1)}
                          disabled={!reviewsPagination.previous}
                          aria-label="Page précédente"
                        >
                          <i className="fas fa-chevron-left" /> {t('common.previous')}
                        </button>
                        <button
                          type="button"
                          className="bd-btn bd-btn--outline bd-btn--sm"
                          onClick={() => fetchReviews(reviewsPagination.page + 1)}
                          disabled={!reviewsPagination.next}
                          aria-label="Page suivante"
                        >
                          {t('common.next')} <i className="fas fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Livres similaires */}
          {relatedBooks.length > 0 && (
            <section className="bd-related">
              <h2 className="bd-related__title">
                <i className="fas fa-book-open" /> {t('bookDetail.relatedTitle')}
              </h2>
              <div className="bd-related__grid">
                {relatedBooks.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}

          {/* Lien auteur */}
          {book.author && (
            <div className="bd-same-author">
              <Link
                to={`/authors/${book.author.id}`}
                className="bd-btn bd-btn--outline bd-btn--lg"
              >
                <i className="fas fa-user-pen" /> {t('bookDetail.allBooksBy')} {book.author?.display_name || book.author?.full_name}
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="bd-footer-fade" />
    </div>
  );
};

export default BookDetail;
