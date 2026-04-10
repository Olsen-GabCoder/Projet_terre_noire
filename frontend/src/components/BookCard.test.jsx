import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BookCard from './BookCard';

// Mock contexts
vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    isInCart: () => false,
  }),
}));

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({
    toggleWishlist: vi.fn(),
    isInWishlist: () => false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
  __esModule: true,
}));

const mockBook = {
  id: 1,
  title: 'Le Petit Prince',
  author: { full_name: 'Antoine de Saint-Exupéry' },
  category: { name: 'Roman' },
  price: '5000',
  cover_image: '/images/test.jpg',
  available: true,
  format: 'PAPIER',
  rating: 4.5,
  rating_count: 12,
  has_discount: false,
};

const renderCard = (book = mockBook) =>
  render(
    <BrowserRouter>
      <BookCard book={book} />
    </BrowserRouter>
  );

describe('BookCard', () => {
  it('renders book title and author', () => {
    renderCard();
    expect(screen.getByText('Le Petit Prince')).toBeInTheDocument();
    expect(screen.getByText('Antoine de Saint-Exupéry')).toBeInTheDocument();
  });

  it('renders category', () => {
    renderCard();
    expect(screen.getByText('Roman')).toBeInTheDocument();
  });

  it('renders price with FCFA', () => {
    renderCard();
    expect(screen.getByText(/5[\s\u202f]?000/)).toBeInTheDocument();
  });

  it('renders add button when available', () => {
    renderCard();
    // i18n mock returns the key: 'bookCard.addToCart'
    const btn = screen.getByRole('button', { name: /addToCart|ajouter/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('renders unavailable text when not available', () => {
    renderCard({ ...mockBook, available: false });
    // i18n mock returns the key: 'bookCard.unavailable'
    expect(screen.getByText(/unavailable|indisponible/i)).toBeInTheDocument();
  });

  it('renders wishlist button', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /liste d'envie|wishlist/i });
    expect(btn).toBeInTheDocument();
  });

  it('renders rating stars when rating exists', () => {
    renderCard();
    expect(screen.getByText('(12)')).toBeInTheDocument();
  });

  it('renders discount badge when has_discount', () => {
    renderCard({ ...mockBook, has_discount: true, discount_percentage: 20 });
    expect(screen.getByText('−20%')).toBeInTheDocument();
  });

  it('renders bestseller badge', () => {
    renderCard({ ...mockBook, is_bestseller: true });
    expect(screen.getByText(/best-seller|bestseller/i)).toBeInTheDocument();
  });

  it('links to book detail page', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/books/1');
  });

  it('renders image with lazy loading', () => {
    renderCard();
    const img = screen.getByAltText('Le Petit Prince');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '200');
  });
});
