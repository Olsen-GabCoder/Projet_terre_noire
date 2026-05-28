// frontend/src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
};

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    localStorage.removeItem('cart');
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(loadCartFromStorage);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Sauvegarder le panier dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Ajouter un article au panier
  const addToCart = (book, quantity = 1) => {
    const isEbook = book.format === 'EBOOK';
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === book.id);

      if (existingItem) {
        if (isEbook) return prevItems; // Ebook deja dans le panier, qty=1 max
        return prevItems.map((item) =>
          item.id === book.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevItems, { ...book, quantity: isEbook ? 1 : quantity }];
      }
    });
  };

  // Retirer un article du panier
  const removeFromCart = (bookId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== bookId));
  };

  // Mettre à jour la quantité d'un article
  const updateQuantity = (bookId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== bookId) return item;
        if (item.format === 'EBOOK') return item; // Ebook verrouille a qty=1
        return { ...item, quantity };
      })
    );
  };

  // Vider le panier
  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('cart');
  };

  // Code promo appliqué
  const applyCouponToContext = (coupon) => setAppliedCoupon(coupon);
  const clearCoupon = () => setAppliedCoupon(null);

  // Calculer le nombre total d'articles
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Calculer le prix total
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  };

  // Vérifier si un livre est dans le panier
  const isInCart = (bookId) => {
    return cartItems.some((item) => item.id === bookId);
  };

  // Obtenir la quantité d'un livre dans le panier
  const getItemQuantity = (bookId) => {
    const item = cartItems.find((item) => item.id === bookId);
    return item ? item.quantity : 0;
  };

  const value = {
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;