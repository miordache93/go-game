import '@testing-library/jest-dom';
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a test wrapper with all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
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

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock Zustand stores
export const mockAuthStore = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn(),
  refreshAuth: vi.fn(),
  clearError: vi.fn(),
};

export const mockUIStore = {
  theme: 'modern' as const,
  gameMode: 'local' as const,
  boardSize: 19 as const,
  isSidebarOpen: false,
  isSettingsOpen: false,
  isLeaderboardOpen: false,
  isProfileOpen: false,
  notifications: [],
  setTheme: vi.fn(),
  setGameMode: vi.fn(),
  setBoardSize: vi.fn(),
  toggleSidebar: vi.fn(),
  toggleSettings: vi.fn(),
  toggleLeaderboard: vi.fn(),
  toggleProfile: vi.fn(),
  closeAllModals: vi.fn(),
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  clearNotifications: vi.fn(),
};

const mockPartyKitState = vi.hoisted(() => {
  const state: {
    activeGameState: any;
    activePlayers: any[];
    activeRole: string;
    clientConfig: any;
    shouldHydrate: boolean;
    fetchAvailableRooms: ReturnType<typeof vi.fn>;
    client: {
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      makeMove: ReturnType<typeof vi.fn>;
      pass: ReturnType<typeof vi.fn>;
      resign: ReturnType<typeof vi.fn>;
      markDead: ReturnType<typeof vi.fn>;
      finalizeGame: ReturnType<typeof vi.fn>;
      resumePlaying: ReturnType<typeof vi.fn>;
    };
  } = {
    activeGameState: null,
    activePlayers: [],
    activeRole: 'black_player',
    clientConfig: null,
    shouldHydrate: true,
    fetchAvailableRooms: vi.fn(() => Promise.resolve([])),
    client: {} as any,
  };

  state.client = {
    connect: vi.fn(() => {
      const config = state.clientConfig;

      config?.onConnect?.();

      if (!state.shouldHydrate || !state.activeGameState) {
        return;
      }

      config?.onRoomInfo?.({
        type: 'room_info',
        roomId: config.roomId,
        gameState: state.activeGameState,
        players: state.activePlayers,
        spectatorCount: 0,
        isPrivate: !!config.isPrivate,
        waitingExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        timestamp: Date.now(),
      });
      config?.onRoleAssigned?.(state.activeRole, 'player1');
      config?.onGameStateUpdate?.(state.activeGameState, state.activePlayers);
    }),
    disconnect: vi.fn(),
    makeMove: vi.fn(),
    pass: vi.fn(),
    resign: vi.fn(),
    markDead: vi.fn(),
    finalizeGame: vi.fn(),
    resumePlaying: vi.fn(),
  };

  return state;
});

export { mockPartyKitState };

// Mock stores before importing components
vi.mock('../../stores', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
  useUIStore: vi.fn(() => mockUIStore),
}));

// Mock API client
vi.mock('../../services/api-client', () => ({
  apiClient: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    getToken: vi.fn(() => null),
  },
}));

// Mock PartyKit client
vi.mock('../../services/partykit-client', () => ({
  PartyKitClient: vi.fn().mockImplementation((config) => {
    mockPartyKitState.clientConfig = config;
    return mockPartyKitState.client;
  }),
  fetchAvailableRooms: mockPartyKitState.fetchAvailableRooms,
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
    clean: vi.fn(),
  },
  Notifications: ({ children }: any) => children,
}));

// Export everything from react-testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Helper functions for testing
export const createMockGameState = () => ({
  board: Array(19).fill(null).map(() => Array(19).fill(null)),
  boardSize: 19,
  currentPlayer: 0, // BLACK
  phase: 0, // PLAYING
  lastMove: null,
  capturedStones: { black: [], white: [] },
  score: null,
  moveHistory: [],
});

export const createMockGameEngine = () => ({
  getGameState: vi.fn(() => createMockGameState()),
  makeMove: vi.fn(),
  getGamePhase: vi.fn(() => 0), // PLAYING
  getCurrentScore: vi.fn(() => null),
  getCapturedStones: vi.fn(() => ({ black: 0, white: 0 })),
  markDeadStones: vi.fn(),
  finalizeGame: vi.fn(),
  resumePlaying: vi.fn(),
  getDeadStones: vi.fn(() => new Set()),
});

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  Object.values(mockAuthStore).forEach(fn => {
    if (typeof fn === 'function') fn.mockClear?.();
  });
  Object.values(mockUIStore).forEach(fn => {
    if (typeof fn === 'function') fn.mockClear?.();
  });
};
