/**
 * GO Game Utility Functions
 *
 * This file contains common utility functions used throughout the GO game application.
 * These include board manipulation, position calculations, and other helper functions.
 */

import {
  Position,
  BoardSize,
  Board,
  Intersection,
  Stone,
  Player,
  DIRECTIONS,
  isValidPosition,
  positionsEqual,
} from '@go-game/types';

// ==========================================
// BOARD UTILITIES
// ==========================================

/**
 * Creates an empty board of the specified size
 */
export const createEmptyBoard = (size: BoardSize): Board => {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));
};

/**
 * Creates a deep copy of a board
 */
export const cloneBoard = (board: Board): Board => {
  return board.map((row) =>
    row.map((intersection) =>
      intersection
        ? { ...intersection, position: { ...intersection.position } }
        : null
    )
  );
};

/**
 * Gets the intersection at a specific position
 */
export const getIntersection = (
  board: Board,
  position: Position
): Intersection => {
  if (!isValidPosition(position, board.length as BoardSize)) {
    return null;
  }
  return board[position.y][position.x];
};

/**
 * Sets a stone at a specific position on the board
 */
export const setIntersection = (
  board: Board,
  position: Position,
  stone: Stone | null
): Board => {
  if (!isValidPosition(position, board.length as BoardSize)) {
    throw new Error('Invalid position');
  }

  const newBoard = cloneBoard(board);
  newBoard[position.y][position.x] = stone;
  return newBoard;
};

/**
 * Gets all adjacent positions to a given position
 */
export const getAdjacentPositions = (
  position: Position,
  boardSize: BoardSize
): Position[] => {
  return DIRECTIONS.map((direction) => ({
    x: position.x + direction.dx,
    y: position.y + direction.dy,
  })).filter((pos) => isValidPosition(pos, boardSize));
};

/**
 * Gets all empty adjacent positions (liberties) to a given position
 */
export const getLiberties = (board: Board, position: Position): Position[] => {
  const boardSize = board.length as BoardSize;
  return getAdjacentPositions(position, boardSize).filter(
    (pos) => getIntersection(board, pos) === null
  );
};

/**
 * Checks if a position is empty
 */
export const isEmpty = (board: Board, position: Position): boolean => {
  return getIntersection(board, position) === null;
};

/**
 * Checks if a position contains a stone of a specific player
 */
export const hasStoneOfPlayer = (
  board: Board,
  position: Position,
  player: Player
): boolean => {
  const intersection = getIntersection(board, position);
  return intersection !== null && intersection.player === player;
};

// ==========================================
// GROUP UTILITIES
// ==========================================

/**
 * Gets all stones in the same group (connected stones of same color) as the stone at given position
 */
export const getGroup = (board: Board, position: Position): Set<Position> => {
  const group = new Set<Position>();
  const stone = getIntersection(board, position);

  if (!stone) {
    return group;
  }

  const visited = new Set<string>();
  const stack = [position];
  const boardSize = board.length as BoardSize;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    group.add(current);

    // Add adjacent stones of same color
    const adjacentPositions = getAdjacentPositions(current, boardSize);
    for (const adjacent of adjacentPositions) {
      const adjacentStone = getIntersection(board, adjacent);
      if (adjacentStone && adjacentStone.player === stone.player) {
        const adjacentKey = `${adjacent.x},${adjacent.y}`;
        if (!visited.has(adjacentKey)) {
          stack.push(adjacent);
        }
      }
    }
  }

  return group;
};

/**
 * Gets all liberties (empty adjacent positions) for a group of stones
 */
export const getGroupLiberties = (
  board: Board,
  group: Set<Position>
): Set<Position> => {
  const liberties = new Set<Position>();
  const boardSize = board.length as BoardSize;

  for (const position of group) {
    const adjacentPositions = getAdjacentPositions(position, boardSize);
    for (const adjacent of adjacentPositions) {
      if (isEmpty(board, adjacent)) {
        liberties.add(adjacent);
      }
    }
  }

  return liberties;
};

/**
 * Checks if a group of stones has any liberties (is alive)
 */
export const hasLiberties = (board: Board, group: Set<Position>): boolean => {
  return getGroupLiberties(board, group).size > 0;
};

/**
 * Gets all groups of stones that would be captured by placing a stone at the given position
 */
export const getCapturedGroups = (
  board: Board,
  position: Position,
  player: Player
): Set<Position>[] => {
  const capturedGroups: Set<Position>[] = [];
  const boardSize = board.length as BoardSize;
  const adjacentPositions = getAdjacentPositions(position, boardSize);

  for (const adjacent of adjacentPositions) {
    const adjacentStone = getIntersection(board, adjacent);

    // Check if adjacent position has opponent's stone
    if (adjacentStone && adjacentStone.player !== player) {
      const group = getGroup(board, adjacent);

      // Simulate placing the stone and check if group has liberties
      const tempBoard = setIntersection(board, position, {
        position,
        player,
        moveNumber: 0, // Temporary value
      });

      if (!hasLiberties(tempBoard, group)) {
        capturedGroups.push(group);
      }
    }
  }

  return capturedGroups;
};

// ==========================================
// MOVE VALIDATION UTILITIES
// ==========================================

/**
 * Checks if placing a stone at the given position would be suicide
 * (would capture own group without capturing opponent groups)
 */
export const isSuicideMove = (
  board: Board,
  position: Position,
  player: Player
): boolean => {
  // If the move captures opponent groups, it's not suicide
  const capturedGroups = getCapturedGroups(board, position, player);
  if (capturedGroups.length > 0) {
    return false;
  }

  // Place the stone temporarily
  const tempBoard = setIntersection(board, position, {
    position,
    player,
    moveNumber: 0,
  });

  // Check if the new stone's group has liberties
  const newGroup = getGroup(tempBoard, position);
  return !hasLiberties(tempBoard, newGroup);
};

/**
 * Checks if a move violates the Ko rule
 * Ko rule: A player cannot make a move that returns the game to the position just before the opponent's last move
 */
export const violatesKoRule = (
  board: Board,
  position: Position,
  koPosition: Position | null
): boolean => {
  return koPosition !== null && positionsEqual(position, koPosition);
};

// ==========================================
// POSITION UTILITIES
// ==========================================

/**
 * Converts a position to a string key for use in Sets and Maps
 */
export const positionToKey = (position: Position): string => {
  return `${position.x},${position.y}`;
};

/**
 * Converts a string key back to a position
 */
export const keyToPosition = (key: string): Position => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

/**
 * Gets all positions on the board
 */
export const getAllPositions = (boardSize: BoardSize): Position[] => {
  const positions: Position[] = [];
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      positions.push({ x, y });
    }
  }
  return positions;
};

/**
 * Gets all empty positions on the board
 */
export const getEmptyPositions = (board: Board): Position[] => {
  const boardSize = board.length as BoardSize;
  return getAllPositions(boardSize).filter((pos) => isEmpty(board, pos));
};

/**
 * Gets all positions containing stones of a specific player
 */
export const getPlayerPositions = (
  board: Board,
  player: Player
): Position[] => {
  const boardSize = board.length as BoardSize;
  return getAllPositions(boardSize).filter((pos) =>
    hasStoneOfPlayer(board, pos, player)
  );
};

// ==========================================
// GAME STATE UTILITIES
// ==========================================

/**
 * Generates a unique ID for a move
 */
export const generateMoveId = (): string => {
  return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generates a unique ID for a game
 */
export const generateGameId = (): string => {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calculates the Manhattan distance between two positions
 */
export const manhattanDistance = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

/**
 * Calculates the Euclidean distance between two positions
 */
export const euclideanDistance = (a: Position, b: Position): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

/**
 * Formats a position for display (e.g., "A1", "B2")
 */
export const formatPosition = (position: Position): string => {
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; // Note: 'I' is skipped in GO notation
  return `${letters[position.x]}${position.y + 1}`;
};

/**
 * Parses a position from display format (e.g., "A1" -> {x: 0, y: 0})
 */
export const parsePosition = (positionStr: string): Position | null => {
  if (positionStr.length < 2) return null;

  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  const letter = positionStr[0].toUpperCase();
  const number = parseInt(positionStr.slice(1));

  const x = letters.indexOf(letter);
  const y = number - 1;

  if (x === -1 || isNaN(y) || y < 0) return null;

  return { x, y };
};
