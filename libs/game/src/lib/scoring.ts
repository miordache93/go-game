/**
 * GO Game Scoring Module
 *
 * Handles territory calculation, dead stone marking, and final scoring
 * Following Japanese rules for simplicity
 */

import {
  Board,
  Position,
  Player,
  Territory,
  GameScore,
  isValidPosition,
  BoardSize,
  DIRECTIONS,
} from '@go-game/types';

/**
 * Marks stones as dead or alive for scoring
 * Dead stones are removed from territory calculation
 */
export interface ScoringState {
  deadStones: Set<string>; // Set of position keys "x,y"
  territories: Territory[];
}

/**
 * Creates a position key for Set operations
 */
const positionKey = (pos: Position): string => `${pos.x},${pos.y}`;

/**
 * Parses a position key back to Position
 */
const parsePositionKey = (key: string): Position => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

/**
 * Finds all connected empty positions from a starting point
 * Returns the territory and which player controls it (if any)
 */
function findTerritory(
  board: Board,
  start: Position,
  visited: Set<string>,
  deadStones: Set<string>
): Territory {
  const positions = new Set<Position>();
  const stack = [start];
  let controlledBy: Player | null = null;
  const adjacentPlayers = new Set<Player>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = positionKey(current);

    if (visited.has(key)) continue;
    visited.add(key);

    const intersection = board[current.y][current.x];

    // If it's a dead stone, treat as empty
    if (intersection && deadStones.has(key)) {
      positions.add(current);
    } else if (!intersection) {
      // Empty intersection
      positions.add(current);
    } else {
      // Hit a live stone - mark which player borders this territory
      adjacentPlayers.add(intersection.player);
      continue;
    }

    // Check adjacent positions
    for (const dir of DIRECTIONS) {
      const next: Position = {
        x: current.x + dir.dx,
        y: current.y + dir.dy,
      };

      if (isValidPosition(next, board.length as BoardSize)) {
        const nextKey = positionKey(next);
        if (!visited.has(nextKey)) {
          stack.push(next);
        }
      }
    }
  }

  // Territory is controlled by a player only if all adjacent stones are that player's
  if (adjacentPlayers.size === 1) {
    controlledBy = Array.from(adjacentPlayers)[0];
  }

  return {
    positions,
    controlledBy,
    points: controlledBy ? positions.size : 0,
  };
}

/**
 * Calculates all territories on the board
 */
export function calculateTerritories(
  board: Board,
  deadStones: Set<string> = new Set()
): Territory[] {
  const territories: Territory[] = [];
  const visited = new Set<string>();
  const boardSize = board.length;

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const pos = { x, y };
      const key = positionKey(pos);

      if (visited.has(key)) continue;

      const intersection = board[y][x];

      // Start territory search from empty positions or dead stones
      if (!intersection || deadStones.has(key)) {
        const territory = findTerritory(board, pos, visited, deadStones);
        if (territory.positions.size > 0) {
          territories.push(territory);
        }
      } else {
        // Mark live stones as visited
        visited.add(key);
      }
    }
  }

  return territories;
}

/**
 * Toggles a group of stones as dead/alive
 * Returns all stones in the group that were toggled
 */
export function toggleDeadGroup(
  board: Board,
  position: Position,
  deadStones: Set<string>
): Set<string> {
  const stone = board[position.y][position.x];
  if (!stone) return new Set();

  const group = findGroup(board, position);
  const toggledStones = new Set<string>();

  for (const pos of group) {
    const key = positionKey(pos);
    if (deadStones.has(key)) {
      deadStones.delete(key);
    } else {
      deadStones.add(key);
    }
    toggledStones.add(key);
  }

  return toggledStones;
}

/**
 * Finds all stones in a group connected to the given position
 */
function findGroup(board: Board, start: Position): Set<Position> {
  const stone = board[start.y][start.x];
  if (!stone) return new Set();

  const group = new Set<Position>();
  const stack = [start];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = positionKey(current);

    if (visited.has(key)) continue;
    visited.add(key);

    const currentStone = board[current.y][current.x];
    if (!currentStone || currentStone.player !== stone.player) continue;

    group.add(current);

    // Check adjacent positions
    for (const dir of DIRECTIONS) {
      const next: Position = {
        x: current.x + dir.dx,
        y: current.y + dir.dy,
      };

      if (isValidPosition(next, board.length as BoardSize)) {
        stack.push(next);
      }
    }
  }

  return group;
}

/**
 * Calculates the final game score
 */
export function calculateFinalScore(
  board: Board,
  capturedByBlack: Position[],
  capturedByWhite: Position[],
  komi: number,
  deadStones: Set<string> = new Set()
): GameScore {
  // Calculate territories
  const territories = calculateTerritories(board, deadStones);

  // Count territory points
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (const territory of territories) {
    if (territory.controlledBy === Player.BLACK) {
      blackTerritory += territory.points;
    } else if (territory.controlledBy === Player.WHITE) {
      whiteTerritory += territory.points;
    }
  }

  // Count stones on board (alive stones)
  let blackStones = 0;
  let whiteStones = 0;

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0].length; x++) {
      const stone = board[y][x];
      if (stone && !deadStones.has(positionKey({ x, y }))) {
        if (stone.player === Player.BLACK) {
          blackStones++;
        } else {
          whiteStones++;
        }
      }
    }
  }

  // Count dead stones as captures
  let deadBlackStones = 0;
  let deadWhiteStones = 0;

  for (const key of deadStones) {
    const pos = parsePositionKey(key);
    const stone = board[pos.y][pos.x];
    if (stone) {
      if (stone.player === Player.BLACK) {
        deadBlackStones++;
      } else {
        deadWhiteStones++;
      }
    }
  }

  // Calculate final scores (Japanese rules: territory + captures)
  const blackCaptures = capturedByBlack.length + deadWhiteStones;
  const whiteCaptures = capturedByWhite.length + deadBlackStones;

  const blackTotal = blackTerritory + blackCaptures;
  const whiteTotal = whiteTerritory + whiteCaptures + komi;

  return {
    black: {
      territory: blackTerritory,
      captures: blackCaptures,
      total: blackTotal,
    },
    white: {
      territory: whiteTerritory,
      captures: whiteCaptures,
      komi,
      total: whiteTotal,
    },
    winner:
      blackTotal > whiteTotal
        ? Player.BLACK
        : whiteTotal > blackTotal
        ? Player.WHITE
        : null, // Tie
  };
}

/**
 * Creates an initial scoring state
 */
export function createScoringState(): ScoringState {
  return {
    deadStones: new Set(),
    territories: [],
  };
}
