import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../services/api-client';

interface User {
  id: string;
  username: string;
  email: string;
  elo?: number;
  stats?: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  };
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Login action
        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.login(email, password);
            
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.response?.data?.error || 'Login failed',
            });
            throw error;
          }
        },

        // Register action
        register: async (username: string, email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.register(username, email, password);
            
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.response?.data?.error || 'Registration failed',
            });
            throw error;
          }
        },

        // Logout action
        logout: () => {
          apiClient.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        },

        // Set user action
        setUser: (user: User) => {
          set({ user, isAuthenticated: true });
        },

        // Refresh authentication from stored token
        refreshAuth: async () => {
          const isAuth = apiClient.isAuthenticated();
          if (!isAuth) {
            set({ user: null, isAuthenticated: false });
            return;
          }

          set({ isLoading: true });
          try {
            const response = await apiClient.getProfile();
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            // Token might be expired
            apiClient.logout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        // Clear error
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'AuthStore',
    }
  )
);