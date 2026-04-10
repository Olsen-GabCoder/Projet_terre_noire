import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import socialService from '../../services/socialService';
import bookService from '../../services/bookService';
import { handleApiError } from '../../services/api';

const POST_TYPE_CONFIG = {
  TEXT: { icon: 'fas fa-pen', color: '#6366f1' },
  RECOMMENDATION: { icon: 'fas fa-thumbs-up', color: '#10b981' },
  REVIEW: { icon: 'fas fa-star', color: '#f59e0b' },
  PLATFORM_REVIEW: { icon: 'fas fa-award', color: '#8b5cf6' },
  NEWS: { icon: 'fas fa-newspaper', color: '#3b82f6' },
};

// Types qui supportent l'association de livre
const BOOK_TYPES = ['RECOMMENDATION', 'REVIEW'];
// Types qui supportent l'upload d'image
const IMAGE_TYPES = ['TEXT', 'RECOMMENDATION', 'NEWS'];

const PostComposer = ({ onPostCreated }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const POST_TYPES = [
    { value: 'TEXT', label: t('pages.feed.post', 'Publication') },
    { value: 'RECOMMENDATION', label: t('pages.feed.recommendation', 'Recommandation') },
    { value: 'REVIEW', label: t('pages.feed.review', 'Avis livre') },
    { value: 'PLATFORM_REVIEW', label: t('pages.feed.ratePlatform', 'Noter Frollot') },
    { value: 'NEWS', label: t('pages.feed.news', 'Actualité') },
  ];

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('TEXT');
  const [rating, setRating] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Book search
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searching, setSearching] = useState(false);

  // Image
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageRef = useRef(null);

  const supportsBook = BOOK_TYPES.includes(postType);
  const supportsImage = IMAGE_TYPES.includes(postType);
  const isPlatformReview = postType === 'PLATFORM_REVIEW';
  const cfg = POST_TYPE_CONFIG[postType] || POST_TYPE_CONFIG.TEXT;

  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await bookService.searchBooks(bookSearch);
        setBookResults((Array.isArray(res.data) ? res.data : res.data.results || []).slice(0, 6));
      } catch { setBookResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  // Nettoyer les états incompatibles quand on change de type
  useEffect(() => {
    if (!supportsBook) { setSelectedBook(null); setBookSearch(''); setBookResults([]); }
    if (!supportsImage) { setImage(null); setImagePreview(null); }
    if (!isPlatformReview) { setRating(0); }
  }, [postType]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('content', content);
      fd.append('post_type', postType);
      if (isPlatformReview && rating > 0) fd.append('rating', rating);
      if (selectedBook && supportsBook) fd.append('book', selectedBook.id);
      if (image && supportsImage) fd.append('image', image);
      await socialService.createPost(fd);
      setContent(''); setPostType('TEXT'); setRating(0);
      setSelectedBook(null); setBookSearch('');
      setImage(null); setImagePreview(null);
      setExpanded(false);
      onPostCreated?.();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setPosting(false);
    }
  };

  const resetComposer = () => {
    setExpanded(false); setContent(''); setPostType('TEXT'); setRating(0);
    setSelectedBook(null); setBookSearch(''); setBookResults([]);
    setImage(null); setImagePreview(null);
  };

  const canSubmit = content.trim() && !posting && (!isPlatformReview || rating > 0);
  const initials = (user?.first_name?.charAt(0) || '') + (user?.last_name?.charAt(0) || '') || 'U';

  return (
    <div className="composer">
      {/* ── Barre compacte ── */}
      {!expanded ? (
        <div className="composer__compact" onClick={() => setExpanded(true)}>
          <div className="composer__avatar">
            {user?.profile_image ? <img src={user.profile_image} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="composer__placeholder">
            {t('pages.feed.whatsOnYourMind', { name: user?.first_name || t('common.user', 'lecteur') })}
          </div>
          <div className="composer__quick-actions">
            <button type="button" title="Recommandation" onClick={(e) => { e.stopPropagation(); setExpanded(true); setPostType('RECOMMENDATION'); }}>
              <i className="fas fa-thumbs-up" />
            </button>
            <button type="button" title="Noter Frollot" onClick={(e) => { e.stopPropagation(); setExpanded(true); setPostType('PLATFORM_REVIEW'); }}>
              <i className="fas fa-award" />
            </button>
            <button type="button" title="Image" onClick={(e) => { e.stopPropagation(); setExpanded(true); imageRef.current?.click(); }}>
              <i className="fas fa-image" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="composer__form">
          {/* ── Header : avatar + type pills ── */}
          <div className="composer__form-header">
            <div className="composer__avatar">
              {user?.profile_image ? <img src={user.profile_image} alt="" /> : <span>{initials}</span>}
            </div>
            <div className="composer__type-pills">
              {POST_TYPES.map(pt => {
                const ptCfg = POST_TYPE_CONFIG[pt.value];
                const isActive = postType === pt.value;
                return (
                  <button key={pt.value} type="button"
                    className={`composer__type-pill ${isActive ? 'active' : ''}`}
                    style={isActive ? { '--pill-color': ptCfg.color } : undefined}
                    onClick={() => setPostType(pt.value)}>
                    <i className={ptCfg.icon} />
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Textarea ── */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === 'RECOMMENDATION' ? t('pages.feed.recommendBook', 'Recommandez un livre à la communauté...')
              : postType === 'REVIEW' ? t('pages.feed.shareReview', 'Partagez votre avis sur un livre que vous avez lu...')
              : isPlatformReview ? t('pages.feed.sharePlatformReview', 'Partagez votre expérience sur Frollot...')
              : postType === 'NEWS' ? t('pages.feed.shareNews', 'Partagez une actualité littéraire ou un événement...')
              : t('pages.feed.shareThought', 'Partagez une pensée, une citation, une découverte...')
            }
            rows={3}
            autoFocus
          />

          {/* ── Star rating (PLATFORM_REVIEW uniquement) ── */}
          {isPlatformReview && (
            <div className="composer__star-rating">
              <span className="composer__star-label">{t('pages.feed.yourRating', 'Votre note :')}</span>
              <div className="composer__stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button"
                    className={`composer__star ${star <= rating ? 'active' : ''}`}
                    onClick={() => setRating(star)}>
                    <i className={star <= rating ? 'fas fa-star' : 'far fa-star'} />
                  </button>
                ))}
              </div>
              {rating > 0 && <span className="composer__star-value">{rating}/5</span>}
            </div>
          )}

          {/* ── Livre associé (RECOMMENDATION / REVIEW uniquement) ── */}
          {supportsBook && (
            <div className="composer__book-section">
              <div className="composer__book-section-label">
                <i className="fas fa-book" />
                <span>{t('pages.feed.tagBook', 'Associer un livre')}</span>
              </div>
              {selectedBook ? (
                <div className="composer__selected-book">
                  <div className="composer__selected-book-cover">
                    <img src={selectedBook.cover_image || '/images/default-book-cover.svg'} alt={selectedBook.title} />
                  </div>
                  <div className="composer__selected-book-info">
                    <strong>{selectedBook.title}</strong>
                    <span>{selectedBook.author?.full_name || ''}</span>
                    {selectedBook.rating && (
                      <span className="composer__selected-book-rating">
                        <i className="fas fa-star" /> {parseFloat(selectedBook.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <button type="button" className="composer__selected-book-remove" onClick={() => { setSelectedBook(null); setBookSearch(''); }}>
                    <i className="fas fa-times" />
                  </button>
                </div>
              ) : (
                <div className="composer__book-picker">
                  <div className="composer__book-picker-input">
                    <i className="fas fa-search" />
                    <input
                      value={bookSearch}
                      onChange={e => setBookSearch(e.target.value)}
                      placeholder={t('pages.feed.searchBook', 'Rechercher un livre par titre...')}
                    />
                    {searching && <i className="fas fa-spinner fa-spin" />}
                  </div>
                  {bookResults.length > 0 && (
                    <div className="composer__book-results">
                      {bookResults.map(b => (
                        <button key={b.id} type="button" className="composer__book-result"
                          onClick={() => { setSelectedBook(b); setBookSearch(''); setBookResults([]); }}>
                          <div className="composer__book-result-cover">
                            <img src={b.cover_image || '/images/default-book-cover.svg'} alt={b.title} />
                          </div>
                          <div className="composer__book-result-info">
                            <strong>{b.title}</strong>
                            <span>{b.author?.full_name || ''}</span>
                          </div>
                          {b.rating && (
                            <span className="composer__book-result-rating">
                              <i className="fas fa-star" /> {parseFloat(b.rating).toFixed(1)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Image preview ── */}
          {imagePreview && (
            <div className="composer__image-preview">
              <img src={imagePreview} alt="" />
              <button type="button" onClick={() => { setImage(null); setImagePreview(null); }}>
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          {/* ── Barre d'actions ── */}
          <div className="composer__actions">
            <div className="composer__tools">
              {supportsImage && (
                <>
                  <button type="button" className="composer__tool-btn" onClick={() => imageRef.current?.click()} title="Ajouter une image">
                    <i className="fas fa-image" />
                  </button>
                  <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </>
              )}
            </div>
            <div className="composer__submit-group">
              <button type="button" className="composer__cancel" onClick={resetComposer}>
                {t('pages.feed.cancel', 'Annuler')}
              </button>
              <button type="submit" className="composer__submit" disabled={!canSubmit}
                style={{ '--btn-color': cfg.color }}>
                {posting ? (
                  <><i className="fas fa-spinner fa-spin" /> {t('pages.feed.publishing', 'Publication...')}</>
                ) : (
                  <><i className="fas fa-paper-plane" /> {t('pages.feed.publish', 'Publier')}</>
                )}
              </button>
            </div>
          </div>

          {error && <p className="composer__error"><i className="fas fa-exclamation-circle" /> {error}</p>}
        </form>
      )}
    </div>
  );
};

export default PostComposer;
