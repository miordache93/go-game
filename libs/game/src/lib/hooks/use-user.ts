import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { useAuthStore } from '../stores/auth-store';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  stats: (userId?: string) => [...userKeys.all, 'stats', userId || 'me'] as const,
  leaderboard: (timeframe = 'all') => ['leaderboard', timeframe] as const,
};

// Fetch user profile
export function useUserProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => apiClient.getProfile(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

// Fetch user statistics
export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: userKeys.stats(userId),
    queryFn: () => apiClient.getUserStats(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch leaderboard
export function useLeaderboard(
  limit = 100,
  offset = 0,
  timeframe: 'all' | 'weekly' | 'monthly' = 'all'
) {
  return useQuery({
    queryKey: [...userKeys.leaderboard(timeframe), { limit, offset }],
    queryFn: () => apiClient.getLeaderboard(limit, offset, timeframe),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: { avatar?: string; bio?: string; country?: string }) => {
      // This endpoint needs to be implemented in the API
      const response = await apiClient.updateProfile(data);
      return response;
    },
    onSuccess: (data) => {
      // Update auth store
      if (data.user) {
        setUser(data.user);
      }
      // Invalidate profile query
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}