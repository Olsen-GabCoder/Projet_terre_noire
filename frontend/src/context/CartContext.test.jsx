import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const mockBook1 = { id: 1, title: 'Book A', price: '5000' };
const mockBook2 = { id: 2, title: 'Book B', price: '3000' };

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.getTotalItems()).toBe(0);
    expect(result.current.getTotalPrice()).toBe(0);
  });

  it('addToCart adds an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe(1);
    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('addToCart increments quantity for existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });
    act(() => {
      result.current.addToCart(mockBook1);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('addToCart with custom quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1, 3);
    });

    expect(result.current.cartItems[0].quantity).toBe(3);
  });

  it('addToCart with listing creates separate cart item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const listing = { id: 10, price: '4500', vendor: 5, vendor_name: 'Vendeur A' };

    act(() => {
      result.current.addToCart(mockBook1);
    });
    act(() => {
      result.current.addToCart(mockBook1, 1, listing);
    });

    expect(result.current.cartItems).toHaveLength(2);
  });

  it('removeFromCart removes an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
      result.current.addToCart(mockBook2);
    });
    act(() => {
      result.current.removeFromCart(1);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe(2);
  });

  it('removeFromCart with listingId removes marketplace item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const listing = { id: 10, price: '4500', vendor: 5, vendor_name: 'V' };

    act(() => {
      result.current.addToCart(mockBook1, 1, listing);
    });
    act(() => {
      result.current.removeFromCart(1, 10);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('updateQuantity changes the quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });
    act(() => {
      result.current.updateQuantity(1, 5);
    });

    expect(result.current.cartItems[0].quantity).toBe(5);
  });

  it('updateQuantity to 0 removes the item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });
    act(() => {
      result.current.updateQuantity(1, 0);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
      result.current.addToCart(mockBook2);
    });
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.appliedCoupon).toBeNull();
    // Note: the useEffect re-saves empty array to localStorage after clearCart
    // so we verify the cart is functionally empty
    expect(result.current.getTotalItems()).toBe(0);
  });

  it('getTotalItems returns correct total across items', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1, 2);
      result.current.addToCart(mockBook2, 3);
    });

    expect(result.current.getTotalItems()).toBe(5);
  });

  it('getTotalPrice returns correct total price', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1, 2); // 5000 * 2 = 10000
      result.current.addToCart(mockBook2, 1); // 3000 * 1 = 3000
    });

    expect(result.current.getTotalPrice()).toBe(13000);
  });

  it('isInCart detects items in cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });

    expect(result.current.isInCart(1)).toBe(true);
    expect(result.current.isInCart(999)).toBe(false);
  });

  it('isInCart detects marketplace items with listingId', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const listing = { id: 10, price: '4500', vendor: 5, vendor_name: 'V' };

    act(() => {
      result.current.addToCart(mockBook1, 1, listing);
    });

    expect(result.current.isInCart(1, 10)).toBe(true);
    expect(result.current.isInCart(1, 99)).toBe(false);
  });

  it('getItemQuantity returns correct quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1, 3);
    });

    expect(result.current.getItemQuantity(1)).toBe(3);
    expect(result.current.getItemQuantity(999)).toBe(0);
  });

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(mockBook1);
    });

    const saved = JSON.parse(localStorage.getItem('cart'));
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(1);
  });

  it('restores cart from localStorage on mount', () => {
    const savedCart = [{ ...mockBook1, quantity: 2, _cartKey: '1' }];
    localStorage.setItem('cart', JSON.stringify(savedCart));

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('cart', 'not-valid-json');

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
  });

  it('throws error when useCart is used outside CartProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart doit être utilisé dans un CartProvider');

    consoleSpy.mockRestore();
  });
});
