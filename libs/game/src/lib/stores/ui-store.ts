import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'classic' | 'modern' | 'zen';
export type GameMode = 'local' | 'multiplayer' | 'ai';
export type BoardSize = 9 | 13 | 19;

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Game settings
  gameMode: GameMode;
  boardSize: BoardSize;
  setGameMode: (mode: GameMode) => void;
  setBoardSize: (size: BoardSize) => void;

  // UI flags
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isLeaderboardOpen: boolean;
  isProfileOpen: boolean;
  
  // UI actions
  toggleSidebar: () => void;
  toggleSettings: () => void;
  toggleLeaderboard: () => void;
  toggleProfile: () => void;
  closeAllModals: () => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
    timestamp: number;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      theme: 'modern',
      gameMode: 'local',
      boardSize: 19,
      isSidebarOpen: false,
      isSettingsOpen: false,
      isLeaderboardOpen: false,
      isProfileOpen: false,
      notifications: [],

      // Theme actions
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document if needed
        document.documentElement.setAttribute('data-theme', theme);
      },

      // Game settings actions
      setGameMode: (gameMode) => set({ gameMode }),
      setBoardSize: (boardSize) => set({ boardSize }),

      // UI toggle actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      toggleLeaderboard: () => set((state) => ({ isLeaderboardOpen: !state.isLeaderboardOpen })),
      toggleProfile: () => set((state) => ({ isProfileOpen: !state.isProfileOpen })),
      
      closeAllModals: () => set({
        isSettingsOpen: false,
        isLeaderboardOpen: false,
        isProfileOpen: false,
      }),

      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
            },
          ].slice(-5), // Keep only last 5 notifications
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'UIStore',
    }
  )
);