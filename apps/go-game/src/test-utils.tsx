import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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
      <BrowserRouter>
        <MantineProvider>
          <Notifications />
          {children}
        </MantineProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Export everything from react-testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Helper functions for testing
export const createMockUser = () => ({
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  elo: 1500,
  stats: {
    gamesPlayed: 10,
    wins: 6,
    losses: 3,
    draws: 1,
  },
});

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
};
