import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/BottomNav.css';

const BottomNav = () => {
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { getWishlistCount } = useWishlist();

  // Don't show on admin pages or book reader
  if (location.pathname.startsWith('/admin') || location.pathname.includes('/read')) return null;

  const items = [
    { path: '/', icon: 'fas fa-house', label: 'Accueil' },
    { path: '/catalog', icon: 'fas fa-book-open', label: 'Catalogue' },
    { path: '/wishlist', icon: 'far fa-heart', label: 'Favoris', badge: getWishlistCount() },
    { path: '/cart', icon: 'fas fa-shopping-bag', label: 'Panier', badge: getTotalItems() },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {items.map((item) => {
        const active = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav__item ${active ? 'active' : ''}`}
          >
            <span className="bottom-nav__icon">
              <i className={item.icon} />
              {item.badge > 0 && <span className="bottom-nav__badge">{item.badge}</span>}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
