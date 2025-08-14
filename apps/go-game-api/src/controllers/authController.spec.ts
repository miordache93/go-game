import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as authController from './authController';
import { User } from '../models/User';
import * as authMiddleware from '../middleware/auth';

// Mock dependencies
vi.mock('../models/User');
vi.mock('../middleware/auth');

const MockedUser = vi.mocked(User);
const MockedAuthMiddleware = vi.mocked(authMiddleware);

// Helper function to create mock request/response objects
const createMockReq = (body: any = {}, params: any = {}, query: any = {}) => ({
  body,
  params,
  query,
  headers: {},
  user: undefined,
  userId: undefined,
}) as any as Request;

const createMockRes = () => {
  const res = {} as any as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => vi.fn();

describe('AuthController', () => {
  let req: Request;
  let res: Response;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  describe('register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should successfully register a new user', async () => {
      const mockUserObject = {
        _id: 'mock-user-id',
        username: validUserData.username,
        email: validUserData.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const mockUser = {
        _id: 'mock-user-id',
        ...validUserData,
        toObject: vi.fn().mockReturnValue(mockUserObject),
      };

      req.body = validUserData;
      MockedUser.findOne.mockResolvedValue(null);
      MockedUser.create.mockResolvedValue(mockUser as any);
      MockedAuthMiddleware.generateToken.mockReturnValue('mock-access-token');
      MockedAuthMiddleware.generateRefreshToken.mockReturnValue('mock-refresh-token');

      await authController.register(req, res, next);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        $or: [{ email: validUserData.email }, { username: validUserData.username }]
      });
      expect(MockedUser.create).toHaveBeenCalledWith({
        username: validUserData.username,
        email: validUserData.email,
        password: validUserData.password,
      });
      expect(MockedAuthMiddleware.generateToken).toHaveBeenCalledWith('mock-user-id', validUserData.username);
      expect(MockedAuthMiddleware.generateRefreshToken).toHaveBeenCalledWith('mock-user-id');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            _id: 'mock-user-id',
            username: validUserData.username,
            email: validUserData.email,
          }),
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    });

    it('should not create user when required fields are missing', async () => {
      req.body = { username: 'testuser' }; // Missing email and password

      await authController.register(req, res, next);
      
      // Verify error was passed to next middleware
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should not create user when email is missing', async () => {
      req.body = { username: 'testuser', password: 'password123' };
      
      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should not create user when password is missing', async () => {
      req.body = { username: 'testuser', email: 'test@example.com' };
      
      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should not create user when username is missing', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      
      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should not create user when email already exists', async () => {
      const existingUser = {
        email: validUserData.email,
        username: 'different-username'
      };

      req.body = validUserData;
      MockedUser.findOne.mockResolvedValue(existingUser as any);

      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should not create user when username already exists', async () => {
      const existingUser = {
        email: 'different@example.com',
        username: validUserData.username
      };

      req.body = validUserData;
      MockedUser.findOne.mockResolvedValue(existingUser as any);

      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      req.body = validUserData;
      MockedUser.findOne.mockResolvedValue(null);
      MockedUser.create.mockRejectedValue(new Error('Database error'));

      await authController.register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Database error'
      }));
    });
  });

  describe('login', () => {
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };

    const mockUser = {
      _id: 'mock-user-id',
      username: 'testuser',
      email: 'test@example.com',
      lastLogin: new Date(),
      comparePassword: vi.fn(),
      save: vi.fn(),
      toObject: () => ({
        _id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com',
        lastLogin: expect.any(Date),
        isActive: true,
      }),
    };

    it('should successfully login with valid credentials', async () => {
      req.body = loginData;
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.save.mockResolvedValue(mockUser);
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      } as any);
      MockedAuthMiddleware.generateToken.mockReturnValue('mock-access-token');
      MockedAuthMiddleware.generateRefreshToken.mockReturnValue('mock-refresh-token');

      await authController.login(req, res);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        $or: [{ email: loginData.username }, { username: loginData.username }]
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(mockUser.save).toHaveBeenCalled();
      expect(MockedAuthMiddleware.generateToken).toHaveBeenCalledWith('mock-user-id', 'testuser');
      expect(MockedAuthMiddleware.generateRefreshToken).toHaveBeenCalledWith('mock-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            _id: 'mock-user-id',
            username: 'testuser',
            email: 'test@example.com',
          }),
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    });

    it('should successfully login with email instead of username', async () => {
      req.body = { username: 'test@example.com', password: 'password123' };
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.save.mockResolvedValue(mockUser);
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      } as any);
      MockedAuthMiddleware.generateToken.mockReturnValue('mock-access-token');
      MockedAuthMiddleware.generateRefreshToken.mockReturnValue('mock-refresh-token');

      await authController.login(req, res);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'test@example.com' }]
      });
    });

    it('should not login when username is missing', async () => {
      req.body = { password: 'password123' };
      await expect(authController.login(req, res)).rejects.toThrow();
    });

    it('should not login when password is missing', async () => {
      req.body = { username: 'testuser' };
      await expect(authController.login(req, res)).rejects.toThrow();
    });

    it('should not login when user is not found', async () => {
      req.body = loginData;
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(authController.login(req, res)).rejects.toThrow();
    });

    it('should not login when password is incorrect', async () => {
      req.body = loginData;
      mockUser.comparePassword.mockResolvedValue(false);
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      } as any);

      await expect(authController.login(req, res)).rejects.toThrow();
    });

    it('should handle database errors during login', async () => {
      req.body = loginData;
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any);

      await expect(authController.login(req, res)).rejects.toThrow('Database connection failed');
    });

    it('should handle password comparison errors', async () => {
      req.body = loginData;
      mockUser.comparePassword.mockRejectedValue(new Error('Password comparison failed'));
      MockedUser.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      } as any);

      await expect(authController.login(req, res)).rejects.toThrow('Password comparison failed');
    });
  });

  describe('refreshToken', () => {
    const mockDecodedToken = {
      userId: 'mock-user-id',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    const mockUser = {
      _id: 'mock-user-id',
      username: 'testuser',
      isActive: true,
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      req.body = { refreshToken: 'valid-refresh-token' };
      MockedAuthMiddleware.verifyRefreshToken.mockReturnValue(mockDecodedToken);
      MockedUser.findById.mockResolvedValue(mockUser as any);
      MockedAuthMiddleware.generateToken.mockReturnValue('new-access-token');
      MockedAuthMiddleware.generateRefreshToken.mockReturnValue('new-refresh-token');

      await authController.refreshToken(req, res);

      expect(MockedAuthMiddleware.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(MockedUser.findById).toHaveBeenCalledWith('mock-user-id');
      expect(MockedAuthMiddleware.generateToken).toHaveBeenCalledWith('mock-user-id', 'testuser');
      expect(MockedAuthMiddleware.generateRefreshToken).toHaveBeenCalledWith('mock-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
    });

    it('should not refresh when refresh token is missing', async () => {
      req.body = {};
      await expect(authController.refreshToken(req, res)).rejects.toThrow();
    });

    it('should not refresh when refresh token is invalid', async () => {
      req.body = { refreshToken: 'invalid-token' };
      MockedAuthMiddleware.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authController.refreshToken(req, res)).rejects.toThrow();
    });

    it('should not refresh when user is not found', async () => {
      req.body = { refreshToken: 'valid-refresh-token' };
      MockedAuthMiddleware.verifyRefreshToken.mockReturnValue(mockDecodedToken);
      MockedUser.findById.mockResolvedValue(null);

      await expect(authController.refreshToken(req, res)).rejects.toThrow();
    });

    it('should not refresh when user is inactive', async () => {
      req.body = { refreshToken: 'valid-refresh-token' };
      MockedAuthMiddleware.verifyRefreshToken.mockReturnValue(mockDecodedToken);
      MockedUser.findById.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(authController.refreshToken(req, res)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      await authController.logout(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('getProfile', () => {
    it('should successfully return user profile', async () => {
      const mockUserProfile = {
        _id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com',
        profile: { bio: 'Test bio' },
      };

      (req as any).user = mockUserProfile;

      await authController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUserProfile,
        },
      });
    });
  });

  describe('updateProfile', () => {
    const profileUpdate = {
      bio: 'Updated bio',
      country: 'US',
      avatar: 'new-avatar-url',
    };

    it('should successfully update user profile', async () => {
      const updatedUser = {
        _id: 'mock-user-id',
        username: 'testuser',
        profile: profileUpdate,
      };

      req.body = profileUpdate;
      (req as any).userId = 'mock-user-id';
      MockedUser.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      await authController.updateProfile(req, res);

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-user-id',
        {
          $set: {
            'profile.bio': profileUpdate.bio,
            'profile.country': profileUpdate.country,
            'profile.avatar': profileUpdate.avatar,
          },
        },
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: updatedUser,
        },
      });
    });

    it('should handle partial profile updates', async () => {
      const partialUpdate = { bio: 'New bio only' };
      const updatedUser = { _id: 'mock-user-id', profile: partialUpdate };

      req.body = partialUpdate;
      (req as any).userId = 'mock-user-id';
      MockedUser.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      await authController.updateProfile(req, res);

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'mock-user-id',
        {
          $set: {
            'profile.bio': partialUpdate.bio,
            'profile.country': undefined,
            'profile.avatar': undefined,
          },
        },
        { new: true, runValidators: true }
      );
    });
  });

  describe('getStats', () => {
    it('should successfully return user statistics', async () => {
      const mockUser = {
        _id: 'mock-user-id',
        username: 'testuser',
        stats: {
          gamesPlayed: 10,
          wins: 7,
          losses: 2,
          draws: 1,
          winStreak: 3,
          bestWinStreak: 5,
        },
      };

      (req as any).userId = 'mock-user-id';
      MockedUser.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      } as any);

      await authController.getStats(req, res);

      expect(MockedUser.findById).toHaveBeenCalledWith('mock-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          stats: mockUser.stats,
          username: mockUser.username,
        },
      });
    });

    it('should handle user not found', async () => {
      (req as any).userId = 'non-existent-user-id';
      MockedUser.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(authController.getStats(req, res)).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      (req as any).userId = 'mock-user-id';
      MockedUser.findById.mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await expect(authController.getStats(req, res)).rejects.toThrow('Database error');
    });
  });
});