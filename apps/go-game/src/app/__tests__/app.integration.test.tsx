import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import App from '../app';

// Auth store backing object. Selectors are applied so the component can use
// `useAuthStore((state) => state.x)` the same way it does at runtime.
const mockAuthStore = {
  user: null as null | { id: string; username: string; email: string },
  isAuthenticated: false,
  isLoading: false,
  error: null as null | string,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
};

vi.mock('@go-game/game', () => ({
  useAuthStore: vi.fn((selector?: (state: typeof mockAuthStore) => unknown) =>
    selector ? selector(mockAuthStore) : mockAuthStore
  ),
  Game: () => <div data-testid="mock-game">Local Game</div>,
  MultiplayerGame: () => (
    <div data-testid="mock-multiplayer-game">Multiplayer Game</div>
  ),
}));

vi.mock('../components/AuthForm', () => ({
  AuthForm: () => <div data-testid="mock-auth-form">Auth Form</div>,
}));

vi.mock('../components/UserProfile', () => ({
  UserProfile: () => <div data-testid="mock-user-profile">User Profile</div>,
}));

vi.mock('../components/Leaderboard', () => ({
  Leaderboard: () => <div data-testid="mock-leaderboard">Leaderboard</div>,
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.user = null;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.error = null;
    // Reset URL between tests since we use BrowserRouter.
    window.history.pushState({}, '', '/');
  });

  describe('Shell', () => {
    it('renders the nav bar and the local game on the default route', () => {
      render(<App />);

      expect(screen.getByText('⚫ GO Game ⚪')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByTestId('mock-game')).toBeInTheDocument();
    });

    it('re-validates any persisted session on mount', () => {
      render(<App />);
      expect(mockAuthStore.refreshAuth).toHaveBeenCalled();
    });
  });

  describe('Authentication state', () => {
    it('shows a Login link when unauthenticated', () => {
      render(<App />);

      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Logout' })
      ).not.toBeInTheDocument();
    });

    it('shows the username and a Logout button when authenticated', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };

      render(<App />);

      expect(
        screen.getByRole('link', { name: 'testuser' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Logout' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Login' })
      ).not.toBeInTheDocument();
    });

    it('logs out when the Logout button is clicked', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };

      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(mockAuthStore.logout).toHaveBeenCalled();
    });
  });

  describe('Routing', () => {
    it('navigates to the leaderboard', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('link', { name: 'Leaderboard' }));
      expect(screen.getByTestId('mock-leaderboard')).toBeInTheDocument();
    });

    it('navigates to the login page', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('link', { name: 'Login' }));
      expect(screen.getByTestId('mock-auth-form')).toBeInTheDocument();
    });

    it('navigates to multiplayer', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('link', { name: 'Multiplayer' }));
      expect(screen.getByTestId('mock-multiplayer-game')).toBeInTheDocument();
    });

    it('redirects unauthenticated users away from the profile route', () => {
      window.history.pushState({}, '', '/profile');
      render(<App />);

      // ProfileRoute redirects to /login, which renders the auth form.
      expect(screen.getByTestId('mock-auth-form')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-user-profile')).not.toBeInTheDocument();
    });
  });

  describe('Lifecycle', () => {
    it('mounts and unmounts without errors', () => {
      const { unmount } = render(<App />);
      expect(screen.getByTestId('mock-game')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });
});
