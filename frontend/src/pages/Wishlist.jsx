import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import BookCard from '../components/BookCard';
import { useReveal } from '../hooks/useReveal';
import '../styles/Wishlist.css';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';

const ALERT_ICONS = {
  price_drop: { icon: 'fa-tag', color: '#e74c3c' },
  library_available: { icon: 'fa-landmark', color: '#3b82f6' },
  club_reading: { icon: 'fa-users', color: '#8b5cf6' },
  new_edition: { icon: 'fa-sparkles', color: '#f59e0b' },
};

function WishlistAlertsPanel({ t }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (alerts) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const data = await aiService.wishlistAlerts();
      setAlerts(data.alerts || []);
      setOpen(true);
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="wishlist-alerts">
      <button className="wishlist-alerts__btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> {t('pages.wishlist.analyzingAlerts', 'Analyse...')}</>
          : open
            ? <><i className="fas fa-chevron-up" /> {t('pages.wishlist.hideAlerts', 'Masquer')}</>
            : <><i className="fas fa-robot" /> {t('pages.wishlist.aiAlerts', 'Opportunités sur ma wishlist')}</>
        }
      </button>
      {open && alerts?.length > 0 && (
        <div className="wishlist-alerts__list">
          {alerts.map((a, i) => {
            const cfg = ALERT_ICONS[a.alert_type] || { icon: 'fa-bell', color: '#8a857e' };
            return (
              <div key={i} className="wishlist-alert-card">
                <i className={`fas ${cfg.icon}`} style={{ color: cfg.color }} />
                <div className="wishlist-alert-card__body">
                  <strong>{a.book_title || `Livre #${a.book_id}`}</strong>
                  <p>{a.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && alerts?.length === 0 && (
        <p className="wishlist-alerts__empty"><i className="fas fa-check-circle" /> {t('pages.wishlist.noAlerts', 'Aucune opportunité détectée pour le moment.')}</p>
      )}
    </div>
  );
}

const Wishlist = ({ embedded = false }) => {
  const { t } = useTranslation();
  const revealRef = useReveal();
  const { user } = useAuth();
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

      {user && wishlistItems.length > 0 && (
        <div className="wishlist-content" style={{ paddingBottom: 0 }}>
          <WishlistAlertsPanel t={t} />
        </div>
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
