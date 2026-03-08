import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI } from '../services/api';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist doit être utilisé dans un WishlistProvider');
  }
  return context;
};

const STORAGE_KEY = 'wishlist';

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await wishlistAPI.getList();
      setWishlistItems(res.data.results || []);
    } catch {
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setWishlistItems(JSON.parse(saved));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setWishlistItems([]);
        }
      } else {
        setWishlistItems([]);
      }
    }
  }, [isAuthenticated, fetchWishlist]);

  useEffect(() => {
    if (!isAuthenticated && wishlistItems.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistItems));
    }
  }, [isAuthenticated, wishlistItems]);

  const mergeLocalStorageToApi = useCallback(async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const localItems = JSON.parse(saved);
      for (const book of localItems) {
        if (book?.id) {
          try {
            await wishlistAPI.add(book.id);
          } catch {
            // ignore
          }
        }
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      mergeLocalStorageToApi().then(() => fetchWishlist());
    }
  }, [isAuthenticated]);

  const toggleWishlist = async (book) => {
    if (isAuthenticated) {
      try {
        const res = await wishlistAPI.toggle(book.id);
        if (res.data.added) {
          setWishlistItems((prev) => [...prev, { ...book }]);
        } else {
          setWishlistItems((prev) => prev.filter((item) => item.id !== book.id));
        }
      } catch {
        // keep state unchanged
      }
    } else {
      setWishlistItems((prev) => {
        const exists = prev.some((item) => item.id === book.id);
        const next = exists ? prev.filter((item) => item.id !== book.id) : [...prev, { ...book }];
        return next;
      });
    }
  };

  const removeFromWishlist = async (bookId) => {
    if (isAuthenticated) {
      try {
        await wishlistAPI.remove(bookId);
        setWishlistItems((prev) => prev.filter((item) => item.id !== bookId));
      } catch {
        // keep state unchanged
      }
    } else {
      setWishlistItems((prev) => prev.filter((item) => item.id !== bookId));
    }
  };

  const isInWishlist = (bookId) => wishlistItems.some((item) => item.id === bookId);
  const getWishlistCount = () => wishlistItems.length;

  const value = {
    wishlistItems,
    toggleWishlist,
    removeFromWishlist,
    isInWishlist,
    getWishlistCount,
    loading,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
