import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardOverview from './DashboardOverview';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      first_name: 'Jean',
      profile_types: [],
      profile_image: null,
      address: '123 Rue Test',
    },
    organizationMemberships: [],
  }),
}));

// Mock API — return empty data for all endpoints
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

const renderDashboard = () =>
  render(<MemoryRouter><DashboardOverview /></MemoryRouter>);

describe('DashboardOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders greeting after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      // t() mock returns fallback string with raw {{name}} placeholder
      expect(screen.getByText(/Bonjour/)).toBeInTheDocument();
    });
  });

  it('shows KPI section with expected labels', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Commandes')).toBeInTheDocument();
      expect(screen.getByText('Liste de souhaits')).toBeInTheDocument();
      expect(screen.getByText('Soumissions')).toBeInTheDocument();
    });
  });

  it('renders shortcuts section with links', async () => {
    renderDashboard();
    await waitFor(() => {
      // Default user (no special roles) gets "Découvrir le catalogue" shortcut
      expect(screen.getByText(/catalogue/i)).toBeInTheDocument();
    });
  });
});
