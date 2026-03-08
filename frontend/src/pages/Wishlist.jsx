import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import BookCard from '../components/BookCard';
import '../styles/Wishlist.css';

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart, isInCart } = useCart();

  if (!wishlistItems.length) {
    return (
      <div className="wishlist-page">
        <section className="wishlist-hero">
          <div className="wishlist-hero__orb" />
          <div className="wishlist-hero__grid-bg" />
          <div className="wishlist-hero__inner">
            <div className="wishlist-hero__line" />
            <h1 className="wishlist-hero__title">Ma liste d&apos;envie</h1>
            <p className="wishlist-hero__sub">Votre liste d&apos;envie est vide.</p>
          </div>
        </section>
        <div className="wishlist-hero-fade" />

        <div className="wishlist-content">
          <div className="wishlist-empty">
            <div className="wishlist-empty__ico">
              <i className="far fa-heart" />
            </div>
            <h2>Aucun livre favori</h2>
            <p>Cliquez sur le cœur sur un livre pour l&apos;ajouter à votre liste d&apos;envie.</p>
            <div className="wishlist-empty__actions">
              <Link to="/catalog" className="wishlist-btn wishlist-btn--primary">
                <i className="fas fa-book" /> Explorer le catalogue
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
      <section className="wishlist-hero">
        <div className="wishlist-hero__orb" />
        <div className="wishlist-hero__grid-bg" />
        <div className="wishlist-hero__inner">
          <div className="wishlist-hero__line" />
          <h1 className="wishlist-hero__title">Ma liste d&apos;envie</h1>
          <p className="wishlist-hero__sub">
            {wishlistItems.length} livre{wishlistItems.length > 1 ? 's' : ''} dans votre liste
          </p>
        </div>
      </section>
      <div className="wishlist-hero-fade" />

      <div className="wishlist-content">
        <div className="wishlist-grid">
          {wishlistItems.map((book) => (
            <div key={book.id} className="wishlist-card-wrapper">
              <BookCard book={book} />
              <div className="wishlist-card-actions">
                <button
                  type="button"
                  className="wishlist-remove"
                  onClick={() => removeFromWishlist(book.id)}
                  aria-label="Retirer de la liste d'envie"
                >
                  <i className="fas fa-heart-broken" />
                  Retirer
                </button>
                {book.available && !isInCart(book.id) && (
                  <button
                    type="button"
                    className="wishlist-add-cart"
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(book);
                    }}
                  >
                    <i className="fas fa-shopping-cart" />
                    Au panier
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
