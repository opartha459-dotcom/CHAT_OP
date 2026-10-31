
require('dotenv').config({
  path: require('path').resolve(__dirname, '.env')
});

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// =====================================================
// 1. IMPORT CONFIGURATIONS
// =====================================================

const connectDB = require('./config/db');
const { initMultiDb } = require('./config/multiDb');
const { initRetentionSchedule } = require('./jobs/retentionJob');
const setupSockets = require('./sockets');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const exportRoutes = require('./routes/exportRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const statusRoutes = require('./routes/statusRoutes');

// Controllers and middleware
const adminController = require('./controllers/adminController');
const uploadMiddleware = require('./middlewares/upload');

// =====================================================
// 2. ENVIRONMENT
// =====================================================

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const PORT = process.env.PORT || 5000;

// =====================================================
// 3. EXPRESS INITIALIZATION
// =====================================================

const app = express();
const server = http.createServer(app);

// Configure trusted reverse proxy hops.
// Render commonly uses one trusted proxy hop.
// Set TRUST_PROXY_HOPS=1 in Render.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

if (!Number.isInteger(proxyHops) || proxyHops < 0) {
  throw new Error('[CONFIG ERROR] Invalid TRUST_PROXY_HOPS');
}

if (proxyHops > 0) {
  app.set('trust proxy', proxyHops);
}

// =====================================================
// 4. CORS CONFIGURATION
// =====================================================

// Explicitly trusted production frontend.
// Add additional domains through CLIENT_URL.
const trustedProductionOrigins = [
  'https://chat-with-her.netlify.app'
];

// Development frontend origins.
const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Parse and validate CLIENT_URL.
function parseClientOrigins(value) {
  if (!value || !value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      let parsed;

      try {
        parsed = new URL(item);
      } catch {
        throw new Error(
          `[CORS CONFIG ERROR] Invalid CLIENT_URL: ${item}`
        );
      }

      if (
        parsed.protocol !== 'http:' &&
        parsed.protocol !== 'https:'
      ) {
        throw new Error(
          `[CORS CONFIG ERROR] Unsupported protocol: ${item}`
        );
      }

      if (
        parsed.username ||
        parsed.password ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error(
          `[CORS CONFIG ERROR] CLIENT_URL must contain only an origin: ${item}`
        );
      }

      if (IS_PRODUCTION && parsed.protocol !== 'https:') {
        throw new Error(
          `[CORS CONFIG ERROR] Production origins must use HTTPS: ${item}`
        );
      }

      return parsed.origin;
    });
}

const configuredOrigins = parseClientOrigins(
  process.env.CLIENT_URL || ''
);

const allowedOrigins = [
  ...new Set([
    ...(IS_PRODUCTION ? trustedProductionOrigins : []),
    ...configuredOrigins,
    ...(!IS_PRODUCTION ? developmentOrigins : [])
  ])
];

// Detect private IPv4 addresses for local development only.
function isPrivateIPv4(hostname) {
  const parts = hostname.split('.');

  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    return false;
  }

  const [a, b, c, d] = parts.map(Number);

  if (
    [a, b, c, d].some((n) => n < 0 || n > 255)
  ) {
    return false;
  }

  return (
    a === 10 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

// Single origin validation function.
function checkOrigin(origin) {
  // Requests without Origin.
  if (!origin) {
    return {
      allowed: true,
      reason: 'NO_ORIGIN_HEADER'
    };
  }

  let parsed;

  try {
    parsed = new URL(origin);
  } catch {
    return {
      allowed: false,
      reason: 'INVALID_ORIGIN_FORMAT'
    };
  }

  const normalizedOrigin = parsed.origin;

  // Exact allowlist match.
  if (allowedOrigins.includes(normalizedOrigin)) {
    return {
      allowed: true,
      reason: 'EXACT_ALLOWLIST_MATCH',
      normalizedOrigin
    };
  }

  // Private network and localhost access only in development.
  if (!IS_PRODUCTION && parsed.protocol === 'http:') {
    const isLocalhost = [
      'localhost',
      '127.0.0.1'
    ].includes(parsed.hostname);

    if (
      isLocalhost ||
      isPrivateIPv4(parsed.hostname)
    ) {
      return {
        allowed: true,
        reason: 'DEVELOPMENT_LOCAL_NETWORK',
        normalizedOrigin
      };
    }
  }

  return {
    allowed: false,
    reason: 'ORIGIN_NOT_IN_ALLOWLIST',
    normalizedOrigin
  };
}

// Detailed CORS diagnostics.
console.log('\n========== PULSECHAT CORS CONFIG ==========');
console.log('[CORS] Environment:', NODE_ENV);
console.log('[CORS] CLIENT_URL:', process.env.CLIENT_URL || '(not configured)');
console.log('[CORS] Configured origins:', configuredOrigins);
console.log('[CORS] Final allowed origins:', allowedOrigins);
console.log('[CORS] Production mode:', IS_PRODUCTION);
console.log('============================================\n');

// CORS validator.
const corsOriginValidator = (origin, callback) => {
  const result = checkOrigin(origin);

  if (result.allowed) {
    if (origin) {
      console.log('[CORS ALLOWED]', {
        origin,
        normalized: result.normalizedOrigin,
        reason: result.reason
      });
    }

    return callback(null, true);
  }

  console.error('[CORS BLOCKED]', {
    origin,
    normalized: result.normalizedOrigin || null,
    reason: result.reason,
    environment: NODE_ENV,
    allowedOrigins
  });

  const error = new Error('Not allowed by CORS');
  error.code = 'CORS_ORIGIN_DENIED';

  return callback(error);
};

// =====================================================
// 5. SOCKET.IO INITIALIZATION
// =====================================================

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// =====================================================
// 6. EXPRESS MIDDLEWARE
// =====================================================

// CORS should run before body parsers.
app.use(cors({
  origin: corsOriginValidator,
  credentials: true,
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],
  optionsSuccessStatus: 204
}));

app.use(express.json({
  limit: '20mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '20mb'
}));

app.use(cookieParser());

// =====================================================
// 7. RATE LIMITER
// =====================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  },

  handler: (req, res) => {
    console.warn('[RATE LIMIT] Authentication limit reached:', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }
});

// =====================================================
// 8. DATABASE INITIALIZATION
// =====================================================

const initializationPromise = (async () => {
  console.log('[DATABASE] Connecting to main database...');

  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error('Main MongoDB connection is not ready');
  }

  console.log('[DATABASE] Main database connected');

  console.log('[DATABASE] Initializing multi-database...');

  await initMultiDb();

  console.log('[DATABASE] Multi-database initialized');

  console.log('[JOBS] Initializing retention schedule...');

  await initRetentionSchedule();

  console.log('[JOBS] Retention schedule initialized');

  console.log('[STARTUP] All initialization completed');
})();

// Log startup failures without silently swallowing them.
initializationPromise.catch((error) => {
  console.error('[INITIALIZATION FAILED]', error.stack || error);
});

// Wait for database initialization before processing API requests.
app.use('/api', async (req, res, next) => {
  try {
    await initializationPromise;
    next();
  } catch (error) {
    next(error);
  }
});

// =====================================================
// 9. STATIC UPLOADS
// =====================================================

const defaultUploadDir = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(defaultUploadDir));

if (
  uploadMiddleware.uploadDir &&
  path.resolve(uploadMiddleware.uploadDir) !==
  path.resolve(defaultUploadDir)
) {
  app.use(
    '/uploads',
    express.static(uploadMiddleware.uploadDir)
  );
}

// =====================================================
// 10. ROOT ENDPOINT
// =====================================================

app.get('/', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.json({
    status: 'online',
    message: 'PulseChat Real-Time Encrypted Messenger API is running',
    version: '1.0.0',
    environment: NODE_ENV,
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: `${Math.floor(process.uptime())}s`,
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      auth: '/api/auth',
      chats: '/api/chats',
      messages: '/api/messages',
      users: '/api/users',
      groups: '/api/groups'
    },
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// 11. HEALTH CHECK
// =====================================================

const healthHandler = async (req, res) => {
  try {
    await initializationPromise;

    const dbConnected = mongoose.connection.readyState === 1;

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'healthy' : 'degraded',
      service: 'PulseChat Real-Time API',
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'PulseChat Real-Time API',
      database: 'unavailable',
      message: 'Service initialization failed',
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// =====================================================
// 12. PUBLIC SYSTEM FEATURES
// =====================================================

app.get(
  '/api/system/features',
  adminController.getPublicFeatureFlags
);

// =====================================================
// 13. API ROUTES
// =====================================================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/status', statusRoutes);

// =====================================================
// 14. SOCKET.IO EVENT HANDLERS
// =====================================================

setupSockets(io);

// =====================================================
// 15. 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// =====================================================
// 16. CENTRALIZED ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // CORS errors.
  if (
    err.code === 'CORS_ORIGIN_DENIED' ||
    err.message === 'Not allowed by CORS'
  ) {
    console.warn('[CORS ERROR RESPONSE]', {
      origin: req.headers.origin || null,
      path: req.originalUrl,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      code: 'CORS_ORIGIN_DENIED',
      message: 'Your frontend origin is not allowed by the server.'
    });
  }

  // MongoDB errors.
  if (
    err.name === 'MongoServerError' ||
    err.name === 'MongooseError'
  ) {
    console.error('[DATABASE ERROR]', err.message);
  } else {
    console.error('[UNHANDLED ERROR]', err.stack || err);
  }

  const status = err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: status >= 500
      ? 'Internal server error occurred.'
      : err.message
  });
});

// =====================================================
// 17. START SERVER
// =====================================================

if (!process.env.VERCEL) {
  initializationPromise
    .then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log('\n====================================');
        console.log('[SERVER] PulseChat API started');
        console.log('[SERVER] Port:', PORT);
        console.log('[SERVER] Environment:', NODE_ENV);
        console.log('[SERVER] Socket.IO: initialized');
        console.log('[DATABASE] Main database: connected');
        console.log('[CORS] Configuration: loaded');
        console.log('====================================\n');
      });
    })
    .catch((error) => {
      console.error('[SERVER STARTUP FAILED]', error);
      process.exit(1);
    });
}

// =====================================================
// 18. EXPORTS
// =====================================================

app.server = server;
app.app = app;
app.io = io;

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.io = io;
module.exports.initializationPromise = initializationPromise;
module.exports.default = app;
