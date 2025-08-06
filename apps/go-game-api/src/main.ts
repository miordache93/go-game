import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import rateLimit from 'express-rate-limit';

// Import configurations
import { config } from './config/env';
import { connectDatabase } from './config/database';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';

// Create Express app
const app: Application = express();

/**
 * Initialize server
 */
async function startServer() {
  try {
    // Try to connect to MongoDB
    let dbConnected = false;
    try {
      await connectDatabase();
      dbConnected = true;
    } catch (dbError) {
      console.warn('⚠️  Starting server without database connection');
      dbConnected = false;
    }

    // Middleware
    setupMiddleware(app);

    // Routes
    setupRoutes(app);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start server
    app.listen(config.port, config.host, () => {
      console.log(`
🎮 GO Game API Server
📍 Running at: http://${config.host}:${config.port}
🌍 Environment: ${config.nodeEnv}
📊 Database: ${dbConnected ? 'Connected' : 'Not Connected (API limited)'}
      `);
      
      if (!dbConnected) {
        console.log('⚠️  Note: Database-dependent endpoints will return errors');
        console.log('  Only /health endpoint will work properly\n');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Setup middleware
 */
function setupMiddleware(app: Application) {
  // CORS
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Session
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // Trust proxy
  app.set('trust proxy', 1);
}

/**
 * Setup routes
 */
function setupRoutes(app: Application) {
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/game', gameRoutes);
  
  // Future routes will be added here:
  // app.use('/api/users', userRoutes);
  // app.use('/api/matchmaking', matchmakingRoutes);
}

// Start the server
startServer();