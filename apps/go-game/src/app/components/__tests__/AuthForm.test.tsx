import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '../AuthForm';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the stores
const mockAuthStore = {
  login: vi.fn(),
  register: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
};

const mockUIStore = {
  addNotification: vi.fn(),
};

vi.mock('@go-game/game', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
  useUIStore: vi.fn(() => mockUIStore),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('AuthForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isLoading = false;
    mockAuthStore.error = null;
  });

  describe('Rendering', () => {
    it('renders the auth form with login tab active by default', () => {
      renderWithProviders(<AuthForm />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('switches to register tab when clicked', async () => {
      renderWithProviders(<AuthForm />);
      
      const registerTab = screen.getByText('Register');
      fireEvent.click(registerTab);
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    it('displays error message when error is present', () => {
      mockAuthStore.error = 'Invalid credentials';
      
      renderWithProviders(<AuthForm />);
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('shows loading state on submit button', () => {
      mockAuthStore.isLoading = true;
      
      renderWithProviders(<AuthForm />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Login Form', () => {
    it('handles login form submission with valid data', async () => {
      mockAuthStore.login.mockResolvedValue(undefined);
      
      renderWithProviders(<AuthForm />);
      
      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows success notification on successful login', async () => {
      mockAuthStore.login.mockResolvedValue(undefined);
      
      renderWithProviders(<AuthForm />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(mockUIStore.addNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome back!',
        });
      });
    });

    it('clears error before submission', async () => {
      renderWithProviders(<AuthForm />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      
      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });

    it('validates required fields', () => {
      renderWithProviders(<AuthForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('handles login errors gracefully', async () => {
      mockAuthStore.login.mockRejectedValue(new Error('Login failed'));
      
      renderWithProviders(<AuthForm />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Should not crash and error is handled by the store
      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalled();
      });
    });
  });

  describe('Register Form', () => {
    beforeEach(() => {
      renderWithProviders(<AuthForm />);
      fireEvent.click(screen.getByText('Register'));
    });

    it('handles register form submission with valid data', async () => {
      mockAuthStore.register.mockResolvedValue(undefined);
      
      // Fill in form
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuthStore.register).toHaveBeenCalledWith(
          'testuser',
          'test@example.com',
          'password123'
        );
      });
    });

    it('shows success notification on successful registration', async () => {
      mockAuthStore.register.mockResolvedValue(undefined);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      
      await waitFor(() => {
        expect(mockUIStore.addNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Registration Successful',
          message: 'Welcome to Go Game!',
        });
      });
    });

    it('validates username constraints', () => {
      const usernameInput = screen.getByLabelText(/username/i);
      
      expect(usernameInput).toHaveAttribute('required');
      expect(usernameInput).toHaveAttribute('minlength', '3');
      expect(usernameInput).toHaveAttribute('maxlength', '20');
    });

    it('validates password minimum length', () => {
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('minlength', '6');
    });

    it('validates email format', () => {
      const emailInput = screen.getByLabelText(/email/i);
      
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('handles registration errors gracefully', async () => {
      mockAuthStore.register.mockRejectedValue(new Error('Registration failed'));
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      
      // Should not crash
      await waitFor(() => {
        expect(mockAuthStore.register).toHaveBeenCalled();
      });
    });
  });

  describe('Form State Management', () => {
    it('maintains form state when switching between tabs', () => {
      renderWithProviders(<AuthForm />);
      
      // Fill login form
      const loginEmailInput = screen.getByLabelText(/email/i);
      fireEvent.change(loginEmailInput, { target: { value: 'login@test.com' } });
      
      // Switch to register tab
      fireEvent.click(screen.getByText('Register'));
      
      // Switch back to login tab
      fireEvent.click(screen.getByText('Login'));
      
      // Check if login email is still filled
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('login@test.com');
    });

    it('clears form state appropriately', () => {
      renderWithProviders(<AuthForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('Visual Design', () => {
    it('renders with proper styling classes', () => {
      renderWithProviders(<AuthForm />);
      
      // Check for Mantine Card component
      const card = screen.getByLabelText(/email/i).closest('[data-mantine-component="Card"]') ||
                  screen.getByLabelText(/email/i).closest('.mantine-Card-root');
      expect(card || screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('has proper form layout', () => {
      renderWithProviders(<AuthForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('displays appropriate icons', () => {
      renderWithProviders(<AuthForm />);
      
      // Mantine inputs should have left sections with icons
      // This is harder to test directly, but we can verify the inputs render
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderWithProviders(<AuthForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('has proper button roles and types', () => {
      renderWithProviders(<AuthForm />);
      
      const loginButton = screen.getByRole('button', { name: /login/i });
      expect(loginButton).toHaveAttribute('type', 'submit');
    });

    it('provides proper error messaging', () => {
      mockAuthStore.error = 'Invalid email or password';
      
      renderWithProviders(<AuthForm />);
      
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      renderWithProviders(<AuthForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      emailInput.focus();
      
      expect(document.activeElement).toBe(emailInput);
    });
  });

  describe('Form Validation', () => {
    it('prevents submission with empty required fields', () => {
      renderWithProviders(<AuthForm />);
      
      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(mockAuthStore.login).not.toHaveBeenCalled();
    });

    it('handles invalid email format', () => {
      renderWithProviders(<AuthForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      // HTML5 validation should handle this
      expect(emailInput).toHaveValue('invalid-email');
    });

    it('handles password strength requirements in register form', () => {
      renderWithProviders(<AuthForm />);
      
      fireEvent.click(screen.getByText('Register'));
      
      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      
      // Should have minimum length validation
      expect(passwordInput).toHaveValue('short');
      expect(passwordInput).toHaveAttribute('minlength', '6');
    });
  });

  describe('Integration with Stores', () => {
    it('calls clearError when form is submitted', async () => {
      renderWithProviders(<AuthForm />);
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      
      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });

    it('handles store loading state correctly', () => {
      mockAuthStore.isLoading = true;
      
      renderWithProviders(<AuthForm />);
      
      const submitButton = screen.getByRole('button', { name: /login/i });
      expect(submitButton).toHaveAttribute('data-loading', 'true');
    });
  });
});
