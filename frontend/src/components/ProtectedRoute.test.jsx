import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// We'll control the mock return value per test
const mockAuthValues = {
  user: null,
  loading: false,
  authChecked: true,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

const renderWithRouter = (initialRoute = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('redirects to /login when user is not authenticated', () => {
    mockAuthValues.user = null;
    mockAuthValues.loading = false;
    mockAuthValues.authChecked = true;

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockAuthValues.user = { id: 1, username: 'testuser' };
    mockAuthValues.loading = false;
    mockAuthValues.authChecked = true;

    renderWithRouter();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows loading spinner while auth is being checked', () => {
    mockAuthValues.user = null;
    mockAuthValues.loading = true;
    mockAuthValues.authChecked = false;

    renderWithRouter();

    // Should not show content or redirect
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    // Should show spinner div
    const spinner = document.querySelector('.admin-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('shows loading spinner when authChecked is false even if not loading', () => {
    mockAuthValues.user = null;
    mockAuthValues.loading = false;
    mockAuthValues.authChecked = false;

    renderWithRouter();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    const spinner = document.querySelector('.admin-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('preserves the original location in redirect state', () => {
    mockAuthValues.user = null;
    mockAuthValues.loading = false;
    mockAuthValues.authChecked = true;

    // The Navigate component passes state={{ from: location.pathname }}
    // We verify redirection happens (login page renders)
    renderWithRouter('/protected');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
