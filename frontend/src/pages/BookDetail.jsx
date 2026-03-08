import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BookCard from '../components/BookCard';
import bookService from '../services/bookService';
import '../styles/BookDetail.css';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();

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
        setError('Livre non trouvé ou erreur de chargement');
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

  const handleAddToCart = () => {
    if (book?.available) addToCart(book, quantity);
  };

  const handleBuyNow = () => {
    if (book?.available) {
      addToCart(book, quantity);
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
      setReviewError(err.response?.data?.detail || err.response?.data?.rating?.[0] || 'Erreur lors de l\'envoi.');
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
      setReviewError(err.response?.data?.detail || err.response?.data?.rating?.[0] || 'Erreur lors de la modification.');
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
      setReviewError('Erreur lors de la suppression.');
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
      setReviewError(e.response?.data?.comment?.[0] || 'Erreur lors de l\'envoi de la réponse.');
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
            <h1 className="bd-hero__title">Livre non trouvé</h1>
            <p className="bd-hero__sub">{error || 'Ce livre n\'existe pas ou a été retiré.'}</p>
            <Link to="/catalog" className="bd-btn bd-btn--primary">
              <i className="fas fa-arrow-left" /> Retour au catalogue
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const authorName = book.author?.full_name || 'Auteur inconnu';
  const categoryName = book.category?.name || 'Non catégorisé';

  return (
    <div className="bd-page">
      {/* Hero compact */}
      <section className="bd-hero">
        <div className="bd-hero__orb bd-hero__orb--1" />
        <div className="bd-hero__orb bd-hero__orb--2" />
        <div className="bd-hero__grid-bg" />
        <div className="bd-hero__inner">
          <nav className="bd-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/catalog" className="bd-breadcrumb__link">Catalogue</Link>
            <span className="bd-breadcrumb__sep">/</span>
            <span className="bd-breadcrumb__current">{book.title}</span>
          </nav>
          <div className="bd-hero__line" />
          <h1 className="bd-hero__title">{book.title}</h1>
          <p className="bd-hero__meta">
            {authorName} · {categoryName}
            {book.is_bestseller && (
              <span className="bd-hero__bestseller">Best-seller</span>
            )}
          </p>
        </div>
      </section>
      <div className="bd-hero-fade" />

      {/* Contenu principal */}
      <div className="bd-content">
        <div className="bd-wrap">
          <div className="bd-main">
            {/* Image */}
            <div className="bd-image-section">
              <div className="bd-image-wrapper">
                <button
                  type="button"
                  className={`bd-wishlist ${isInWishlist(book.id) ? 'bd-wishlist--active' : ''}`}
                  onClick={() => toggleWishlist(book)}
                  aria-label={isInWishlist(book.id) ? 'Retirer de la liste d\'envie' : 'Ajouter à la liste d\'envie'}
                >
                  <i className={`${isInWishlist(book.id) ? 'fas' : 'far'} fa-heart`} />
                  <span>{isInWishlist(book.id) ? 'Dans la liste' : 'Liste d\'envie'}</span>
                </button>
                <img
                  src={book.cover_image || '/images/default-book-cover.jpg'}
                  alt={book.title}
                  loading="lazy"
                />
                {book.has_discount && (
                  <span className="bd-image-badge bd-image-badge--promo">
                    −{book.discount_percentage}%
                  </span>
                )}
                {!book.available && (
                  <span className="bd-image-badge bd-image-badge--unavailable">Indisponible</span>
                )}
                {book.format === 'EBOOK' && (
                  <span className="bd-image-badge bd-image-badge--format">
                    <i className="fas fa-file-pdf" /> Ebook
                  </span>
                )}
              </div>
            </div>

            {/* Infos + actions */}
            <div className="bd-info-section">
              <div className="bd-info-block">
                <div className="bd-meta-row">
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">Auteur</span>
                    <span className="bd-meta-value">{authorName}</span>
                  </span>
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">Catégorie</span>
                    <span className="bd-meta-value">{categoryName}</span>
                  </span>
                  <span className="bd-meta-item">
                    <span className="bd-meta-label">Format</span>
                    <span className="bd-meta-value">
                      {book.format === 'EBOOK' ? 'Ebook (PDF)' : 'Livre papier'}
                    </span>
                  </span>
                  {book.reference && (
                    <span className="bd-meta-item">
                      <span className="bd-meta-label">Référence</span>
                      <span className="bd-meta-value bd-meta-value--code">{book.reference}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="bd-price-block">
                <div className="bd-price-row">
                  {book.has_discount && book.original_price && (
                    <span className="bd-price-old">{formatPrice(book.original_price)}</span>
                  )}
                  <span className="bd-price">{formatPrice(book.price)}</span>
                  {book.format === 'EBOOK' && (
                    <span className="bd-price-vat">TVA incluse</span>
                  )}
                </div>
                <div className="bd-availability">
                  {book.available ? (
                    <span className="bd-availability--ok">
                      <i className="fas fa-check-circle" /> En stock
                    </span>
                  ) : (
                    <span className="bd-availability--no">
                      <i className="fas fa-times-circle" /> Épuisé
                    </span>
                  )}
                </div>
              </div>

              {book.available && (
                <div className="bd-actions">
                  <div className="bd-quantity">
                    <button
                      type="button"
                      className="bd-quantity__btn"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantité"
                    >
                      −
                    </button>
                    <span className="bd-quantity__val">{quantity}</span>
                    <button
                      type="button"
                      className="bd-quantity__btn"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= 10}
                      aria-label="Augmenter la quantité"
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
                        <><i className="fas fa-check" /> {getItemQuantity(book.id)} dans le panier</>
                      ) : (
                        <><i className="fas fa-shopping-cart" /> Ajouter au panier</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="bd-btn bd-btn--buy"
                    >
                      <i className="fas fa-bolt" /> Acheter maintenant
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Onglets */}
          <div className="bd-tabs">
            <div className="bd-tabs__header">
              {[
                { id: 'description', label: 'Description', icon: 'fas fa-align-left' },
                { id: 'details', label: 'Détails', icon: 'fas fa-info-circle' },
                { id: 'author', label: 'Auteur', icon: 'fas fa-user-pen' },
                { id: 'reviews', label: `Avis (${book?.rating_count || 0})`, icon: 'fas fa-star' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`bd-tabs__btn ${activeTab === tab.id ? 'bd-tabs__btn--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={tab.icon} /> {tab.label}
                </button>
              ))}
            </div>
            <div className="bd-tabs__content">
              {activeTab === 'description' && (
                <div className="bd-tab-panel">
                  <h3 className="bd-tab-panel__title">À propos de ce livre</h3>
                  <p className="bd-description">
                    {book.description || 'Aucune description disponible.'}
                  </p>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="bd-tab-panel">
                  <h3 className="bd-tab-panel__title">Caractéristiques</h3>
                  <div className="bd-details-grid">
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">Format</span>
                      <span className="bd-detail-value">
                        {book.format === 'EBOOK' ? 'Ebook numérique (PDF)' : 'Livre papier'}
                      </span>
                    </div>
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">Référence</span>
                      <span className="bd-detail-value">{book.reference || '—'}</span>
                    </div>
                    <div className="bd-detail-item">
                      <span className="bd-detail-label">Date de publication</span>
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
                <div className="bd-tab-panel bd-author-panel">
                  {book.author ? (
                    <div className="bd-author">
                      <div className="bd-author__photo">
                        <img
                          src={book.author.photo || '/images/default-author.jpg'}
                          alt={book.author.full_name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.target.src = '/images/default-book-cover.jpg';
                          }}
                        />
                      </div>
                      <div className="bd-author__info">
                        <h3>{book.author.full_name}</h3>
                        <p>
                          {book.author.biography
                            ? book.author.biography.length > 300
                              ? book.author.biography.substring(0, 300) + '…'
                              : book.author.biography
                            : 'Aucune biographie disponible.'}
                        </p>
                        <Link
                          to={`/catalog?search=${encodeURIComponent(book.author?.full_name || '')}`}
                          className="bd-btn bd-btn--outline"
                        >
                          <i className="fas fa-book" /> Voir les livres de cet auteur
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p>Aucune information sur l&apos;auteur disponible.</p>
                  )}
                </div>
              )}
              {activeTab === 'reviews' && (
                <div className="bd-tab-panel bd-tab-panel--reviews">
                  <h3 className="bd-tab-panel__title">Avis des lecteurs</h3>

                  {isAuthenticated && !myReview && (
                    <form className="bd-review-form" onSubmit={handleReviewSubmit}>
                      <div className="bd-review-form__rating">
                        <label>Votre note :</label>
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
                        <label htmlFor="review-comment">Votre avis (optionnel) :</label>
                        <textarea
                          id="review-comment"
                          rows={4}
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                          placeholder="Partagez votre expérience de lecture..."
                          maxLength={1000}
                        />
                      </div>
                      {reviewError && <p className="bd-review-form__error">{reviewError}</p>}
                      <div className="bd-review-form__actions">
                        <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>
                          {reviewSubmitting ? 'Envoi...' : 'Publier mon avis'}
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
                        Connectez-vous pour laisser un avis
                      </Link>
                    </p>
                  )}

                  <div className="bd-reviews-list">
                    {reviews.length === 0 ? (
                      <div className="bd-no-reviews">
                        <p><i className="far fa-comment-dots" /> Soyez le premier à donner votre avis sur ce livre.</p>
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
                                          <i className="far fa-edit" /> Modifier
                                        </button>
                                        <button type="button" onClick={() => handleReviewDelete(r)} className="bd-review-card__dropdown-delete">
                                          <i className="far fa-trash-alt" /> Supprimer
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
                                    placeholder="Modifiez votre avis..."
                                    rows={3}
                                    maxLength={1000}
                                  />
                                  <div className="bd-review-edit-form__actions">
                                    <button type="button" className="bd-btn bd-btn--ghost" onClick={() => { setEditingReviewId(null); setReviewError(''); }}>
                                      Annuler
                                    </button>
                                    <button type="submit" className="bd-btn bd-btn--primary" disabled={reviewSubmitting}>
                                      {reviewSubmitting ? 'Enregistrement...' : 'Enregistrer'}
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
                                    <i className="far fa-comment" /> Répondre
                                  </button>
                                )}
                              </div>
                              {!r.parent && replyingTo === r.id && (
                                <div className="bd-review-reply-form">
                                  <textarea
                                    rows={3}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Écrivez votre réponse..."
                                    maxLength={500}
                                  />
                                  <div className="bd-review-reply-form__actions">
                                    <button
                                      type="button"
                                      className="bd-btn bd-btn--outline"
                                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      type="button"
                                      className="bd-btn bd-btn--primary"
                                      onClick={() => handleReplySubmit(r.id)}
                                      disabled={!replyText.trim() || replySubmitting}
                                    >
                                      {replySubmitting ? 'Envoi...' : 'Répondre'}
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
                                      ? `Masquer les ${r.replies.length} réponse${r.replies.length > 1 ? 's' : ''}`
                                      : `Voir les ${r.replies.length} réponse${r.replies.length > 1 ? 's' : ''}`}
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
                                                      <i className="far fa-trash-alt" /> Supprimer
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
                          <i className="fas fa-chevron-left" /> Précédent
                        </button>
                        <button
                          type="button"
                          className="bd-btn bd-btn--outline bd-btn--sm"
                          onClick={() => fetchReviews(reviewsPagination.page + 1)}
                          disabled={!reviewsPagination.next}
                          aria-label="Page suivante"
                        >
                          Suivant <i className="fas fa-chevron-right" />
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
                <i className="fas fa-book-open" /> Vous aimerez peut-être aussi
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
                to={`/catalog?search=${encodeURIComponent(book.author?.full_name || '')}`}
                className="bd-btn bd-btn--outline bd-btn--lg"
              >
                <i className="fas fa-user-pen" /> Tous les livres de {book.author?.full_name}
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
