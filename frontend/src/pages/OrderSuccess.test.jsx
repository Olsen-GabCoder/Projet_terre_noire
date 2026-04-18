import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderSuccess from './OrderSuccess';

// Mock orderService
vi.mock('../services/orderService', () => ({
  default: {
    getOrderById: vi.fn(),
    downloadInvoice: vi.fn(),
  },
}));

// Mock child components
vi.mock('../components/PageHero', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-hero">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

const ORDER_DATA = {
  id: 42,
  status: 'PAID',
  subtotal: 10000,
  shipping_cost: 2000,
  total_amount: 12000,
  shipping_address: '123 Rue Test',
  shipping_phone: '+241 00 00 00',
  shipping_city: 'Libreville',
};

const renderOrderSuccess = (orderId = '42', orderData = ORDER_DATA) =>
  render(
    <MemoryRouter initialEntries={[{
      pathname: `/order-success/${orderId}`,
      state: { orderId, orderData },
    }]}>
      <Routes>
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/catalog" element={<div>Catalog</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('OrderSuccess', () => {
  it('renders success page with order number', () => {
    renderOrderSuccess();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('displays order total amount', () => {
    renderOrderSuccess();
    expect(screen.getByText(/12.*000.*FCFA/)).toBeInTheDocument();
  });

  it('shows continue shopping link to catalog', () => {
    renderOrderSuccess();
    const link = screen.getByText('pages.orderSuccess.continueShopping');
    expect(link.closest('a')).toHaveAttribute('href', '/catalog');
  });
});
