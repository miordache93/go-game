import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';
import { renderHook, act } from '@testing-library/react';

// Mock document.documentElement.setAttribute for theme setting
// Happy-dom provides a proper DOM, we just need to mock the setAttribute method
const mockSetAttribute = vi.fn();
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.setAttribute = mockSetAttribute;
}

describe('UIStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetAttribute.mockClear();
    // Reset store state before each test
    const store = useUIStore.getState();
    store.setTheme('modern');
    store.setGameMode('local');
    store.setBoardSize(19);
    store.clearNotifications();
    store.closeAllModals();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.theme).toBe('modern');
      expect(result.current.gameMode).toBe('local');
      expect(result.current.boardSize).toBe(19);
      expect(result.current.isSidebarOpen).toBe(false);
      expect(result.current.isSettingsOpen).toBe(false);
      expect(result.current.isLeaderboardOpen).toBe(false);
      expect(result.current.isProfileOpen).toBe(false);
      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('Theme Management', () => {
    it('updates theme and applies to document', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setTheme('zen');
      });
      
      expect(result.current.theme).toBe('zen');
      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'zen');
    });

    it('handles all theme options', () => {
      const { result } = renderHook(() => useUIStore());
      
      const themes = ['classic', 'modern', 'zen'] as const;
      
      themes.forEach(theme => {
        act(() => {
          result.current.setTheme(theme);
        });
        
        expect(result.current.theme).toBe(theme);
        expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', theme);
      });
    });
  });

  describe('Game Settings', () => {
    it('updates game mode', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setGameMode('multiplayer');
      });
      
      expect(result.current.gameMode).toBe('multiplayer');
    });

    it('handles all game mode options', () => {
      const { result } = renderHook(() => useUIStore());
      
      const modes = ['local', 'multiplayer', 'ai'] as const;
      
      modes.forEach(mode => {
        act(() => {
          result.current.setGameMode(mode);
        });
        
        expect(result.current.gameMode).toBe(mode);
      });
    });

    it('updates board size', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setBoardSize(13);
      });
      
      expect(result.current.boardSize).toBe(13);
    });

    it('handles all board size options', () => {
      const { result } = renderHook(() => useUIStore());
      
      const sizes = [9, 13, 19] as const;
      
      sizes.forEach(size => {
        act(() => {
          result.current.setBoardSize(size);
        });
        
        expect(result.current.boardSize).toBe(size);
      });
    });
  });

  describe('Modal Management', () => {
    it('toggles sidebar state', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.isSidebarOpen).toBe(false);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.isSidebarOpen).toBe(true);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('toggles settings modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.isSettingsOpen).toBe(false);
      
      act(() => {
        result.current.toggleSettings();
      });
      
      expect(result.current.isSettingsOpen).toBe(true);
      
      act(() => {
        result.current.toggleSettings();
      });
      
      expect(result.current.isSettingsOpen).toBe(false);
    });

    it('toggles leaderboard modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.isLeaderboardOpen).toBe(false);
      
      act(() => {
        result.current.toggleLeaderboard();
      });
      
      expect(result.current.isLeaderboardOpen).toBe(true);
      
      act(() => {
        result.current.toggleLeaderboard();
      });
      
      expect(result.current.isLeaderboardOpen).toBe(false);
    });

    it('toggles profile modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.isProfileOpen).toBe(false);
      
      act(() => {
        result.current.toggleProfile();
      });
      
      expect(result.current.isProfileOpen).toBe(true);
      
      act(() => {
        result.current.toggleProfile();
      });
      
      expect(result.current.isProfileOpen).toBe(false);
    });

    it('closes all modals at once', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Open all modals
      act(() => {
        result.current.toggleSettings();
        result.current.toggleLeaderboard();
        result.current.toggleProfile();
      });
      
      expect(result.current.isSettingsOpen).toBe(true);
      expect(result.current.isLeaderboardOpen).toBe(true);
      expect(result.current.isProfileOpen).toBe(true);
      
      // Close all modals
      act(() => {
        result.current.closeAllModals();
      });
      
      expect(result.current.isSettingsOpen).toBe(false);
      expect(result.current.isLeaderboardOpen).toBe(false);
      expect(result.current.isProfileOpen).toBe(false);
      
      // Sidebar should not be affected
      expect(result.current.isSidebarOpen).toBe(false);
    });
  });

  describe('Notification Management', () => {
    it('adds notification with auto-generated id and timestamp', () => {
      const { result } = renderHook(() => useUIStore());
      
      const notification = {
        type: 'success' as const,
        title: 'Test Success',
        message: 'This is a test message',
      };
      
      act(() => {
        result.current.addNotification(notification);
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject(notification);
      expect(result.current.notifications[0].id).toBeDefined();
      expect(result.current.notifications[0].timestamp).toBeDefined();
      expect(typeof result.current.notifications[0].id).toBe('string');
      expect(typeof result.current.notifications[0].timestamp).toBe('number');
    });

    it('handles all notification types', () => {
      const { result } = renderHook(() => useUIStore());
      
      const types = ['success', 'error', 'info', 'warning'] as const;
      
      types.forEach((type, index) => {
        act(() => {
          result.current.addNotification({
            type,
            title: `Test ${type}`,
            message: `Message for ${type}`,
          });
        });
        
        expect(result.current.notifications[index].type).toBe(type);
      });
    });

    it('adds notification without message', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Info Only',
        });
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Info Only');
      expect(result.current.notifications[0].message).toBeUndefined();
    });

    it('limits notifications to 5 items', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Add 7 notifications
      for (let i = 0; i < 7; i++) {
        act(() => {
          result.current.addNotification({
            type: 'info',
            title: `Notification ${i}`,
          });
        });
      }
      
      expect(result.current.notifications).toHaveLength(5);
      // Should keep the last 5 notifications
      expect(result.current.notifications[0].title).toBe('Notification 2');
      expect(result.current.notifications[4].title).toBe('Notification 6');
    });

    it('removes specific notification by id', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'First',
        });
        result.current.addNotification({
          type: 'error',
          title: 'Second',
        });
        result.current.addNotification({
          type: 'info',
          title: 'Third',
        });
      });
      
      expect(result.current.notifications).toHaveLength(3);
      
      const secondNotificationId = result.current.notifications[1].id;
      
      act(() => {
        result.current.removeNotification(secondNotificationId);
      });
      
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].title).toBe('First');
      expect(result.current.notifications[1].title).toBe('Third');
    });

    it('handles removing non-existent notification gracefully', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Test',
        });
      });
      
      expect(result.current.notifications).toHaveLength(1);
      
      act(() => {
        result.current.removeNotification('non-existent-id');
      });
      
      expect(result.current.notifications).toHaveLength(1);
    });

    it('clears all notifications', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Add multiple notifications
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.addNotification({
            type: 'info',
            title: `Notification ${i}`,
          });
        });
      }
      
      expect(result.current.notifications).toHaveLength(3);
      
      act(() => {
        result.current.clearNotifications();
      });
      
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('Notification ID Generation', () => {
    it('generates unique IDs for notifications', () => {
      const { result } = renderHook(() => useUIStore());
      
      const ids = new Set();
      
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.addNotification({
            type: 'info',
            title: `Test ${i}`,
          });
        });
      }
      
      result.current.notifications.forEach(notification => {
        expect(ids.has(notification.id)).toBe(false);
        ids.add(notification.id);
      });
      
      expect(ids.size).toBe(5); // Limited to 5 notifications
    });
  });

  describe('Timestamp Generation', () => {
    it('generates timestamps for notifications', () => {
      const { result } = renderHook(() => useUIStore());
      
      const beforeTime = Date.now();
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Test',
        });
      });
      
      const afterTime = Date.now();
      const notification = result.current.notifications[0];
      
      expect(notification.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(notification.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('State Isolation', () => {
    it('maintains independent state across multiple hook calls', () => {
      const { result: result1 } = renderHook(() => useUIStore());
      const { result: result2 } = renderHook(() => useUIStore());
      
      act(() => {
        result1.current.setTheme('zen');
      });
      
      expect(result1.current.theme).toBe('zen');
      expect(result2.current.theme).toBe('zen'); // Same store instance
    });
  });

  describe('Action Functions', () => {
    it('provides all expected action functions', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Theme actions
      expect(typeof result.current.setTheme).toBe('function');
      
      // Game setting actions
      expect(typeof result.current.setGameMode).toBe('function');
      expect(typeof result.current.setBoardSize).toBe('function');
      
      // UI toggle actions
      expect(typeof result.current.toggleSidebar).toBe('function');
      expect(typeof result.current.toggleSettings).toBe('function');
      expect(typeof result.current.toggleLeaderboard).toBe('function');
      expect(typeof result.current.toggleProfile).toBe('function');
      expect(typeof result.current.closeAllModals).toBe('function');
      
      // Notification actions
      expect(typeof result.current.addNotification).toBe('function');
      expect(typeof result.current.removeNotification).toBe('function');
      expect(typeof result.current.clearNotifications).toBe('function');
    });
  });
});
