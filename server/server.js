
require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
});

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// ============================================
// DATABASE & BACKGROUND SERVICES
// ============================================

const connectDB = require('./config/db');
const { initMultiDb } = require('./config/multiDb');
const { initRetentionSchedule } = require('./jobs/retentionJob');
const {
  initMaintenanceScheduler,
  getCurrentMaintenanceState
} = require('./jobs/maintenanceScheduler');

const setupSockets = require('./sockets');

// ============================================
// ROUTES
// ============================================

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

// ============================================
// ENVIRONMENT
// ============================================

const isProduction = process.env.NODE_ENV === 'production';

const PORT = process.env.PORT || 5000;

// ============================================
// CORS CONFIGURATION
// ============================================

// Multiple origins are allowed ONLY during development.
const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

let productionOrigin = null;

if (isProduction) {
  const clientUrl = process.env.CLIENT_URL?.trim();

  if (!clientUrl) {
    throw new Error('CLIENT_URL is missing in production!');
  }

  try {
    const parsedUrl = new URL(clientUrl);

    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Production frontend must use HTTPS.');
    }

    // Only one production frontend origin is accepted.
    productionOrigin = parsedUrl.origin;

  } catch (error) {
    throw new Error(`Invalid production CLIENT_URL: ${clientUrl}`);
  }
}

const corsOriginValidator = (origin, callback) => {
  // Allow requests without an Origin header.
  // This does not replace API authentication.
  if (!origin) {
    return callback(null, true);
  }

  let normalizedOrigin;

  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return callback(new Error('Invalid origin'));
  }

  // PRODUCTION: exactly one configured frontend.
  if (isProduction) {
    if (normalizedOrigin === productionOrigin) {
      return callback(null, true);
    }

    console.warn('[CORS BLOCKED]:', normalizedOrigin);

    return callback(new Error('Not allowed by CORS'));
  }

  // DEVELOPMENT: localhost origins only.
  if (developmentOrigins.includes(normalizedOrigin)) {
    return callback(null, true);
  }

  console.warn('[CORS BLOCKED]:', normalizedOrigin);

  return callback(new Error('Not allowed by CORS'));
};

// ============================================
// EXPRESS & HTTP SERVER
// ============================================

const app = express();
const server = http.createServer(app);

// Trust one proxy hop (Render).
// Must be configured before rate limiting.
app.set('trust proxy', 1);

// ============================================
// SOCKET.IO
// ============================================

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// ============================================
// MIDDLEWARES
// ============================================

// CORS must run before body parsers.
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request body parsing.
app.use(express.json({ limit: '20mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  })
);

app.use(cookieParser());

// ============================================
// RATE LIMITING
// ============================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// ============================================
// UPLOAD CONFIGURATION
// ============================================

const uploadMiddleware = require('./middlewares/upload');

const defaultUploadDir = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(defaultUploadDir));

if (
  uploadMiddleware.uploadDir &&
  uploadMiddleware.uploadDir !== defaultUploadDir
) {
  app.use(
    '/uploads',
    express.static(uploadMiddleware.uploadDir)
  );
}

// ============================================
// ROOT ENDPOINT
// ============================================

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
      groups: '/api/groups',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// HEALTH CHECK
// ============================================

const healthHandler = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'degraded',
    service: 'PulseChat Real-Time API',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Public feature flags.
app.get(
  '/api/system/features',
  require('./controllers/adminController').getPublicFeatureFlags
);

// Public maintenance status.
app.get('/api/system/maintenance', async (req, res) => {
  try {
    const state = await getCurrentMaintenanceState();
    return res.json({ success: true, ...state });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve maintenance state' });
  }
});

// ============================================
// API ROUTES
// ============================================

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

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
    path: req.originalUrl,
  });
});

// ============================================
// CENTRALIZED ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error(
    '[SERVER ERROR]',
    err.stack || err
  );

  // Rejected CORS origins.
  if (
    err.message === 'Not allowed by CORS' ||
    err.message === 'Invalid origin'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Internal server error occurred.'
        : err.message || 'Request failed.',
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

async function startServer() {
  try {
    console.log('====================================');
    console.log('[STARTUP] Starting PulseChat...');
    console.log('[STARTUP] Environment:', process.env.NODE_ENV);
    console.log('[STARTUP] Trust proxy: 1');
    console.log('====================================');

    // 1. Connect to MongoDB exactly once.
    console.log('[DATABASE] Connecting to MongoDB...');

    await connectDB();

    console.log('[DATABASE] Main database connected.');

    // 2. Initialize secondary databases.
    console.log('[DATABASE] Initializing multi-database...');

    await initMultiDb();

    console.log('[DATABASE] Multi-database initialized.');

    // 3. Initialize retention and maintenance schedulers.
    console.log('[JOBS] Initializing retention scheduler...');

    await initRetentionSchedule();

    console.log('[JOBS] Retention scheduler initialized.');

    console.log('[JOBS] Initializing maintenance scheduler...');
    initMaintenanceScheduler(app);

    // 4. Register Socket.IO event handlers.
    console.log('[SOCKET.IO] Initializing socket handlers...');

    setupSockets(io);

    console.log('[SOCKET.IO] Handlers initialized.');

    // 5. Start HTTP server only after initialization.
    server.listen(PORT, '0.0.0.0', () => {
      console.log('====================================');
      console.log('[SERVER] PulseChat API started');
      console.log('[SERVER] Port:', PORT);
      console.log('[SERVER] Environment:', process.env.NODE_ENV);
      console.log('[SERVER] Trust proxy: 1');
      console.log('[SERVER] Socket.IO: initialized');
      console.log('[DATABASE] Main database: connected');
      console.log('[SERVER] Status: LIVE');
      console.log('====================================');
    });

  } catch (error) {
    console.error('====================================');
    console.error('[STARTUP FAILED]', error);
    console.error('====================================');

    process.exit(1);
  }
}

// ============================================
// EXPORTS & STARTUP
// ============================================

app.server = server;
app.app = app;

module.exports = app;
module.exports.app = app;
module.exports.server = server;

// Start the persistent Render server.
startServer();
