import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('bio')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('country')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('avatar')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar must be a valid http(s) URL'),
];

// Public routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put(
  '/profile',
  authenticate,
  updateProfileValidation,
  validateRequest,
  authController.updateProfile
);
router.get('/stats', authenticate, authController.getStats);
router.delete('/account', authenticate, authController.deleteAccount);

export default router;
