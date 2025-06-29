import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { goTheme } from './go-theme';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * GO Game Theme Provider
 *
 * Wraps the application with Mantine theme and provides:
 * - Custom GO game colors and styling
 * - Notification system
 * - Color scheme support (light/dark)
 * - Global CSS variables for game-specific styling
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider theme={goTheme} defaultColorScheme="light">
        <Notifications position="top-right" zIndex={1000} />
        {children}
      </MantineProvider>
    </>
  );
}

export default ThemeProvider;
