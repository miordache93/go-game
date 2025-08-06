import { Router } from 'express';
import gameController from '../controllers/gameController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation rules
const createGameValidation = [
  body('opponentId').optional().isMongoId().withMessage('Invalid opponent ID'),
  body('boardSize').optional().isIn([9, 13, 19]).withMessage('Board size must be 9, 13, or 19'),
  body('timeLimit').optional().isInt({ min: 0 }).withMessage('Time limit must be a positive integer'),
  body('isRanked').optional().isBoolean().withMessage('isRanked must be a boolean')
];

const updateGameValidation = [
  param('id').isMongoId().withMessage('Invalid game ID'),
  body('gameState').optional().isObject().withMessage('Game state must be an object'),
  body('lastMove').optional().isObject().withMessage('Last move must be an object'),
  body('status').optional().isIn(['pending', 'active', 'completed', 'abandoned'])
    .withMessage('Invalid game status')
];

const recordMoveValidation = [
  param('id').isMongoId().withMessage('Invalid game ID'),
  body('move').isObject().withMessage('Move must be an object'),
  body('move.x').isInt({ min: 0, max: 18 }).withMessage('Invalid x coordinate'),
  body('move.y').isInt({ min: 0, max: 18 }).withMessage('Invalid y coordinate'),
  body('move.type').isIn(['place', 'pass', 'resign']).withMessage('Invalid move type'),
  body('gameState').isObject().withMessage('Game state must be an object')
];

const getUserGamesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'active', 'completed', 'abandoned'])
    .withMessage('Invalid status filter')
];

const partykitWebhookValidation = [
  body('roomId').notEmpty().withMessage('Room ID is required'),
  body('players').isObject().withMessage('Players data is required'),
  body('gameState').isObject().withMessage('Game state is required'),
  body('moves').isArray().withMessage('Moves must be an array'),
  body('startedAt').isISO8601().withMessage('Invalid startedAt date'),
  body('completedAt').isISO8601().withMessage('Invalid completedAt date')
];

// Public routes
router.get('/leaderboard', gameController.getLeaderboard);

// Protected routes
router.use(authenticate);

// Game CRUD operations
router.post('/create', createGameValidation, validateRequest, gameController.createGame);
router.get('/list', getUserGamesValidation, validateRequest, gameController.getUserGames);
router.get('/:id', param('id').isMongoId(), validateRequest, gameController.getGame);
router.put('/:id', updateGameValidation, validateRequest, gameController.updateGame);
router.post('/:id/move', recordMoveValidation, validateRequest, gameController.recordMove);
router.get('/:id/history', param('id').isMongoId(), validateRequest, gameController.getGameHistory);
router.post('/:id/resign', param('id').isMongoId(), validateRequest, gameController.resignGame);

// User statistics
router.get('/user/:userId/stats', 
  param('userId').optional().isMongoId(), 
  validateRequest, 
  gameController.getUserStats
);

// PartyKit webhook (should verify secret in production)
router.post('/webhook/partykit', 
  partykitWebhookValidation, 
  validateRequest, 
  gameController.savePartykitGame
);

export default router;