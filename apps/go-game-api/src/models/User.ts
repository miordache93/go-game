import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User interface for TypeScript
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  partykitId?: string;
  elo?: number;
  profile: {
    avatar?: string;
    bio?: string;
    country?: string;
  };
  stats?: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winStreak?: number;
    bestWinStreak?: number;
    lastGameAt?: Date;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStats(won: boolean, drawn: boolean): Promise<void>;
}

/**
 * User schema definition
 */
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password by default in queries
    },
    partykitId: {
      type: String,
      sparse: true,
      unique: true,
      default: null,
    },
    elo: {
      type: Number,
      default: 1500,
      min: 0,
    },
    profile: {
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: '',
      },
      country: {
        type: String,
        default: null,
      },
    },
    stats: {
      gamesPlayed: {
        type: Number,
        default: 0,
        min: 0,
      },
      wins: {
        type: Number,
        default: 0,
        min: 0,
      },
      losses: {
        type: Number,
        default: 0,
        min: 0,
      },
      draws: {
        type: Number,
        default: 0,
        min: 0,
      },
      winStreak: {
        type: Number,
        default: 0,
        min: 0,
      },
      bestWinStreak: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastGameAt: {
        type: Date,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ elo: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ partykitId: 1 });

/**
 * Hash password before saving
 */
UserSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compare password method
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Update user statistics after a game
 */
UserSchema.methods.updateStats = async function (won: boolean, drawn: boolean): Promise<void> {
  if (!this.stats) {
    this.stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      bestWinStreak: 0,
      lastGameAt: new Date()
    };
  }
  
  this.stats.gamesPlayed += 1;
  
  if (drawn) {
    this.stats.draws += 1;
    this.stats.winStreak = 0;
  } else if (won) {
    this.stats.wins += 1;
    this.stats.winStreak = (this.stats.winStreak || 0) + 1;
    if (this.stats.winStreak > (this.stats.bestWinStreak || 0)) {
      this.stats.bestWinStreak = this.stats.winStreak;
    }
  } else {
    this.stats.losses += 1;
    this.stats.winStreak = 0;
  }
  
  this.stats.lastGameAt = new Date();
  
  await this.save();
};

// Create and export the model
const User = model<IUser>('User', UserSchema);
export default User;
export { User };