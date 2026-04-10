// frontend/src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Charger le panier depuis localStorage au montage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Sauvegarder le panier dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Ajouter un article au panier
  // listing = { id, price, vendor_id, vendor_name, ... } (optionnel, pour la marketplace)
  const addToCart = useCallback((book, quantity = 1, listing = null) => {
    setCartItems((prevItems) => {
      // Clé unique : bookId + listingId (même livre de 2 vendeurs = 2 items)
      const cartKey = listing ? `${book.id}_${listing.id}` : `${book.id}`;
      const existingItem = prevItems.find((item) => item._cartKey === cartKey);

      if (existingItem) {
        return prevItems.map((item) =>
          item._cartKey === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            ...book,
            quantity,
            _cartKey: cartKey,
            listing_id: listing?.id || null,
            vendor_id: listing?.vendor || null,
            vendor_name: listing?.vendor_name || null,
            price: listing ? listing.price : book.price,
          },
        ];
      }
    });
  }, []);

  // Retirer un article du panier (par cartKey ou bookId pour rétrocompatibilité)
  const removeFromCart = useCallback((bookId, listingId = null) => {
    setCartItems((prevItems) => {
      if (listingId) {
        const cartKey = `${bookId}_${listingId}`;
        return prevItems.filter((item) => item._cartKey !== cartKey);
      }
      // Rétrocompatibilité : retirer par bookId simple
      return prevItems.filter((item) => item.id !== bookId && item._cartKey !== `${bookId}`);
    });
  }, []);

  // Mettre à jour la quantité d'un article
  const updateQuantity = useCallback((bookId, quantity, listingId = null) => {
    if (quantity <= 0) {
      removeFromCart(bookId, listingId);
      return;
    }

    setCartItems((prevItems) => {
      const cartKey = listingId ? `${bookId}_${listingId}` : `${bookId}`;
      return prevItems.map((item) => {
        if (item._cartKey === cartKey || (!item._cartKey && item.id === bookId)) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  }, [removeFromCart]);

  // Vider le panier
  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('cart');
  }, []);

  // Code promo appliqué
  const applyCouponToContext = useCallback((coupon) => setAppliedCoupon(coupon), []);
  const clearCoupon = useCallback(() => setAppliedCoupon(null), []);

  // Calculer le nombre total d'articles
  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // Calculer le prix total
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  }, [cartItems]);

  // Vérifier si un livre est dans le panier
  const isInCart = useCallback((bookId, listingId = null) => {
    if (listingId) {
      return cartItems.some((item) => item._cartKey === `${bookId}_${listingId}`);
    }
    return cartItems.some((item) => item.id === bookId);
  }, [cartItems]);

  // Obtenir la quantité d'un livre dans le panier
  const getItemQuantity = useCallback((bookId, listingId = null) => {
    const cartKey = listingId ? `${bookId}_${listingId}` : `${bookId}`;
    const item = cartItems.find((i) => i._cartKey === cartKey || (!i._cartKey && i.id === bookId));
    return item ? item.quantity : 0;
  }, [cartItems]);

  // Grouper les items par vendeur (pour affichage cart/checkout)
  const getItemsByVendor = useCallback(() => {
    const groups = {};
    cartItems.forEach((item) => {
      const key = item.vendor_id || 'frollot';
      if (!groups[key]) {
        groups[key] = {
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_name || 'Frollot',
          items: [],
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    appliedCoupon,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCouponToContext,
    clearCoupon,
    getTotalItems,
    getTotalPrice,
    isInCart,
    getItemQuantity,
    getItemsByVendor,
  }), [cartItems, appliedCoupon, addToCart, removeFromCart, updateQuantity, clearCart, applyCouponToContext, clearCoupon, getTotalItems, getTotalPrice, isInCart, getItemQuantity, getItemsByVendor]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;