import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

const mockAuthStore = {
  user: null,
  isAuthenticated: false,
  logout: vi.fn(),
  refreshAuth: vi.fn(),
};

vi.mock('@go-game/game', () => ({
  useAuthStore: vi.fn((selector?: (state: typeof mockAuthStore) => unknown) =>
    selector ? selector(mockAuthStore) : mockAuthStore
  ),
  Game: () => <div data-testid="mock-game">Local Game</div>,
  MultiplayerGame: () => <div data-testid="mock-multiplayer-game" />,
}));

vi.mock('./components/AuthForm', () => ({ AuthForm: () => <div /> }));
vi.mock('./components/UserProfile', () => ({ UserProfile: () => <div /> }));
vi.mock('./components/Leaderboard', () => ({ Leaderboard: () => <div /> }));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(baseElement).toBeTruthy();
  });

  it('renders the GO Game brand in the nav', () => {
    const { getByText } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(getByText('⚫ GO Game ⚪')).toBeTruthy();
  });
});
