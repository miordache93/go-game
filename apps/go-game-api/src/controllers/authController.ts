import { Request, Response } from 'express';
import { User } from '../models/User';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../middleware/auth';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password) {
    throw new ApiError(400, 'Please provide username, email and password');
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email already registered');
    } else {
      throw new ApiError(409, 'Username already taken');
    }
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
  });

  // Generate tokens
  const accessToken = generateToken(user._id.toString(), user.username);
  const refreshToken = generateRefreshToken(user._id.toString());

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ApiError(400, 'Please provide username and password');
  }

  // Find user (include password for comparison)
  const user = await User.findOne({
    $or: [{ email: username }, { username }]
  }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const accessToken = generateToken(user._id.toString(), user.username);
  const refreshToken = generateRefreshToken(user._id.toString());

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.json({
    success: true,
    data: {
      user: userResponse,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token required');
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id.toString(), user.username);
    const newRefreshToken = generateRefreshToken(user._id.toString());

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // In a production app, you might want to:
  // 1. Invalidate the refresh token in a blacklist
  // 2. Clear any server-side sessions
  // 3. Update user's last activity
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  // User is already attached by auth middleware
  const user = (req as any).user;
  
  res.json({
    success: true,
    data: {
      user,
    },
  });
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { bio, country, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'profile.bio': bio,
        'profile.country': country,
        'profile.avatar': avatar,
      },
    },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: {
      user,
    },
  });
});

/**
 * Get user statistics
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  const user = await User.findById(userId).select('stats username');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: {
      stats: user.stats,
      username: user.username,
    },
  });
});