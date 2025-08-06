import { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Card,
  Stack,
  Alert,
  Tabs,
} from '@mantine/core';
import { IconAlertCircle, IconUser, IconMail, IconLock } from '@tabler/icons-react';
import { useAuthStore, useUIStore } from '@go-game/game';

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const { addNotification } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (mode === 'login') {
        await login(email, password);
        addNotification({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome back!',
        });
      } else {
        await register(username, email, password);
        addNotification({
          type: 'success',
          title: 'Registration Successful',
          message: 'Welcome to Go Game!',
        });
      }
    } catch (err) {
      // Error is already handled in the store
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder maw={400} mx="auto">
      <Tabs value={mode} onChange={(value) => setMode(value as any)}>
        <Tabs.List grow>
          <Tabs.Tab value="login">Login</Tabs.Tab>
          <Tabs.Tab value="register">Register</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" pt="xs">
          <form onSubmit={handleSubmit}>
            <Stack>
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} c="red">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Email"
                placeholder="your@email.com"
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />

              <Button type="submit" loading={isLoading} fullWidth>
                Login
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="xs">
          <form onSubmit={handleSubmit}>
            <Stack>
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} c="red">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Username"
                placeholder="Choose a username"
                leftSection={<IconUser size={16} />}
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                minLength={3}
                maxLength={20}
              />

              <TextInput
                label="Email"
                placeholder="your@email.com"
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                type="email"
              />

              <PasswordInput
                label="Password"
                placeholder="Choose a password"
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                minLength={6}
              />

              <Button type="submit" loading={isLoading} fullWidth>
                Register
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}