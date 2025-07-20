import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User interface for TypeScript
 */
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profile: {
    avatar?: string;
    bio?: string;
    country?: string;
  };
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDrawn: number;
    eloRating: number;
    rank: string;
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
      gamesWon: {
        type: Number,
        default: 0,
        min: 0,
      },
      gamesLost: {
        type: Number,
        default: 0,
        min: 0,
      },
      gamesDrawn: {
        type: Number,
        default: 0,
        min: 0,
      },
      eloRating: {
        type: Number,
        default: 1500,
        min: 0,
      },
      rank: {
        type: String,
        default: '30k',
        enum: [
          // Kyu ranks (beginner to intermediate)
          '30k', '29k', '28k', '27k', '26k', '25k', '24k', '23k', '22k', '21k',
          '20k', '19k', '18k', '17k', '16k', '15k', '14k', '13k', '12k', '11k',
          '10k', '9k', '8k', '7k', '6k', '5k', '4k', '3k', '2k', '1k',
          // Dan ranks (advanced)
          '1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d',
        ],
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
UserSchema.index({ 'stats.eloRating': -1 });
UserSchema.index({ createdAt: -1 });

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
  this.stats.gamesPlayed += 1;
  
  if (drawn) {
    this.stats.gamesDrawn += 1;
  } else if (won) {
    this.stats.gamesWon += 1;
  } else {
    this.stats.gamesLost += 1;
  }
  
  // Update rank based on ELO rating
  this.stats.rank = calculateRank(this.stats.eloRating);
  
  await this.save();
};

/**
 * Calculate rank based on ELO rating
 */
function calculateRank(elo: number): string {
  // Simple rank calculation based on ELO
  if (elo < 800) return '30k';
  if (elo < 900) return '25k';
  if (elo < 1000) return '20k';
  if (elo < 1100) return '15k';
  if (elo < 1200) return '10k';
  if (elo < 1300) return '5k';
  if (elo < 1400) return '1k';
  if (elo < 1600) return '1d';
  if (elo < 1800) return '2d';
  if (elo < 2000) return '3d';
  if (elo < 2200) return '4d';
  if (elo < 2400) return '5d';
  if (elo < 2600) return '6d';
  if (elo < 2800) return '7d';
  if (elo < 3000) return '8d';
  return '9d';
}

// Create and export the model
export const User = model<IUser>('User', UserSchema);