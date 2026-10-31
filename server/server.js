
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

// Database and background services
const connectDB = require('./config/db');
const { initMultiDb } = require('./config/multiDb');
const { initRetentionSchedule } = require('./jobs/retentionJob');

// Socket.IO
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

// Controllers
const adminController = require('./controllers/adminController');

// Upload middleware
const uploadMiddleware = require('./middlewares/upload');

// =====================================================
// 1. ENVIRONMENT CONFIGURATION
// =====================================================

const isProduction = process.env.NODE_ENV === 'production';

const PORT = process.env.PORT || 5000;

// =====================================================
// 2. EXPRESS INITIALIZATION
// =====================================================

const app = express();
const server = http.createServer(app);

// Configure trusted proxy hops.
// Set TRUST_PROXY_HOPS=1 on Render when using its
// standard single reverse-proxy deployment.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

if (!Number.isInteger(proxyHops) || proxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}

if (proxyHops > 0) {
  app.set('trust proxy', proxyHops);
}

// =====================================================
// 3. CORS CONFIGURATION
// =====================================================

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url) => {
    try {
      const parsed = new URL(url);

      // Production frontend must use HTTPS.
      if (isProduction && parsed.protocol !== 'https:') {
        throw new Error('Production origins must use HTTPS');
      }

      // Do not accept URL paths, query strings or credentials.
      if (
        parsed.username ||
        parsed.password ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error('CLIENT_URL must contain only an origin');
      }

      return parsed.origin;
    } catch (error) {
      throw new Error(`Invalid CLIENT_URL: ${url}`);
    }
  });

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Production must have explicitly configured origins.
if (isProduction && allowedOrigins.length === 0) {
  throw new Error(
    'CLIENT_URL is required in production. Configure it in your hosting environment.'
  );
}

const corsOriginValidator = (origin, callback) => {
  // Allow requests without Origin (server-to-server clients).
  // This is not an authentication bypass protection.
  if (!origin) {
    return callback(null, true);
  }

  let normalizedOrigin;

  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return callback(new Error('Not allowed by CORS'));
  }

  // Production: strict allowlist.
  if (isProduction) {
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn('[CORS BLOCKED]:', normalizedOrigin);

    return callback(new Error('Not allowed by CORS'));
  }

  // Development: configured domains + localhost.
  if (
    allowedOrigins.includes(normalizedOrigin) ||
    developmentOrigins.includes(normalizedOrigin)
  ) {
    return callback(null, true);
  }

  console.warn('[CORS BLOCKED]:', normalizedOrigin);

  return callback(new Error('Not allowed by CORS'));
};

// =====================================================
// 4. SOCKET.IO INITIALIZATION
// =====================================================

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Make Socket.IO available inside controllers.
app.set('io', io);

// =====================================================
// 5. GLOBAL MIDDLEWARE
// =====================================================

app.use(express.json({
  limit: '20mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '20mb'
}));

app.use(cookieParser());

// Express CORS.
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

// =====================================================
// 6. DATABASE INITIALIZATION
// =====================================================

const initializationPromise = (async () => {
  console.log('[Database] Connecting to main database...');

  await connectDB();

  console.log('[Database] Main database connected');

  await initMultiDb();

  console.log('[Database] Multi-database initialized');

  await initRetentionSchedule();

  console.log('[Jobs] Retention schedule initialized');
})();

// For serverless requests, wait for database initialization
// before processing API routes.
app.use('/api', async (req, res, next) => {
  try {
    await initializationPromise;
    next();
  } catch (error) {
    next(error);
  }
});

// =====================================================
// 7. RATE LIMITING
// =====================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// =====================================================
// 8. STATIC UPLOAD FILES
// =====================================================

const defaultUploadDir = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(defaultUploadDir));

if (
  uploadMiddleware.uploadDir &&
  path.resolve(uploadMiddleware.uploadDir) !== path.resolve(defaultUploadDir)
) {
  app.use('/uploads', express.static(uploadMiddleware.uploadDir));
}

// =====================================================
// 9. ROOT ENDPOINT
// =====================================================

app.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.json({
    status: 'online',
    message: 'PulseChat Real-Time Encrypted Messenger API is running',
    version: '1.0.0',
    database: isDbConnected ? 'connected' : 'disconnected',
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
// 10. HEALTH CHECK
// =====================================================

const healthHandler = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'degraded',
    service: 'PulseChat Real-Time API',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// =====================================================
// 11. PUBLIC FEATURE FLAGS
// =====================================================

app.get(
  '/api/system/features',
  adminController.getPublicFeatureFlags
);

// =====================================================
// 12. API ROUTES
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
// 13. SOCKET.IO EVENT HANDLERS
// =====================================================

setupSockets(io);

// =====================================================
// 14. 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.'
  });
});

// =====================================================
// 15. CENTRALIZED ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // CORS errors.
  if (
    err.message === 'Not allowed by CORS' ||
    err.message === 'Invalid origin'
  ) {
    console.warn('[CORS BLOCKED]:', req.headers.origin);

    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by server CORS policy.'
    });
  }

  console.error(
    '[Unhandled Error]:',
    err.stack || err
  );

  const status = err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: status >= 500
      ? 'Internal server error occurred.'
      : err.message
  });
});

// =====================================================
// 16. START SERVER
// =====================================================

if (!process.env.VERCEL) {
  initializationPromise
    .then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log('====================================');
        console.log('[Server] PulseChat API started');
        console.log(`[Server] Port: ${PORT}`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('[Database] Connected');
        console.log('[Socket.IO] Initialized');
        console.log('====================================');
      });
    })
    .catch((error) => {
      console.error('[Startup Failed]:', error);
      process.exit(1);
    });
}

// =====================================================
// 17. EXPORTS
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
