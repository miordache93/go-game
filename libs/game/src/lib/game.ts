/**
 * GO Game Engine
 *
 * This is the core game engine that handles all GO game logic including:
 * - Game state management
 * - Move validation and execution
 * - Capture detection
 * - Ko rule enforcement
 * - Game end conditions
 * - Scoring and territory calculation
 */

import {
  GameState,
  GameSettings,
  Move,
  MoveResult,
  MoveType,
  Player,
  Position,
  GamePhase,
  Stone,
  getOpponent,
} from '@go-game/types';

import {
  DEFAULT_KOMI,
  MAX_CONSECUTIVE_PASSES,
  ERROR_MESSAGES,
} from '@go-game/constants';

import {
  createEmptyBoard,
  cloneBoard,
  setIntersection,
  isEmpty,
  getCapturedGroups,
  isSuicideMove,
  violatesKoRule,
  generateGameId,
  generateMoveId,
  getGroup,
} from '@go-game/utils';

import {
  ScoringState,
  createScoringState,
  toggleDeadGroup,
  calculateFinalScore,
} from './scoring';

/**
 * Main Game Engine class that manages the complete game state and enforces rules
 */
export class GameEngine {
  private gameState: GameState;
  private scoringState: ScoringState;

  constructor(settings: GameSettings) {
    this.gameState = this.createInitialGameState(settings);
    this.scoringState = createScoringState();
  }

  /**
   * Creates the initial game state from game settings
   */
  private createInitialGameState(settings: GameSettings): GameState {
    const board = createEmptyBoard(settings.boardSize);
    const komi = settings.komi || DEFAULT_KOMI[settings.boardSize];

    return {
      id: generateGameId(),
      board,
      boardSize: settings.boardSize,
      currentPlayer: Player.BLACK, // Black always plays first
      phase: GamePhase.PLAYING,
      moveHistory: [],
      capturedStones: {
        [Player.BLACK]: [],
        [Player.WHITE]: [],
      },
      koPosition: null,
      passCount: 0,
      score: null,
      komi,
      timeSettings: settings.timeSettings,
    };
  }

  /**
   * Gets the current game state (immutable copy)
   */
  public getGameState(): GameState {
    return {
      ...this.gameState,
      board: cloneBoard(this.gameState.board),
      moveHistory: [...this.gameState.moveHistory],
      capturedStones: {
        [Player.BLACK]: [...this.gameState.capturedStones[Player.BLACK]],
        [Player.WHITE]: [...this.gameState.capturedStones[Player.WHITE]],
      },
    };
  }

  /**
   * Attempts to make a move and returns the result
   */
  public makeMove(
    player: Player,
    type: MoveType,
    position?: Position
  ): MoveResult {
    // Validate basic move conditions
    const validationResult = this.validateMove(player, type, position);
    if (!validationResult.success) {
      return validationResult;
    }

    // Create the move object
    const move: Move = {
      id: generateMoveId(),
      player,
      type,
      position,
      timestamp: new Date(),
      moveNumber: this.gameState.moveHistory.length + 1,
    };

    // Execute the move based on type
    switch (type) {
      case MoveType.PLACE_STONE:
        return this.executePlaceStone(move);

      case MoveType.PASS:
        return this.executePass(move);

      case MoveType.RESIGN:
        return this.executeResign(move);

      default:
        return {
          success: false,
          error: 'Invalid move type',
        };
    }
  }

  /**
   * Validates basic move conditions
   */
  private validateMove(
    player: Player,
    type: MoveType,
    position?: Position
  ): MoveResult {
    // Check if game is finished
    if (this.gameState.phase === GamePhase.FINISHED) {
      return {
        success: false,
        error: ERROR_MESSAGES.GAME_FINISHED,
      };
    }

    // Check if it's the player's turn
    if (this.gameState.currentPlayer !== player) {
      return {
        success: false,
        error: ERROR_MESSAGES.WRONG_TURN,
      };
    }

    // Validate position for stone placement
    if (type === MoveType.PLACE_STONE) {
      if (!position) {
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_POSITION,
        };
      }

      // Check if position is valid
      if (
        position.x < 0 ||
        position.x >= this.gameState.boardSize ||
        position.y < 0 ||
        position.y >= this.gameState.boardSize
      ) {
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_POSITION,
        };
      }

      // Check if position is empty
      if (!isEmpty(this.gameState.board, position)) {
        return {
          success: false,
          error: ERROR_MESSAGES.POSITION_OCCUPIED,
        };
      }

      // Check Ko rule
      if (
        violatesKoRule(
          this.gameState.board,
          position,
          this.gameState.koPosition
        )
      ) {
        return {
          success: false,
          error: ERROR_MESSAGES.KO_VIOLATION,
        };
      }

      // Check suicide rule
      if (isSuicideMove(this.gameState.board, position, player)) {
        return {
          success: false,
          error: ERROR_MESSAGES.SUICIDE_MOVE,
        };
      }
    }

    return { success: true };
  }

  /**
   * Executes a stone placement move
   */
  private executePlaceStone(move: Move): MoveResult {
    if (!move.position) {
      return { success: false, error: 'Position required for stone placement' };
    }

    // Create the stone
    const stone: Stone = {
      position: move.position,
      player: move.player,
      moveNumber: move.moveNumber,
    };

    // Place the stone on the board
    let newBoard = setIntersection(this.gameState.board, move.position, stone);

    // Check for captures
    const capturedGroups = getCapturedGroups(
      this.gameState.board,
      move.position,
      move.player
    );
    const capturedPositions: Position[] = [];

    // Remove captured stones
    for (const group of capturedGroups) {
      for (const position of group) {
        newBoard = setIntersection(newBoard, position, null);
        capturedPositions.push(position);
      }
    }

    // Update captured stones count
    const newCapturedStones = { ...this.gameState.capturedStones };
    newCapturedStones[move.player].push(...capturedPositions);

    // Determine new Ko position (single stone capture creates Ko situation)
    let newKoPosition: Position | null = null;
    if (capturedPositions.length === 1) {
      // Check if this was a Ko capture (captured stone was alone and capturing stone would also be captured)
      const capturedPosition = capturedPositions[0];
      const capturingGroup = getGroup(newBoard, move.position);

      if (capturingGroup.size === 1) {
        // This might be a Ko situation - the captured position becomes Ko position
        newKoPosition = capturedPosition;
      }
    }

    // Create new game state
    const newGameState: GameState = {
      ...this.gameState,
      board: newBoard,
      currentPlayer: getOpponent(move.player),
      moveHistory: [...this.gameState.moveHistory, move],
      capturedStones: newCapturedStones,
      koPosition: newKoPosition,
      passCount: 0, // Reset pass count on stone placement
      lastMove: move,
    };

    // Update internal state
    this.gameState = newGameState;

    return {
      success: true,
      move,
      capturedStones: capturedPositions,
      newGameState: this.getGameState(),
    };
  }

  /**
   * Executes a pass move
   */
  private executePass(move: Move): MoveResult {
    const newPassCount = this.gameState.passCount + 1;
    let newPhase = this.gameState.phase;

    // Check if game should end (two consecutive passes)
    if (newPassCount >= MAX_CONSECUTIVE_PASSES) {
      newPhase = GamePhase.SCORING;
    }

    // Create new game state
    const newGameState: GameState = {
      ...this.gameState,
      currentPlayer: getOpponent(move.player),
      phase: newPhase,
      moveHistory: [...this.gameState.moveHistory, move],
      passCount: newPassCount,
      koPosition: null, // Clear Ko position on pass
      lastMove: move,
    };

    // Update internal state
    this.gameState = newGameState;

    return {
      success: true,
      move,
      newGameState: this.getGameState(),
    };
  }

  /**
   * Executes a resign move
   */
  private executeResign(move: Move): MoveResult {
    // Determine winner (opponent of resigning player)
    const winner = getOpponent(move.player);

    // Create final score with resignation
    const finalScore = {
      black: {
        territory: 0,
        captures: this.gameState.capturedStones[Player.BLACK].length,
        total: 0,
      },
      white: {
        territory: 0,
        captures: this.gameState.capturedStones[Player.WHITE].length,
        komi: this.gameState.komi,
        total: 0,
      },
      winner,
    };

    // Create new game state
    const newGameState: GameState = {
      ...this.gameState,
      phase: GamePhase.FINISHED,
      moveHistory: [...this.gameState.moveHistory, move],
      score: finalScore,
      lastMove: move,
    };

    // Update internal state
    this.gameState = newGameState;

    return {
      success: true,
      move,
      newGameState: this.getGameState(),
    };
  }

  /**
   * Checks if the current game state is valid
   */
  public validateGameState(): boolean {
    try {
      // Check board dimensions
      if (this.gameState.board.length !== this.gameState.boardSize) {
        return false;
      }

      // Check that all rows have correct width
      for (const row of this.gameState.board) {
        if (row.length !== this.gameState.boardSize) {
          return false;
        }
      }

      // Check move history consistency
      if (this.gameState.moveHistory.length > 0) {
        const lastMove =
          this.gameState.moveHistory[this.gameState.moveHistory.length - 1];
        if (this.gameState.currentPlayer === lastMove.player) {
          // Current player should be different from last move player (unless game ended)
          if (
            this.gameState.phase !== GamePhase.FINISHED &&
            this.gameState.phase !== GamePhase.SCORING
          ) {
            return false;
          }
        }
      }

      // Check captured stones count consistency
      const blackCaptured = this.gameState.capturedStones[Player.BLACK].length;
      const whiteCaptured = this.gameState.capturedStones[Player.WHITE].length;

      if (blackCaptured < 0 || whiteCaptured < 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the current player
   */
  public getCurrentPlayer(): Player {
    return this.gameState.currentPlayer;
  }

  /**
   * Gets the current game phase
   */
  public getGamePhase(): GamePhase {
    return this.gameState.phase;
  }

  /**
   * Gets the move history
   */
  public getMoveHistory(): Move[] {
    return [...this.gameState.moveHistory];
  }

  /**
   * Gets the last move made
   */
  public getLastMove(): Move | undefined {
    return this.gameState.lastMove;
  }

  /**
   * Checks if the game has ended
   */
  public isGameFinished(): boolean {
    return this.gameState.phase === GamePhase.FINISHED;
  }

  /**
   * Gets captured stones count for each player
   */
  public getCapturedStones(): { black: number; white: number } {
    return {
      black: this.gameState.capturedStones[Player.BLACK].length,
      white: this.gameState.capturedStones[Player.WHITE].length,
    };
  }

  /**
   * Creates a new game with the same settings
   */
  public newGame(settings?: Partial<GameSettings>): GameEngine {
    const currentSettings: GameSettings = {
      boardSize: this.gameState.boardSize,
      komi: this.gameState.komi,
      timeSettings: this.gameState.timeSettings,
      gameType: 'local', // Default
      players: {
        black: 'Black Player',
        white: 'White Player',
      },
    };

    const newSettings = { ...currentSettings, ...settings };
    return new GameEngine(newSettings);
  }

  /**
   * Loads a game state (for resuming games or replaying)
   */
  public loadGameState(gameState: GameState): void {
    // Validate the provided game state
    const tempEngine = new GameEngine({
      boardSize: gameState.boardSize,
      komi: gameState.komi,
      gameType: 'local',
      players: { black: 'Black', white: 'White' },
    });
    tempEngine.gameState = gameState;

    if (!tempEngine.validateGameState()) {
      throw new Error('Invalid game state provided');
    }

    this.gameState = gameState;
  }

  /**
   * Marks a group of stones as dead or alive during scoring phase
   * Returns true if successful
   */
  public markDeadStones(position: Position): boolean {
    // Only allowed during scoring phase
    if (this.gameState.phase !== GamePhase.SCORING) {
      return false;
    }

    // Check if there's a stone at this position
    const stone = this.gameState.board[position.y][position.x];
    if (!stone) {
      return false;
    }

    // Toggle the dead/alive status of the group
    toggleDeadGroup(
      this.gameState.board,
      position,
      this.scoringState.deadStones
    );

    return true;
  }

  /**
   * Gets the current dead stones during scoring
   */
  public getDeadStones(): Set<string> {
    return new Set(this.scoringState.deadStones);
  }

  /**
   * Finalizes the game and calculates the score
   * Can only be called during scoring phase
   */
  public finalizeGame(): MoveResult {
    if (this.gameState.phase !== GamePhase.SCORING) {
      return {
        success: false,
        error: 'Can only finalize game during scoring phase',
      };
    }

    // Calculate final score
    const finalScore = calculateFinalScore(
      this.gameState.board,
      this.gameState.capturedStones[Player.BLACK],
      this.gameState.capturedStones[Player.WHITE],
      this.gameState.komi,
      this.scoringState.deadStones
    );

    // Create new game state
    const newGameState: GameState = {
      ...this.gameState,
      phase: GamePhase.FINISHED,
      score: finalScore,
    };

    // Update internal state
    this.gameState = newGameState;

    return {
      success: true,
      newGameState: this.getGameState(),
    };
  }

  /**
   * Returns to playing phase from scoring phase
   * Used when players disagree on dead stones
   */
  public resumePlaying(): MoveResult {
    if (this.gameState.phase !== GamePhase.SCORING) {
      return {
        success: false,
        error: 'Can only resume from scoring phase',
      };
    }

    // Clear scoring state
    this.scoringState = createScoringState();

    // Reset pass count to allow more moves
    const newGameState: GameState = {
      ...this.gameState,
      phase: GamePhase.PLAYING,
      passCount: 0,
    };

    // Update internal state
    this.gameState = newGameState;

    return {
      success: true,
      newGameState: this.getGameState(),
    };
  }

  /**
   * Gets the current score if game is in scoring or finished phase
   */
  public getCurrentScore() {
    if (this.gameState.phase === GamePhase.SCORING) {
      // Calculate temporary score for preview
      return calculateFinalScore(
        this.gameState.board,
        this.gameState.capturedStones[Player.BLACK],
        this.gameState.capturedStones[Player.WHITE],
        this.gameState.komi,
        this.scoringState.deadStones
      );
    }

    return this.gameState.score;
  }
}
