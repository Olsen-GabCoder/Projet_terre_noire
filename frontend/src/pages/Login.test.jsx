import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockLogin = vi.fn();
const mockVerifyTotp = vi.fn();
const mockAuthValues = {
  login: mockLogin,
  verifyTotp: mockVerifyTotp,
  isAuthenticated: false,
  loading: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

// Mock child components that are not relevant to Login tests
vi.mock('../components/SocialLoginButtons', () => ({
  default: () => <div data-testid="social-login">Social Login</div>,
}));

vi.mock('../components/SEO', () => ({
  default: () => null,
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues.isAuthenticated = false;
    mockAuthValues.loading = false;
  });

  it('renders login form with email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/emailLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwordLabel/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /submit|sign.?in|connexion/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it('shows validation error on empty submit', async () => {
    renderLogin();

    // The inputs have required attribute, but the component also checks
    // formData.email/password. We submit via the form's onSubmit directly
    // by dispatching a submit event that bypasses HTML validation.
    const form = document.querySelector('.login-form');
    fireEvent.submit(form);

    // With i18n mock, error text will be the key: 'login.errorEmpty'
    await waitFor(() => {
      expect(screen.getByText('login.errorEmpty')).toBeInTheDocument();
    });
  });

  it('calls login function on valid submit', async () => {
    mockLogin.mockResolvedValue({ success: true, user: { id: 1 } });
    const user = userEvent.setup();

    renderLogin();

    const emailInput = screen.getByLabelText(/emailLabel/i);
    const passwordInput = screen.getByLabelText(/passwordLabel/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: /submit|sign.?in|connexion/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
    await user.type(screen.getByLabelText(/passwordLabel/i), 'wrongpassword');

    const submitBtn = screen.getByRole('button', { name: /submit|sign.?in|connexion/i });
    await user.click(submitBtn);

    await waitFor(() => {
      // The code checks result.error truthy and shows t('login.errorInvalid')
      expect(screen.getByText('login.errorInvalid')).toBeInTheDocument();
    });
  });

  it('redirects after successful login', async () => {
    mockLogin.mockResolvedValue({ success: true, user: { id: 1 } });
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
    await user.type(screen.getByLabelText(/passwordLabel/i), 'password123');

    const submitBtn = screen.getByRole('button', { name: /submit|sign.?in|connexion/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('has link to registration page', () => {
    renderLogin();

    const registerLink = screen.getByText('login.signUp');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('has link to forgot password page', () => {
    renderLogin();

    const forgotLink = screen.getByText('login.forgotPassword');
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/passwordLabel/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /showPassword|hidePassword/i });
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('renders social login buttons', () => {
    renderLogin();

    expect(screen.getByTestId('social-login')).toBeInTheDocument();
  });

  it('redirects if already authenticated', () => {
    mockAuthValues.isAuthenticated = true;
    mockAuthValues.loading = false;

    renderLogin();

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
