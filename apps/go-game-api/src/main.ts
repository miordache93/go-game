import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

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
  // Trust the first proxy hop (PaaS load balancer) so client IPs and HTTPS
  // detection are accurate for rate limiting and secure cookies.
  app.set('trust proxy', 1);

  // Security headers (HSTS, X-Content-Type-Options, frameguard, etc.).
  app.use(helmet());

  // CORS — allow configured web origins plus Capacitor/native shells. With
  // credentials enabled the matching origin must be reflected (no wildcard).
  const allowedOrigins = new Set<string>([
    ...config.corsOrigins,
    'capacitor://localhost', // iOS (Capacitor)
    'ionic://localhost', // legacy Ionic/Capacitor
    'http://localhost', // Android (Capacitor)
    'https://localhost', // Android (Capacitor https scheme)
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (native apps, curl, server-to-server,
        // health checks) are allowed — CORS only governs browser cross-origin.
        // Disallowed origins resolve to `false`: no CORS headers are sent and the
        // browser blocks the response, without raising a server-side 500.
        callback(null, !origin || allowedOrigins.has(origin));
      },
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Strip Mongo operators ($/.) from request payloads to prevent NoSQL
  // injection (e.g. a login body of { "username": { "$ne": null } }).
  app.use(mongoSanitize());

  // Logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Stricter rate limit on auth endpoints to blunt credential brute force.
  // Mounted before the general limiter so login/register hit this cap first.
  const authLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.authRateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts, please try again later.',
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // General API rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
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