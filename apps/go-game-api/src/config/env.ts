import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Environment configuration
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Dev-only fallbacks. In production the validation below guarantees the real
// values are supplied via environment variables, so these are never used.
const DEV_JWT_SECRET = 'dev-jwt-secret';
const DEV_JWT_REFRESH_SECRET = 'dev-jwt-refresh-secret';
const DEV_PARTYKIT_WEBHOOK_SECRET = 'dev-partykit-webhook-secret';

export const config = {
  // Server
  nodeEnv,
  isProduction,
  // In containers/PaaS the process must listen on all interfaces, not just
  // loopback, or external health checks and routing can't reach it.
  host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
  port: parseInt(process.env.PORT || '8080', 10),

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/go-game',
  mongoDbName: process.env.MONGODB_DB_NAME || 'go-game',

  // JWT
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || DEV_JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // PartyKit webhook (shared secret between PartyKit server and this API)
  partykitWebhookSecret:
    process.env.PARTYKIT_WEBHOOK_SECRET || DEV_PARTYKIT_WEBHOOK_SECRET,

  // CORS — comma-separated list of allowed web origins. Capacitor/native
  // origins are added automatically in main.ts; only web origins go here.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  // Stricter cap for auth endpoints (login/register) to blunt brute force.
  authRateLimitMaxRequests: parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10',
    10
  ),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};

// Fail fast in production if any required secret is missing rather than
// silently running with insecure dev defaults.
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PARTYKIT_WEBHOOK_SECRET',
  'MONGODB_URI',
  'CORS_ORIGIN',
];

if (isProduction) {
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}