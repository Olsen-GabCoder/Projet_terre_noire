import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Cart from './Cart';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock contexts
const mockCartValues = {
  cartItems: [],
  appliedCoupon: null,
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  applyCouponToContext: vi.fn(),
  clearCoupon: vi.fn(),
  getTotalPrice: () => 0,
  getTotalItems: () => 0,
};
vi.mock('../context/CartContext', () => ({
  useCart: () => mockCartValues,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}));

vi.mock('../context/DeliveryConfigContext', () => ({
  useDeliveryConfig: () => ({ shippingFreeThreshold: 50000, shippingCost: 2000 }),
}));

// Mock child components
vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../components/PageHero', () => ({
  default: ({ title, subtitle }) => <div data-testid="page-hero">{title} {subtitle}</div>,
}));
vi.mock('../components/CouponWidget', () => ({
  default: () => <div data-testid="coupon-widget" />,
}));
vi.mock('../hooks/useReveal', () => ({
  useReveal: () => ({ current: null }),
}));
vi.mock('../services/api', () => ({
  couponAPI: { validate: vi.fn() },
}));

const ITEMS = [
  {
    id: 1, _cartKey: '1', title: 'Le Petit Prince', price: '5000',
    quantity: 2, format: 'PAPIER', condition: 'NEW',
    cover_image: null, author: { full_name: 'Saint-Exupéry' },
    listing_id: null, vendor_name: null,
  },
  {
    id: 2, _cartKey: '2', title: 'Les Soleils', price: '3000',
    quantity: 1, format: 'EBOOK', condition: null,
    cover_image: null, author: { full_name: 'Auteur Test' },
    listing_id: null, vendor_name: null,
  },
];

const renderCart = (overrides = {}) => {
  Object.assign(mockCartValues, {
    cartItems: [],
    appliedCoupon: null,
    getTotalPrice: () => 0,
    getTotalItems: () => 0,
    ...overrides,
  });
  return render(<MemoryRouter><Cart /></MemoryRouter>);
};

describe('Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartValues.removeFromCart = vi.fn();
    mockCartValues.updateQuantity = vi.fn();
    mockCartValues.clearCart = vi.fn();
  });

  it('renders empty cart message when no items', () => {
    renderCart({ cartItems: [] });
    expect(screen.getByText('cart.emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('cart.browseCatalog')).toBeInTheDocument();
  });

  it('renders cart items with title and author', () => {
    renderCart({
      cartItems: ITEMS,
      getTotalPrice: () => 13000,
      getTotalItems: () => 3,
    });
    expect(screen.getByText('Le Petit Prince')).toBeInTheDocument();
    expect(screen.getByText('Les Soleils')).toBeInTheDocument();
    expect(screen.getByText('Saint-Exupéry')).toBeInTheDocument();
  });

  it('displays item quantities', () => {
    renderCart({
      cartItems: [ITEMS[0]],
      getTotalPrice: () => 10000,
      getTotalItems: () => 2,
    });
    // Quantity is displayed in a span inside crt-qty
    const qtySpans = screen.getAllByText('2');
    expect(qtySpans.length).toBeGreaterThan(0);
  });

  it('calls removeFromCart when delete button clicked', () => {
    renderCart({
      cartItems: [ITEMS[0]],
      getTotalPrice: () => 10000,
      getTotalItems: () => 2,
    });
    const removeBtn = screen.getByRole('button', { name: /cart\.remove/i });
    fireEvent.click(removeBtn);
    expect(mockCartValues.removeFromCart).toHaveBeenCalledWith(1, null);
  });

  it('displays correct total in FCFA format', () => {
    renderCart({
      cartItems: ITEMS,
      getTotalPrice: () => 13000,
      getTotalItems: () => 3,
    });
    // Total displayed as "13 000 FCFA" (formatted) — multiple occurrences expected
    const matches = screen.getAllByText(/13.*000.*FCFA/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('has a checkout button', () => {
    renderCart({
      cartItems: [ITEMS[0]],
      getTotalPrice: () => 10000,
      getTotalItems: () => 2,
    });
    // The checkout button contains t('cart.checkout') text
    expect(screen.getByText('cart.checkout')).toBeInTheDocument();
  });
});
