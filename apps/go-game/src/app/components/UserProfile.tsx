import { Card, Avatar, Text, Group, Stack, Badge, Button, Loader } from '@mantine/core';
import { IconTrophy, IconChartBar, IconLogout } from '@tabler/icons-react';
import { useAuthStore, useUserStats } from '@go-game/game';

export function UserProfile() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { data: stats, isLoading, error } = useUserStats();

  if (!isAuthenticated || !user) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>Please log in to view your profile</Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Card>
    );
  }

  if (error) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text c="red">Failed to load stats</Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <Avatar size="lg" radius="xl">
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text size="lg" fw={500}>
              {user.username}
            </Text>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </div>
        </Group>
        <Button
          variant="subtle"
          c="red"
          leftSection={<IconLogout size={16} />}
          onClick={logout}
        >
          Logout
        </Button>
      </Group>

      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconTrophy size={20} />
            <Text fw={500}>ELO Rating</Text>
          </Group>
          <Badge size="lg" variant="filled">
            {stats?.data?.elo || user.elo || 1500}
          </Badge>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <IconChartBar size={20} />
            <Text fw={500}>Rank</Text>
          </Group>
          <Badge size="lg" c="teal">
            {stats?.data?.rank || '5k'}
          </Badge>
        </Group>

        <Card.Section withBorder inheritPadding py="xs" mt="sm">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">
                Total Games
              </Text>
              <Text fw={500}>{stats?.data?.totalGames || 0}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Win Rate
              </Text>
              <Text fw={500}>{stats?.data?.winRate || 0}%</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Current Streak
              </Text>
              <Text fw={500}>{stats?.data?.currentStreak || 0}</Text>
            </div>
          </Group>
        </Card.Section>

        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500} c="green">
              Wins: {stats?.data?.wins || 0}
            </Text>
            <Text size="sm" fw={500} c="red">
              Losses: {stats?.data?.losses || 0}
            </Text>
            <Text size="sm" fw={500} c="dimmed">
              Draws: {stats?.data?.draws || 0}
            </Text>
          </Group>
        </Card.Section>
      </Stack>
    </Card>
  );
}