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
  const addToCart = (book, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === book.id);

      if (existingItem) {
        // Si le livre existe déjà, augmenter la quantité
        return prevItems.map((item) =>
          item.id === book.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Sinon, ajouter le nouveau livre
        return [...prevItems, { ...book, quantity }];
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
      prevItems.map((item) =>
        item.id === bookId ? { ...item, quantity } : item
      )
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