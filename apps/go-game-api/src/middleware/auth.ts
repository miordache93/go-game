import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { RevokedToken } from '../models/RevokedToken';
import { config } from '../config/env';

/**
 * Extended Express Request interface with user
 */
export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  userId: string;
  username: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but that's OK for optional auth
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id.toString();
    }
    
    next();
  } catch (error) {
    // Token is invalid, but we don't care for optional auth
    next();
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (userId: string, username: string): string => {
  const options: jwt.SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, username }, config.jwtSecret, options);
};

/**
 * Generate refresh token. Each token carries a unique `jti` so it can be
 * individually revoked (logout / rotation) via the RevokedToken denylist.
 */
export const generateRefreshToken = (userId: string): string => {
  const options: jwt.SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
  };
  return jwt.sign({ userId }, config.jwtRefreshSecret, options);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
};

/**
 * Add a refresh token's `jti` to the denylist until its natural expiry.
 * No-op when the token lacks a `jti` (e.g. legacy tokens issued before
 * rotation existed). Failures are swallowed so logout/refresh never 500 on a
 * transient DB hiccup — the access token still expires on its own.
 */
export const revokeRefreshToken = async (
  decoded: JWTPayload
): Promise<void> => {
  if (!decoded?.jti || !decoded.exp) return;
  try {
    await RevokedToken.updateOne(
      { jti: decoded.jti },
      {
        $setOnInsert: {
          jti: decoded.jti,
          userId: decoded.userId,
          expiresAt: new Date(decoded.exp * 1000),
        },
      },
      { upsert: true }
    );
  } catch {
    // best-effort denylist; ignore transient write errors
  }
};

/**
 * Whether a refresh token's `jti` has been revoked.
 */
export const isRefreshTokenRevoked = async (
  jti?: string
): Promise<boolean> => {
  if (!jti) return false;
  const existing = await RevokedToken.exists({ jti });
  return existing != null;
};