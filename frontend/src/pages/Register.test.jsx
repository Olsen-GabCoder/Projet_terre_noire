import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';

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
const mockRegister = vi.fn();
const mockAuthValues = {
  register: mockRegister,
  isAuthenticated: false,
  loading: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

// Mock child components
vi.mock('../components/SocialLoginButtons', () => ({
  default: () => <div data-testid="social-login">Social Login</div>,
}));

vi.mock('../components/PasswordStrengthMeter', () => ({
  default: ({ password }) => <div data-testid="strength-meter">{password ? 'has-password' : 'empty'}</div>,
}));

vi.mock('../components/SEO', () => ({
  default: () => null,
}));

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

// Helper to fill the form with valid data
const fillValidForm = async (user) => {
  await user.type(screen.getByLabelText(/usernameLabel/i), 'testuser');
  await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
  await user.type(screen.getByLabelText(/firstNameLabel/i), 'Jean');
  await user.type(screen.getByLabelText(/lastNameLabel/i), 'Dupont');
  await user.type(screen.getByLabelText(/^register\.passwordLabel/i), 'StrongPass123');
  await user.type(screen.getByLabelText(/confirmPasswordLabel/i), 'StrongPass123');
  // Accept terms
  const checkboxes = screen.getAllByRole('checkbox');
  const termsCheckbox = checkboxes[checkboxes.length - 1]; // terms is the last checkbox
  await user.click(termsCheckbox);
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues.isAuthenticated = false;
    mockAuthValues.loading = false;
  });

  it('renders registration form with all fields', () => {
    renderRegister();

    expect(screen.getByLabelText(/usernameLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emailLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/firstNameLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lastNameLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^register\.passwordLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmPasswordLabel/i)).toBeInTheDocument();
  });

  it('shows validation error for empty required fields', async () => {
    const user = userEvent.setup();
    renderRegister();

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      // At least one validation error should appear
      const errors = screen.getAllByText(/register\.val/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for mismatched passwords', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/usernameLabel/i), 'testuser');
    await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
    await user.type(screen.getByLabelText(/firstNameLabel/i), 'Jean');
    await user.type(screen.getByLabelText(/lastNameLabel/i), 'Dupont');
    await user.type(screen.getByLabelText(/^register\.passwordLabel/i), 'StrongPass123');
    await user.type(screen.getByLabelText(/confirmPasswordLabel/i), 'DifferentPass456');

    // Accept terms
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[checkboxes.length - 1]);

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('register.valConfirmMismatch')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/usernameLabel/i), 'testuser');
    await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
    await user.type(screen.getByLabelText(/firstNameLabel/i), 'Jean');
    await user.type(screen.getByLabelText(/lastNameLabel/i), 'Dupont');
    await user.type(screen.getByLabelText(/^register\.passwordLabel/i), 'short');
    await user.type(screen.getByLabelText(/confirmPasswordLabel/i), 'short');

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[checkboxes.length - 1]);

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('register.valPasswordMin')).toBeInTheDocument();
    });
  });

  it('calls register function on valid submit', async () => {
    mockRegister.mockResolvedValue({ success: true, needsVerification: true });
    const user = userEvent.setup();
    renderRegister();

    await fillValidForm(user);

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPass123',
        password_confirm: 'StrongPass123',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone_number: '',
        terms_accepted: true,
      });
    });
  });

  it('redirects after successful registration', async () => {
    mockRegister.mockResolvedValue({ success: true, needsVerification: true });
    const user = userEvent.setup();
    renderRegister();

    await fillValidForm(user);

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', expect.objectContaining({ replace: true }));
    });
  });

  it('shows API errors on failed registration', async () => {
    mockRegister.mockResolvedValue({
      success: false,
      error: 'Registration failed',
    });
    const user = userEvent.setup();
    renderRegister();

    await fillValidForm(user);

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });

  it('has link to login page', () => {
    renderRegister();

    const loginLink = screen.getByText('register.loginLink');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('shows password strength meter', () => {
    renderRegister();

    expect(screen.getByTestId('strength-meter')).toBeInTheDocument();
  });

  it('shows terms validation error when terms not accepted', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/usernameLabel/i), 'testuser');
    await user.type(screen.getByLabelText(/emailLabel/i), 'test@example.com');
    await user.type(screen.getByLabelText(/firstNameLabel/i), 'Jean');
    await user.type(screen.getByLabelText(/lastNameLabel/i), 'Dupont');
    await user.type(screen.getByLabelText(/^register\.passwordLabel/i), 'StrongPass123');
    await user.type(screen.getByLabelText(/confirmPasswordLabel/i), 'StrongPass123');
    // Do NOT accept terms

    const submitBtn = screen.getByRole('button', { name: /submit|inscription|register\.submit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('register.valTermsRequired')).toBeInTheDocument();
    });
  });

  it('redirects if already authenticated', () => {
    mockAuthValues.isAuthenticated = true;
    mockAuthValues.loading = false;

    renderRegister();

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
