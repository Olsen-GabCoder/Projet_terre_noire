import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
  }),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ getTotalItems: () => 2 }),
}));

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({ getWishlistCount: () => 1 }),
}));

const renderHeader = () =>
  render(<BrowserRouter><Header /></BrowserRouter>);

describe('Header', () => {
  it('renders brand name', () => {
    renderHeader();
    const brands = screen.getAllByText('Frollot');
    expect(brands.length).toBeGreaterThan(0);
  });

  it('renders nav links', () => {
    renderHeader();
    const homeLinks = screen.getAllByText('nav.home');
    expect(homeLinks.length).toBeGreaterThan(0);
    const catalogLinks = screen.getAllByText('nav.catalog');
    expect(catalogLinks.length).toBeGreaterThan(0);
  });

  it('shows login/register when not authenticated', () => {
    renderHeader();
    expect(screen.getAllByText('common.login').length).toBeGreaterThan(0);
    expect(screen.getAllByText('common.register').length).toBeGreaterThan(0);
  });

  it('renders cart badge', () => {
    renderHeader();
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders language toggle', () => {
    renderHeader();
    const langBtns = screen.getAllByText('FR');
    expect(langBtns.length).toBeGreaterThan(0);
  });

  it('renders as nav element', () => {
    renderHeader();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
