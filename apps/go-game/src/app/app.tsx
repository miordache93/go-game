import { useEffect } from 'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Button, Group, Container, Box, Text } from '@mantine/core';
import { ThemeProvider } from '@go-game/ui';
import { Game, MultiplayerGame, useAuthStore } from '@go-game/game';
import { AuthForm } from './components/AuthForm';
import { UserProfile } from './components/UserProfile';
import { Leaderboard } from './components/Leaderboard';

interface NavTab {
  label: string;
  to: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Play', to: '/' },
  { label: 'Multiplayer', to: '/multiplayer' },
  { label: 'Leaderboard', to: '/leaderboard' },
];

/**
 * Top navigation bar with auth-aware actions.
 */
function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Box
      component="header"
      px="md"
      py="xs"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Group justify="space-between" align="center">
        <Group gap="xs" align="center">
          <Text
            component={Link}
            to="/"
            fw={800}
            size="lg"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            ⚫ GO Game ⚪
          </Text>
          <Group gap={4} ml="md">
            {NAV_TABS.map((tab) => (
              <Button
                key={tab.to}
                component={Link}
                to={tab.to}
                size="xs"
                variant={location.pathname === tab.to ? 'light' : 'subtle'}
              >
                {tab.label}
              </Button>
            ))}
          </Group>
        </Group>

        <Group gap="xs" align="center">
          {isAuthenticated && user ? (
            <>
              <Button component={Link} to="/profile" size="xs" variant="light">
                {user.username}
              </Button>
              <Button size="xs" variant="subtle" color="red" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button component={Link} to="/login" size="xs">
              Login
            </Button>
          )}
        </Group>
      </Group>
    </Box>
  );
}

/**
 * Login/Register page. Redirects to the profile once authenticated.
 */
function LoginRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container size="sm" py="xl">
      <AuthForm />
    </Container>
  );
}

/**
 * Profile page, gated behind authentication.
 */
function ProfileRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container size="sm" py="xl">
      <UserProfile />
    </Container>
  );
}

function LeaderboardRoute() {
  return (
    <Container size="md" py="xl">
      <Leaderboard />
    </Container>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const multiplayerRoomId = new URLSearchParams(location.search).get('room') ?? undefined;

  // Re-validate any persisted session against the API on load.
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <Box component="main" style={{ flex: 1, minHeight: 0 }}>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route
            path="/multiplayer"
            element={
              <MultiplayerGame
                roomId={multiplayerRoomId}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/profile" element={<ProfileRoute />} />
          <Route path="/leaderboard" element={<LeaderboardRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

/**
 * Main GO Game Application
 */
export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
