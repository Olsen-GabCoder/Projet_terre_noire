import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CouponWidget from './CouponWidget';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const map = {
        'coupons.widget.title': 'Available coupons',
        'coupons.widget.apply': 'Apply',
        'coupons.widget.applicable': `${opts?.count || 0} coupon(s) available`,
        'coupons.type.FREE_SHIPPING': 'Free shipping',
      };
      return map[key] || key;
    },
  }),
}));

// Mock AuthContext
const mockAuth = { isAuthenticated: true };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Mock CartContext
const mockCart = {
  cartItems: [{ id: 1, price: 5000, quantity: 1 }],
  appliedCoupon: null,
  applyCouponToContext: vi.fn(),
};
vi.mock('../context/CartContext', () => ({
  useCart: () => mockCart,
}));

// Mock API
const mockGetApplicable = vi.fn();
vi.mock('../services/api', () => ({
  couponAPI: {
    getApplicable: (...args) => mockGetApplicable(...args),
  },
}));

describe('CouponWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockCart.cartItems = [{ id: 1, price: 5000, quantity: 1 }];
    mockCart.appliedCoupon = null;
  });

  it('renders coupons when available', async () => {
    mockGetApplicable.mockResolvedValue({
      data: [
        { id: 1, code: 'TEST-10', discount_type: 'PERCENT', discount_value: '10', organization_name: 'Org A', min_order_amount: '0' },
      ],
    });

    render(<CouponWidget />);

    await waitFor(() => {
      expect(screen.getByText('Available coupons')).toBeTruthy();
      expect(screen.getByText('-10%')).toBeTruthy();
      expect(screen.getByText('Org A')).toBeTruthy();
    });
  });

  it('renders nothing when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    const { container } = render(<CouponWidget />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when cart is empty', () => {
    mockCart.cartItems = [];
    const { container } = render(<CouponWidget />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when a coupon is already applied', () => {
    mockCart.appliedCoupon = { code: 'EXISTING' };
    const { container } = render(<CouponWidget />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when API returns empty list', async () => {
    mockGetApplicable.mockResolvedValue({ data: [] });
    const { container } = render(<CouponWidget />);
    await waitFor(() => {
      expect(container.querySelector('.coupon-widget')).toBeNull();
    });
  });

  it('renders nothing when API fails', async () => {
    mockGetApplicable.mockRejectedValue(new Error('Network error'));
    const { container } = render(<CouponWidget />);
    await waitFor(() => {
      expect(container.querySelector('.coupon-widget')).toBeNull();
    });
  });

  it('calls applyCouponToContext on click', async () => {
    mockGetApplicable.mockResolvedValue({
      data: [
        { id: 1, code: 'APPLY-ME', discount_type: 'FIXED', discount_value: '500', organization_name: 'Org', min_order_amount: '0' },
      ],
    });

    render(<CouponWidget />);

    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Apply'));
    expect(mockCart.applyCouponToContext).toHaveBeenCalledWith({
      code: 'APPLY-ME',
      discountPercent: 0,
      discountAmount: 500,
      freeShipping: false,
    });
  });
});
