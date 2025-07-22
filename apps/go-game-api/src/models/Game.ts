import { Schema, model, Document, Types } from 'mongoose';
import { 
  GameState, 
  BoardSize, 
  Player, 
  Position,
  MoveType
} from '@go-game/types';

/**
 * Game document interface
 */
export interface IGame extends Document {
  blackPlayer: Types.ObjectId;
  whitePlayer: Types.ObjectId;
  boardSize: BoardSize;
  komi: number;
  gameState: GameState;
  moves: IMove[];
  status: 'waiting' | 'active' | 'finished';
  winner?: Player | 'draw';
  resultReason?: 'completion' | 'resignation' | 'timeout' | 'agreement';
  isPublic: boolean;
  roomCode?: string;
  spectators: Types.ObjectId[];
  timeSettings?: {
    mainTime: number;
    byoyomi: number;
    periods: number;
  };
  playerTimes: {
    black: {
      mainTimeRemaining: number;
      periodsRemaining: number;
      inByoyomi: boolean;
    };
    white: {
      mainTimeRemaining: number;
      periodsRemaining: number;
      inByoyomi: boolean;
    };
  };
  chat: IChat[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

/**
 * Move subdocument interface
 */
export interface IMove {
  moveNumber: number;
  player: Player;
  type: MoveType;
  position?: Position;
  capturedStones?: Position[];
  timestamp: Date;
  thinkingTime: number; // Time taken for this move in seconds
}

/**
 * Chat message subdocument interface
 */
export interface IChat {
  player: Types.ObjectId;
  message: string;
  timestamp: Date;
}

/**
 * Move subdocument schema
 */
const MoveSchema = new Schema<IMove>(
  {
    moveNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    player: {
      type: String,
      required: true,
      enum: Object.values(Player),
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(MoveType),
    },
    position: {
      x: { type: Number, min: 0, max: 18 },
      y: { type: Number, min: 0, max: 18 },
    },
    capturedStones: [{
      x: { type: Number, min: 0, max: 18 },
      y: { type: Number, min: 0, max: 18 },
    }],
    timestamp: {
      type: Date,
      default: Date.now,
    },
    thinkingTime: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Chat subdocument schema
 */
const ChatSchema = new Schema<IChat>(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Game schema definition
 */
const GameSchema = new Schema<IGame>(
  {
    blackPlayer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    whitePlayer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    boardSize: {
      type: Number,
      required: true,
      enum: Object.values(BoardSize).filter(v => typeof v === 'number'),
    },
    komi: {
      type: Number,
      required: true,
      default: 6.5,
    },
    gameState: {
      type: Schema.Types.Mixed,
      required: true,
    },
    moves: {
      type: [MoveSchema],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['waiting', 'active', 'finished'],
      default: 'waiting',
    },
    winner: {
      type: String,
      enum: [...Object.values(Player), 'draw'],
    },
    resultReason: {
      type: String,
      enum: ['completion', 'resignation', 'timeout', 'agreement'],
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    roomCode: {
      type: String,
      sparse: true,
      unique: true,
    },
    spectators: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    timeSettings: {
      mainTime: { type: Number, default: 1800 }, // 30 minutes
      byoyomi: { type: Number, default: 30 }, // 30 seconds
      periods: { type: Number, default: 3 },
    },
    playerTimes: {
      black: {
        mainTimeRemaining: { type: Number, default: 1800 },
        periodsRemaining: { type: Number, default: 3 },
        inByoyomi: { type: Boolean, default: false },
      },
      white: {
        mainTimeRemaining: { type: Number, default: 1800 },
        periodsRemaining: { type: Number, default: 3 },
        inByoyomi: { type: Boolean, default: false },
      },
    },
    chat: {
      type: [ChatSchema],
      default: [],
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
GameSchema.index({ blackPlayer: 1, createdAt: -1 });
GameSchema.index({ whitePlayer: 1, createdAt: -1 });
GameSchema.index({ status: 1, createdAt: -1 });
GameSchema.index({ roomCode: 1 });
GameSchema.index({ 'gameState.phase': 1 });

/**
 * Generate a unique room code for private games
 */
GameSchema.methods.generateRoomCode = function(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

/**
 * Check if a user can join this game
 */
GameSchema.methods.canJoin = function(userId: string): boolean {
  return this.status === 'waiting' && 
         !this.whitePlayer && 
         this.blackPlayer.toString() !== userId;
};

/**
 * Check if a user is a player in this game
 */
GameSchema.methods.isPlayer = function(userId: string): boolean {
  return this.blackPlayer.toString() === userId || 
         (this.whitePlayer && this.whitePlayer.toString() === userId);
};

/**
 * Get player color for a user
 */
GameSchema.methods.getPlayerColor = function(userId: string): Player | null {
  if (this.blackPlayer.toString() === userId) return Player.BLACK;
  if (this.whitePlayer && this.whitePlayer.toString() === userId) return Player.WHITE;
  return null;
};

// Create and export the model
export const Game = model<IGame>('Game', GameSchema);