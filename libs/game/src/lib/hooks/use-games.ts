import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

// Query keys
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (filters: any) => [...gameKeys.lists(), filters] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: string) => [...gameKeys.details(), id] as const,
  history: (id: string) => [...gameKeys.detail(id), 'history'] as const,
};

// Fetch user's games
export function useUserGames(page = 1, limit = 10, status?: string) {
  return useQuery({
    queryKey: gameKeys.list({ page, limit, status }),
    queryFn: () => apiClient.getUserGames(page, limit, status),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch single game
export function useGame(gameId: string) {
  return useQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: () => apiClient.getGame(gameId),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch game history
export function useGameHistory(gameId: string) {
  return useQuery({
    queryKey: gameKeys.history(gameId),
    queryFn: () => apiClient.getGameHistory(gameId),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Create new game
export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      opponentId?: string;
      boardSize?: number;
      isRanked?: boolean;
    }) => apiClient.createGame(params.opponentId, params.boardSize, params.isRanked),
    onSuccess: () => {
      // Invalidate games list to refetch
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
    },
  });
}

// Resign from game
export function useResignGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => apiClient.resignGame(gameId),
    onSuccess: (_, gameId) => {
      // Invalidate this game and games list
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
    },
  });
}