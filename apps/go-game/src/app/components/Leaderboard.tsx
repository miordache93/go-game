import { Table, Card, Text, Badge, Loader, Group, Select } from '@mantine/core';
import { useLeaderboard } from '@go-game/game';
import { useState } from 'react';

export function Leaderboard() {
  const [timeframe, setTimeframe] = useState<'all' | 'weekly' | 'monthly'>('all');
  const { data, isLoading, error } = useLeaderboard(100, 0, timeframe);

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
        <Text c="red">Failed to load leaderboard</Text>
      </Card>
    );
  }

  const rows = data?.data?.leaderboard?.map((player: any) => (
    <tr key={player.username}>
      <td>
        <Badge size="lg" variant="filled">
          #{player.rank}
        </Badge>
      </td>
      <td>{player.username}</td>
      <td>
        <Badge c="blue">{player.elo}</Badge>
      </td>
      <td>{player.gamesPlayed}</td>
      <td>
        <Text c="green">{player.wins}</Text>
      </td>
      <td>
        <Text c="red">{player.losses}</Text>
      </td>
      <td>
        <Badge color={player.winRate >= 50 ? 'green' : 'red'}>
          {player.winRate}%
        </Badge>
      </td>
    </tr>
  ));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          Leaderboard
        </Text>
        <Select
          value={timeframe}
          onChange={(value) => setTimeframe(value as any)}
          data={[
            { value: 'all', label: 'All Time' },
            { value: 'weekly', label: 'This Week' },
            { value: 'monthly', label: 'This Month' },
          ]}
        />
      </Group>

      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>ELO</th>
            <th>Games</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </Card>
  );
}