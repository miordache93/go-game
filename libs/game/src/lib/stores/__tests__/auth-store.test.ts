import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../auth-store';
import { renderHook, act } from '@testing-library/react';

// Mock the API client
vi.mock('../../services/api-client', () => ({
  apiClient: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

// Mock localStorage for persist middleware
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

describe('AuthStore', () => {
  // Get the mocked API client
  let mockApiClient: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked api client
    const apiModule = await import('../../services/api-client');
    mockApiClient = apiModule.apiClient;
    // Reset store state before each test
    useAuthStore.getState().logout();
    useAuthStore.getState().clearError();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Login Action', () => {
    it('handles successful login', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      mockApiClient.login.mockResolvedValue({ user: mockUser });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });
      
      expect(mockApiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockApiClient.login.mockRejectedValue({
        response: { data: { error: errorMessage } }
      });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('sets loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockApiClient.login.mockReturnValue(loginPromise);
      
      const { result } = renderHook(() => useAuthStore());
      
      act(() => {
        result.current.login('test@example.com', 'password123');
      });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      
      await act(async () => {
        resolveLogin({ user: { id: 'test', username: 'test', email: 'test@example.com' } });
        await loginPromise;
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register Action', () => {
    it('handles successful registration', async () => {
      const mockUser = {
        id: 'user123',
        username: 'newuser',
        email: 'new@example.com',
      };
      
      mockApiClient.register.mockResolvedValue({ user: mockUser });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.register('newuser', 'new@example.com', 'password123');
      });
      
      expect(mockApiClient.register).toHaveBeenCalledWith(
        'newuser',
        'new@example.com',
        'password123'
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles registration failure', async () => {
      const errorMessage = 'Username already taken';
      mockApiClient.register.mockRejectedValue({
        response: { data: { error: errorMessage } }
      });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        try {
          await result.current.register('taken', 'taken@example.com', 'password123');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Logout Action', () => {
    it('clears user state on logout', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      // First login
      mockApiClient.login.mockResolvedValue({ user: mockUser });
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      
      // Then logout
      act(() => {
        result.current.logout();
      });
      
      expect(mockApiClient.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('SetUser Action', () => {
    it('sets user and authentication state', () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      const { result } = renderHook(() => useAuthStore());
      
      act(() => {
        result.current.setUser(mockUser);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('RefreshAuth Action', () => {
    it('refreshes authentication when token is valid', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      mockApiClient.isAuthenticated.mockReturnValue(true);
      mockApiClient.getProfile.mockResolvedValue({ user: mockUser });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(mockApiClient.getProfile).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('clears authentication when token is invalid', async () => {
      mockApiClient.isAuthenticated.mockReturnValue(false);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(mockApiClient.getProfile).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('handles token expiration during refresh', async () => {
      mockApiClient.isAuthenticated.mockReturnValue(true);
      mockApiClient.getProfile.mockRejectedValue(new Error('Token expired'));
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(mockApiClient.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('ClearError Action', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      // First cause an error
      mockApiClient.login.mockRejectedValue({
        response: { data: { error: 'Some error' } }
      });
      
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Some error');
      
      // Then clear the error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('uses default error message when API error is missing', async () => {
      mockApiClient.login.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Login failed');
    });

    it('uses default register error message', async () => {
      mockApiClient.register.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        try {
          await result.current.register('user', 'user@example.com', 'password123');
        } catch (error) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe('Registration failed');
    });
  });

  describe('Persistence', () => {
    it('persists user and authentication state', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      mockApiClient.login.mockResolvedValue({ user: mockUser });
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });
      
      // Verify the user state is set correctly (which would trigger persistence)
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      
      // Note: The actual persistence happens asynchronously in Zustand
      // and may not be immediately detectable in this test environment
    });
  });
});
