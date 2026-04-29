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
import analyticsService from '../services/analyticsService';
import aiService from '../services/aiService';
import '../styles/BookDetail.css';

/* ─── Shared review/reply card ────────────────────────────── */
const ReviewCardContent = ({ review, locale, isOwn, isReply, openMenuId, menuRef, setOpenMenuId, onEdit, onDelete, onLike, onReply, replyingTo, renderStars, t }) => (
  <div className={`bd-review-card ${isReply ? 'bd-review-card--reply' : ''}`}>
    <div className="bd-review-card__top">
      <div className="bd-review-card__avatar">
        {review.user_profile_image ? (
          <img src={review.user_profile_image} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.classList.add('bd-review-card__avatar-fallback--show'); }} />
        ) : null}
        <span className="bd-review-card__avatar-fallback" aria-hidden="true">
          {(review.user_display || '?').charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="bd-review-card__main">
        <div className="bd-review-card__header">
          {review.user_slug ? <Link to={`/u/${review.user_slug}`} className="bd-review-card__author bd-review-card__author--link">{review.user_display}</Link> : <span className="bd-review-card__author">{review.user_display}</span>}
          {review.rating != null && <span className="bd-review-card__stars">{renderStars(review.rating)}</span>}
          <span className="bd-review-card__date">
            {new Date(review.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {isOwn && (
            <div className="bd-review-card__menu" ref={openMenuId === review.id ? menuRef : null}>
              <button type="button" className="bd-review-card__menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === review.id ? null : review.id); }} aria-label={t('common.moreOptions', 'Plus d\'options')} aria-expanded={openMenuId === review.id}>
                <i className="fas fa-ellipsis-v" />
              </button>
              {openMenuId === review.id && (
                <div className="bd-review-card__dropdown">
                  {!isReply && onEdit && <button type="button" onClick={() => onEdit(review)}><i className="far fa-edit" /> {t('common.edit')}</button>}
                  <button type="button" onClick={() => onDelete(review)} className="bd-review-card__dropdown-delete"><i className="far fa-trash-alt" /> {t('common.delete')}</button>
                </div>
              )}
            </div>
          )}
        </div>
        {review.comment && <p className="bd-review-card__comment">{review.comment}</p>}
        <div className="bd-review-card__actions">
          <button type="button" className={`bd-review-card__like ${review.user_has_liked ? 'bd-review-card__like--active' : ''}`} onClick={() => onLike(review)} aria-label={review.user_has_liked ? t('bookDetail.unlikeReview', 'Retirer le like') : t('bookDetail.likeReview', 'Liker')}>
            <i className={review.user_has_liked ? 'fas fa-heart' : 'far fa-heart'} />
            <span>{review.likes_count ?? 0}</span>
          </button>
          {!isReply && onReply && (
            <button type="button" className="bd-review-card__reply-btn" onClick={() => onReply(review.id)}>
              <i className="far fa-comment" /> {t('bookDetail.reply')}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'fr-FR';

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
  const [selectedListing, setSelectedListing] = useState(null);
  const [reviewsPagination, setReviewsPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  });
  const menuRef = useRef(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiReviewSynthesis, setAiReviewSynthesis] = useState(null);
  const [aiLoading, setAiLoading] = useState(null); // 'summary' | 'reviews' | null
  const [spoilerWarning, setSpoilerWarning] = useState(null); // {has_spoiler, spoiler_level, details}

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
        analyticsService.trackView(bookData.id || id, 'direct');
        setRelatedBooks(Array.isArray(relatedData) ? relatedData : []);
      } catch (err) {
        setError(t('bookDetail.notFound'));
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

  const doSubmitReview = async () => {
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const data = await bookService.submitReview(id, {
        rating: parseInt(reviewForm.rating, 10),
        comment: reviewForm.comment.trim(),
      });
      setMyReview(data);
      setSpoilerWarning(null);
      await fetchReviews(1);
      await fetchMyReview();
    } catch (err) {
      setReviewError(err.response?.data?.detail || err.response?.data?.rating?.[0] || t('common.error'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!id || !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/books/${id}` } } });
      return;
    }
    const comment = reviewForm.comment.trim();
    // Détection spoiler IA (seulement si commentaire assez long)
    if (comment.length >= 30 && book?.title) {
      setReviewSubmitting(true);
      try {
        const result = await aiService.detectSpoiler(comment, book.title);
        if (result.has_spoiler) {
          setSpoilerWarning(result);
          setReviewSubmitting(false);
          return; // On attend la décision de l'utilisateur
        }
      } catch {
        // Si l'IA échoue, on soumet quand même
      }
      setReviewSubmitting(false);
    }
    doSubmitReview();
  };

  const refreshBookRating = async () => {
    try {
      const bookData = await bookService.getBookById(id);
      setBook(prev => ({ ...prev, rating: bookData.rating, rating_count: bookData.rating_count }));
    } catch { /* best-effort */ }
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
      refreshBookRating();
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
        refreshBookRating();
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
    } catch {
      // Silenced: like toggle is best-effort, UI refreshes on next fetch
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
    return Math.round(parseFloat(price)).toLocaleString(locale) + ' ' + t('common.currency', 'FCFA');
  };

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !book) {
    return (
      <div className="bd-page">
        <div className="bd-error-page">
          <h1 className="bd-title" style={{ fontSize: 32 }}>{t('bookDetail.notFound')}</h1>
          <p style={{ color: 'var(--fl-muted)', marginTop: 8 }}>{error || t('bookDetail.notFoundMessage')}</p>
          <Link to="/catalog" className="bd-btn bd-btn--primary" style={{ marginTop: 20 }}>
            <i className="fas fa-arrow-left" /> {t('bookDetail.returnCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  const authorName = book.author?.display_name || book.author?.full_name || t('bookDetail.unknownAuthor');
  const authorId = book.author?.id;
  const authorUserSlug = book.author?.user_slug;
  const authorLink = authorUserSlug ? `/u/${authorUserSlug}` : authorId ? `/authors/${authorId}` : null;
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

      {/* Breadcrumb bar */}
      <nav className="bd-breadcrumb-bar" aria-label="Fil d'Ariane">
        <Link to="/catalog" className="bd-breadcrumb__link">{t('bookDetail.breadcrumbCatalog')}</Link>
        <span className="bd-breadcrumb__sep"> › </span>
        <span className="bd-breadcrumb__current">{book.title}</span>
      </nav>

      {/* ═══ 3-COLUMN GRID ═══ */}
      <div className="bd-grid">
        {/* ── LEFT COLUMN: Cover + Fiche technique ── */}
        <div className="bd-col-left">
          <div className={`bd-covers ${book.back_cover_image ? 'bd-covers--duo' : ''}`}>
            <div className="bd-cover bd-cover--front">
              <div className="bd-cover__frame">
                <button
                  type="button"
                  className={`bd-wishlist ${isInWishlist(book.id) ? 'bd-wishlist--active' : ''}`}
                  onClick={() => toggleWishlist(book)}
                  aria-label={isInWishlist(book.id) ? t('bookDetail.wishlistRemove', 'Retirer de la liste d\'envie') : t('bookDetail.wishlistAdd')}
                >
                  <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} />
                  <span>{isInWishlist(book.id) ? t('bookDetail.wishlistInList') : t('bookDetail.wishlistAdd')}</span>
                </button>
                <img
                  src={book.cover_image || '/images/default-book-cover.svg'}
                  alt={book.title}
                  loading="eager"
                />
                {book.has_discount && (
                  <span className="bd-image-badge bd-image-badge--promo">−{book.discount_percentage}%</span>
                )}
                {!book.available && (
                  <span className="bd-image-badge bd-image-badge--unavailable">{t('bookDetail.unavailable')}</span>
                )}
                {book.format === 'EBOOK' && (
                  <span className="bd-image-badge bd-image-badge--format"><i className="fas fa-file-pdf" /> Ebook</span>
                )}
              </div>
              <div className="bd-cover__caption">{t('bookDetail.frontCover', 'Couverture')}</div>
            </div>

            {book.back_cover_image && (
              <div className="bd-cover bd-cover--back">
                <div className="bd-cover__frame">
                  <img
                    src={book.back_cover_image}
                    alt={`${t('bookDetail.backCover', '4e de couverture')} — ${book.title}`}
                    loading="lazy"
                    onError={(e) => { e.target.closest('.bd-cover--back').style.display = 'none'; }}
                  />
                </div>
                <div className="bd-cover__caption">{t('bookDetail.backCover', '4e de couverture')}</div>
              </div>
            )}
          </div>

          {/* Action buttons under cover */}
          <div className="bd-cover-actions">
            {book.pdf_file && isAuthenticated && (
              <Link to={`/books/${id}/read`} className="bd-btn bd-btn--outline bd-btn--sm">
                <i className="fas fa-eye" /> {t('bookDetail.readBook', 'Extrait')}
              </Link>
            )}
            {book.pdf_file && !isAuthenticated && (
              <Link to="/login" className="bd-btn bd-btn--outline bd-btn--sm">
                <i className="fas fa-lock" /> {t('bookDetail.loginToRead', 'Extrait')}
              </Link>
            )}
            <button
              type="button"
              className={`bd-btn bd-btn--outline bd-btn--sm ${isInWishlist(book.id) ? 'bd-wishlist--active' : ''}`}
              onClick={() => toggleWishlist(book)}
            >
              <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} /> {isInWishlist(book.id) ? t('bookDetail.wishlistInList') : t('bookDetail.wishlistAdd', 'Enregistrer')}
            </button>
          </div>

          {/* Fiche technique */}
          <div className="bd-fiche">
            <div className="bd-fiche__eyebrow">— {t('bookDetail.characteristics', 'Fiche technique')}</div>
            <div className="bd-fiche__grid">
              <div><div className="bd-fiche__label">{t('bookDetail.pages', 'Pages')}</div><div className="bd-fiche__value">{book.pages || '—'}</div></div>
              <div><div className="bd-fiche__label">Format</div><div className="bd-fiche__value">{book.format === 'EBOOK' ? t('bookDetail.ebookFormat') : t('bookDetail.paperFormat')}</div></div>
              <div><div className="bd-fiche__label">{t('bookDetail.publisher', 'Éditeur')}</div><div className="bd-fiche__value">{book.publisher_name || '—'}</div></div>
              <div><div className="bd-fiche__label">ISBN</div><div className="bd-fiche__value bd-fiche__value--mono">{book.isbn || book.reference || '—'}</div></div>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: Title + Description + Tabs ── */}
        <div className="bd-col-center">
          {/* Chips */}
          <div className="bd-chips">
            <span className="bd-chip bd-chip--accent">{categoryName}</span>
            <span className="bd-chip bd-chip--outline">{book.format === 'EBOOK' ? 'Ebook' : t('bookDetail.paperFormat', 'Papier')}</span>
            {book.is_bestseller && <span className="bd-chip bd-chip--accent"><i className="fas fa-fire" /> {t('common.bestseller', 'Best-seller')}</span>}
          </div>

          {/* Title */}
          <h1 className="bd-title">{book.title}</h1>

          {/* Author line */}
          <div className="bd-author-line">
            {t('bookDetail.by', 'par')} {authorLink ? <Link to={authorLink} className="bd-author-link">{authorName}</Link> : authorName}
            {book.publisher_name && <>, {book.publisher_name}</>}
          </div>

          {/* Rating bar */}
          {book.rating != null && (
            <div className="bd-rating-bar">
              <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                <span className="bd-rating-bar__score">{book.rating}</span>
                <span className="bd-rating-bar__stars">{renderStars(book.rating)}</span>
                <span className="bd-rating-bar__count">({book.rating_count || 0} {t('bookDetail.tabReviews', 'avis')})</span>
              </div>
            </div>
          )}

          {/* Share buttons */}
          <ShareButtons book={book} />

          {/* Tabs */}
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
                  {isAuthenticated && !aiSummary && (
                    <button
                      className="bd-ai-btn"
                      disabled={aiLoading === 'summary'}
                      onClick={async () => {
                        setAiLoading('summary');
                        try {
                          const { summary } = await aiService.summarizeBook(book.id);
                          setAiSummary(summary);
                        } catch { toast.error('Impossible de générer le résumé'); }
                        finally { setAiLoading(null); }
                      }}
                    >
                      {aiLoading === 'summary'
                        ? <><i className="fas fa-spinner fa-spin" /> Analyse en cours...</>
                        : <><i className="fas fa-wand-magic-sparkles" /> Résumé IA</>}
                    </button>
                  )}
                  {aiSummary && (
                    <div className="bd-ai-result">
                      <div className="bd-ai-result__label"><i className="fas fa-wand-magic-sparkles" /> Résumé généré par l'IA</div>
                      <p>{aiSummary}</p>
                    </div>
                  )}
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
                          ? new Date(book.created_at).toLocaleDateString(locale, {
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
                          <span className="bd-author__registered"><i className="fas fa-check-circle" /> {t('bookDetail.registeredAuthor', 'Auteur inscrit sur Frollot')}</span>
                        )}
                        <Link
                          to={authorLink || `/authors/${book.author.id}`}
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

                  {isAuthenticated && reviews.length >= 3 && !aiReviewSynthesis && (
                    <button
                      className="bd-ai-btn bd-ai-btn--inline"
                      disabled={aiLoading === 'reviews'}
                      onClick={async () => {
                        setAiLoading('reviews');
                        try {
                          const data = await aiService.synthesizeReviews(book.id);
                          setAiReviewSynthesis(data);
                        } catch { toast.error('Impossible de synthétiser les avis'); }
                        finally { setAiLoading(null); }
                      }}
                    >
                      {aiLoading === 'reviews'
                        ? <><i className="fas fa-spinner fa-spin" /> Synthèse en cours...</>
                        : <><i className="fas fa-wand-magic-sparkles" /> Synthèse IA des avis</>}
                    </button>
                  )}
                  {aiReviewSynthesis && (
                    <div className="bd-ai-result bd-ai-result--synthesis">
                      <div className="bd-ai-result__label"><i className="fas fa-wand-magic-sparkles" /> Ce qu'en pensent les lecteurs</div>
                      <p>{aiReviewSynthesis.consensus}</p>
                      {aiReviewSynthesis.points_forts?.length > 0 && (
                        <div className="bd-ai-result__list">
                          <strong>Points forts :</strong>
                          <ul>{aiReviewSynthesis.points_forts.map((p, i) => <li key={i}>{p}</li>)}</ul>
                        </div>
                      )}
                      {aiReviewSynthesis.points_faibles?.length > 0 && (
                        <div className="bd-ai-result__list">
                          <strong>Points faibles :</strong>
                          <ul>{aiReviewSynthesis.points_faibles.map((p, i) => <li key={i}>{p}</li>)}</ul>
                        </div>
                      )}
                      <div className="bd-ai-result__footer">{aiReviewSynthesis.public_ideal}</div>
                    </div>
                  )}

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
                      {spoilerWarning && (
                        <div className="bd-spoiler-warning">
                          <div className="bd-spoiler-warning__icon"><i className="fas fa-exclamation-triangle" /></div>
                          <div className="bd-spoiler-warning__content">
                            <strong>Spoiler {spoilerWarning.spoiler_level === 'majeur' ? 'majeur' : 'léger'} détecté</strong>
                            {spoilerWarning.details && <p>{spoilerWarning.details}</p>}
                            <p className="bd-spoiler-warning__hint">Votre avis contient des éléments qui pourraient gâcher la lecture. Souhaitez-vous le publier quand même ?</p>
                            <div className="bd-spoiler-warning__actions">
                              <button type="button" className="bd-btn bd-btn--outline" onClick={() => setSpoilerWarning(null)}>
                                <i className="fas fa-pen" /> Modifier
                              </button>
                              <button type="button" className="bd-btn bd-btn--primary" disabled={reviewSubmitting} onClick={() => { setSpoilerWarning(null); doSubmitReview(); }}>
                                <i className="fas fa-paper-plane" /> Publier quand même
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="bd-review-form__actions">
                        <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>
                          {reviewSubmitting ? t('bookDetail.publishing') : t('bookDetail.publishReview')}
                        </button>
                      </div>
                    </form>
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
                        <React.Fragment key={r.id}>
                          {editingReviewId === r.id ? (
                            <div className="bd-review-card">
                              <form className="bd-review-edit-form" onSubmit={handleReviewEditSubmit}>
                                <div className="bd-review-edit-form__stars">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} type="button" className={`bd-review-star-btn ${editForm.rating >= star ? 'active' : ''}`} onClick={() => setEditForm((f) => ({ ...f, rating: star }))}>
                                      <i className={editForm.rating >= star ? 'fas fa-star' : 'far fa-star'} />
                                    </button>
                                  ))}
                                </div>
                                <textarea value={editForm.comment} onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))} placeholder={t('bookDetail.opinionPlaceholder')} rows={3} maxLength={1000} />
                                <div className="bd-review-edit-form__actions">
                                  <button type="button" className="bd-btn bd-btn--ghost" onClick={() => { setEditingReviewId(null); setReviewError(''); }}>{t('common.cancel')}</button>
                                  <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>{reviewSubmitting ? t('bookDetail.publishing') : t('common.save')}</button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            <ReviewCardContent
                              review={r} locale={locale} isReply={!!r.parent} isOwn={isMyReview(r)}
                              openMenuId={openMenuId} menuRef={menuRef} setOpenMenuId={setOpenMenuId}
                              onEdit={handleReviewEdit} onDelete={handleReviewDelete} onLike={handleLikeToggle}
                              onReply={isAuthenticated ? (id) => setReplyingTo(replyingTo === id ? null : id) : null}
                              replyingTo={replyingTo} renderStars={renderStars} t={t}
                            />
                          )}
                          {!r.parent && r.replies && r.replies.length > 0 && (
                            <div className="bd-review-replies">
                              {r.replies.map((reply) => (
                                <ReviewCardContent
                                  key={reply.id} review={reply} locale={locale} isReply isOwn={isMyReview(reply)}
                                  openMenuId={openMenuId} menuRef={menuRef} setOpenMenuId={setOpenMenuId}
                                  onDelete={handleReviewDelete} onLike={handleLikeToggle}
                                  renderStars={renderStars} t={t}
                                />
                              ))}
                            </div>
                          )}
                          {!r.parent && replyingTo === r.id && (
                            <div className="bd-review-reply-form">
                              <textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t('bookDetail.replyPlaceholder')} maxLength={500} />
                              <div className="bd-review-reply-form__actions">
                                <button type="button" className="bd-btn bd-btn--outline" onClick={() => { setReplyingTo(null); setReplyText(''); }}>{t('common.cancel')}</button>
                                <button type="button" className="bd-btn bd-btn--primary" onClick={() => handleReplySubmit(r.id)} disabled={!replyText.trim() || replySubmitting}>{replySubmitting ? t('bookDetail.sending') : t('bookDetail.reply')}</button>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
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

        </div>{/* end bd-col-center */}

        {/* ── RIGHT COLUMN: Purchase panel + Vendors + Libraries + Circles ── */}
        <div className="bd-col-right">
          {/* Purchase panel — masqué pour les livres bibliothèque-only */}
          {!book.price && (!book.listings || book.listings.length === 0) && book.library_availability && book.library_availability.length > 0 ? (
            <div className="bd-purchase bd-purchase--library">
              <div className="bd-purchase__header">
                <span className="bd-purchase__eyebrow">— <i className="fas fa-landmark" /> {t('bookDetail.libraryOnly', 'Disponible en bibliothèque')}</span>
              </div>
              <div className="bd-library-hero">
                <i className="fas fa-book-reader bd-library-hero__icon" />
                <p className="bd-library-hero__text">{t('bookDetail.libraryOnlyDesc', 'Ce livre est disponible gratuitement en prêt dans les bibliothèques ci-dessous.')}</p>
              </div>
              <div className="bd-library-hero__actions">
                {book.library_availability.map((lib) => (
                  <Link key={lib.id} to={`/library/${lib.library_slug}`} className="bd-btn bd-btn--library bd-btn--full">
                    <i className="fas fa-landmark" /> {lib.library_name}
                    {lib.in_stock ? (
                      <span className="bd-btn__sub">{lib.available_copies}/{lib.total_copies} {t('bookDetail.availableCopies', 'disponible(s)')}</span>
                    ) : (
                      <span className="bd-btn__sub">{t('bookDetail.allBorrowed', 'Tous empruntés')}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="bd-purchase">
              <div className="bd-purchase__header">
                <span className="bd-purchase__eyebrow">— {book.format === 'EBOOK' ? 'Ebook' : t('bookDetail.paperFormat', 'Papier')} · {selectedListing ? selectedListing.condition_display : t('bookDetail.conditionNew', 'neuf')}</span>
                {book.available && (
                  <span className="bd-purchase__stock">● {t('bookDetail.inStock')}</span>
                )}
              </div>
              <div>
                {selectedListing ? (
                  <>
                    {selectedListing.has_discount && selectedListing.original_price && (
                      <span className="bd-price-old">{formatPrice(selectedListing.original_price)}</span>
                    )}
                    <span className="bd-price">{formatPrice(selectedListing.price)}</span>
                    <span className="bd-price-vendor">{t('bookDetail.atVendor', 'chez')} {selectedListing.vendor_name}</span>
                  </>
                ) : (
                  <>
                    {book.has_discount && book.original_price && (
                      <span className="bd-price-old">{formatPrice(book.original_price)}</span>
                    )}
                    <span className="bd-price">{formatPrice(book.price)}</span>
                    {book.best_listing_price && parseFloat(book.best_listing_price) < parseFloat(book.price) && (
                      <span className="bd-price-from">{t('bookDetail.orFromBookstore', { price: formatPrice(book.best_listing_price), defaultValue: 'ou {{price}} en librairie' })}</span>
                    )}
                  </>
                )}
                {book.format === 'EBOOK' && (
                  <span className="bd-price-vat">{t('bookDetail.vatIncluded')}</span>
                )}
              </div>

              {book.available && (
                <div className="bd-purchase__actions">
                  <div className="bd-quantity">
                    <button type="button" className="bd-quantity__btn" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} aria-label={t('bookDetail.decreaseQty')}>−</button>
                    <span className="bd-quantity__val">{quantity}</span>
                    <button type="button" className="bd-quantity__btn" onClick={() => handleQuantityChange(1)} disabled={quantity >= 10} aria-label={t('bookDetail.increaseQty')}>+</button>
                  </div>
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
                </div>
              )}

              {book.available && (
                <div className="bd-purchase__buy-wrap">
                  <button type="button" onClick={handleBuyNow} className="bd-btn bd-btn--buy bd-btn--full">
                    <i className="fas fa-bolt" /> {t('bookDetail.buyNow')}
                  </button>
                </div>
              )}

              {/* Delivery info */}
              <div className="bd-purchase__delivery">
                {book.format === 'EBOOK' ? (
                  <div className="bd-purchase__delivery-line"><i className="fas fa-download" /> {t('bookDetail.instantDownload', 'Téléchargement immédiat')}</div>
                ) : (
                  <>
                    <div className="bd-purchase__delivery-line"><i className="fas fa-truck" /> {t('bookDetail.deliveryEstimate', 'Délai estimé au panier selon votre ville')}</div>
                    <div className="bd-purchase__delivery-line"><i className="fas fa-map-marker-alt" /> {t('bookDetail.deliveryCoverage', 'Livraison Gabon et Afrique francophone')}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Offres vendeurs (marketplace) */}
          {book.listings && book.listings.length > 0 && (
            <div className="bd-vendors">
              <h3 className="bd-vendors__title">
                <i className="fas fa-store" /> {t('bookDetail.vendorCount', { count: book.listings.length, defaultValue: '{{count}} vendeur(s) propose(nt) ce livre' })}
              </h3>
              <div className="bd-vendors__list">
                {book.listings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className={`bd-vendor-card ${selectedListing?.id === listing.id ? 'bd-vendor-card--selected' : ''}`}
                    onClick={() => setSelectedListing(selectedListing?.id === listing.id ? null : listing)}
                  >
                    <div className="bd-vendor-card__header">
                      <span className="bd-vendor-card__name">
                        {listing.vendor_name}
                        {listing.vendor_is_verified && <i className="fas fa-check-circle bd-vendor-card__verified" title="Vendeur vérifié" />}
                      </span>
                      {listing.vendor_city && (
                        <span className="bd-vendor-card__city"><i className="fas fa-map-marker-alt" /> {listing.vendor_city}</span>
                      )}
                    </div>
                    <div className="bd-vendor-card__body">
                      <span className="bd-vendor-card__price">{formatPrice(listing.price)}</span>
                      <span className={`bd-vendor-card__condition bd-vendor-card__condition--${listing.condition.toLowerCase()}`}>{listing.condition_display}</span>
                    </div>
                    <div className="bd-vendor-card__footer">
                      {listing.in_stock ? (
                        <span className="bd-vendor-card__stock bd-vendor-card__stock--ok"><i className="fas fa-check" /> {t('bookDetail.inStock')}</span>
                      ) : (
                        <span className="bd-vendor-card__stock bd-vendor-card__stock--no"><i className="fas fa-times" /> {t('bookDetail.outOfStock', 'Rupture')}</span>
                      )}
                      {listing.has_discount && <span className="bd-vendor-card__discount">-{listing.discount_percentage}%</span>}
                    </div>
                    {selectedListing?.id === listing.id && (
                      <span className="bd-vendor-card__check"><i className="fas fa-check-circle" /></span>
                    )}
                  </button>
                ))}
              </div>
              {selectedListing && (
                <p className="bd-vendors__selected">
                  <i className="fas fa-info-circle" /> {t('bookDetail.purchaseAt', { vendor: selectedListing.vendor_name, price: formatPrice(selectedListing.price), defaultValue: 'Achat chez {{vendor}} pour {{price}}' })}
                </p>
              )}
            </div>
          )}

          {/* Disponibilité en bibliothèque — uniquement si le livre est aussi en vente (sinon déjà dans le panel principal) */}
          {book.price && book.library_availability && book.library_availability.length > 0 && (
            <div className="bd-libraries">
              <h3 className="bd-libraries__title">
                <i className="fas fa-landmark" /> {book.library_availability.length} {t('bookDetail.libraryCount', { count: book.library_availability.length, defaultValue: 'bibliothèque(s)' })}
              </h3>
              <div className="bd-libraries__list">
                {book.library_availability.map((lib) => (
                  <Link key={lib.id} to={`/library/${lib.library_slug}`} className="bd-library-card">
                    <div className="bd-library-card__header">
                      <span className="bd-library-card__name">
                        {lib.library_name}
                        {lib.library_is_verified && <i className="fas fa-check-circle bd-library-card__verified" title={t('bookDetail.verified', 'Vérifiée')} />}
                      </span>
                      {lib.library_city && <span className="bd-library-card__city"><i className="fas fa-map-marker-alt" /> {lib.library_city}</span>}
                    </div>
                    <div className="bd-library-card__body">
                      <span className={`bd-library-card__stock ${lib.in_stock ? 'bd-library-card__stock--ok' : 'bd-library-card__stock--no'}`}>
                        {lib.in_stock ? (
                          <><i className="fas fa-check" /> {lib.available_copies}/{lib.total_copies} {t('bookDetail.availableCopies', 'disponible(s)')}</>
                        ) : (
                          <><i className="fas fa-clock" /> {t('bookDetail.allBorrowed', 'Tous empruntés')}</>
                        )}
                      </span>
                      <span className="bd-library-card__loan-days"><i className="fas fa-calendar-alt" /> {lib.max_loan_days} {t('bookDetail.loanDays', 'j de prêt')}</span>
                      {lib.allows_digital_loan && <span className="bd-library-card__digital"><i className="fas fa-tablet-alt" /> {t('bookDetail.digitalLoan', 'Prêt numérique')}</span>}
                      {lib.consultation_only && <span className="bd-library-card__consult"><i className="fas fa-eye" /> Consultation sur place</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cercles en cours */}
          <div className="bd-circles">
            <div className="bd-circles__eyebrow">— {t('bookDetail.activeCircles', 'Cercles en cours')}</div>
            <div className="bd-circles__empty">{t('bookDetail.noCirclesYet', 'Aucun cercle n\'est encore actif pour ce livre.')}</div>
          </div>
        </div>{/* end bd-col-right */}
      </div>{/* end bd-grid */}

      {/* Livres similaires */}
      {relatedBooks.length > 0 && (
        <section className="bd-related">
          <div className="bd-related__title">— {t('bookDetail.relatedTitle', 'Dans la même voix')}</div>
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
          <Link to={authorLink || `/authors/${book.author.id}`} className="bd-btn bd-btn--outline bd-btn--lg">
            <i className="fas fa-user-pen" /> {t('bookDetail.allBooksBy')} {book.author?.display_name || book.author?.full_name}
          </Link>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
