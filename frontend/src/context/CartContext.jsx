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

function cartKey(item) {
  return `${item.id}_${item.format_purchased || 'PAPIER'}`;
}

function migrateCart(items) {
  return items.map((item) => {
    if (!item.format_purchased) {
      return { ...item, format_purchased: 'PAPIER' };
    }
    return item;
  });
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('cart');
    return saved ? migrateCart(JSON.parse(saved)) : [];
  } catch {
    localStorage.removeItem('cart');
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(loadCartFromStorage);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (book, quantity = 1, formatPurchased = 'PAPIER') => {
    const isEbook = formatPurchased === 'EBOOK';
    const price = isEbook ? book.ebook_price : book.price;

    setCartItems((prevItems) => {
      const key = `${book.id}_${formatPurchased}`;
      const existingItem = prevItems.find((item) => cartKey(item) === key);

      if (existingItem) {
        if (isEbook) return prevItems;
        return prevItems.map((item) =>
          cartKey(item) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevItems, {
          ...book,
          format_purchased: formatPurchased,
          price,
          quantity: isEbook ? 1 : quantity,
        }];
      }
    });
  };

  const removeFromCart = (bookId, formatPurchased) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => {
        if (formatPurchased) {
          return !(item.id === bookId && item.format_purchased === formatPurchased);
        }
        return item.id !== bookId;
      })
    );
  };

  const updateQuantity = (bookId, quantity, formatPurchased) => {
    if (quantity <= 0) {
      removeFromCart(bookId, formatPurchased);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const match = formatPurchased
          ? item.id === bookId && item.format_purchased === formatPurchased
          : item.id === bookId;
        if (!match) return item;
        if (item.format_purchased === 'EBOOK') return item;
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('cart');
  };

  const applyCouponToContext = (coupon) => setAppliedCoupon(coupon);
  const clearCoupon = () => setAppliedCoupon(null);

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  };

  const isInCart = (bookId, formatPurchased) => {
    if (formatPurchased) {
      return cartItems.some((item) => item.id === bookId && item.format_purchased === formatPurchased);
    }
    return cartItems.some((item) => item.id === bookId);
  };

  const getItemQuantity = (bookId, formatPurchased) => {
    if (formatPurchased) {
      const item = cartItems.find((item) => item.id === bookId && item.format_purchased === formatPurchased);
      return item ? item.quantity : 0;
    }
    return cartItems.filter((item) => item.id === bookId).reduce((sum, item) => sum + item.quantity, 0);
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
