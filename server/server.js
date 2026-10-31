require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { initMultiDb } = require('./config/multiDb');
const { initRetentionSchedule } = require('./jobs/retentionJob');
const setupSockets = require('./sockets');

// Connect Database & Initialize Category Routers and Retention Schedule (env refreshed)
connectDB().then(() => {
  initMultiDb();
  initRetentionSchedule();
}).catch(console.error);

// Import routes
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

const app = express();
const server = http.createServer(app);

// Dynamic CORS origin to support local machine, configured env, and phone access on Wi-Fi
// Dynamic CORS origin configuration
// CORS configuration for production and local testing

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url) => {
    try {
      const parsed = new URL(url);

      if (
        isProduction &&
        parsed.protocol !== 'https:'
      ) {
        throw new Error('Production origins must use HTTPS');
      }

      return parsed.origin;
    } catch (error) {
      throw new Error(`Invalid CLIENT_URL: ${url}`);
    }
  });

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('CLIENT_URL is missing in production!');
}

const corsOriginValidator = (origin, callback) => {
  // Requests without Origin
  if (!origin) {
    return callback(null, true);
  }

  let normalizedOrigin;

  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return callback(new Error('Invalid origin'));
  }

  // Production: only explicitly configured domains
  if (isProduction) {
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn('[CORS BLOCKED]:', normalizedOrigin);

    return callback(new Error('Not allowed by CORS'));
  }

  // Development: configured domains + localhost
  if (
    allowedOrigins.includes(normalizedOrigin) ||
    developmentOrigins.includes(normalizedOrigin)
  ) {
    return callback(null, true);
  }

  console.warn('[CORS BLOCKED]:', normalizedOrigin);

  return callback(new Error('Not allowed by CORS'));
};
// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass io to express app for use in controllers
app.set('io', io);

// Connect MongoDB
connectDB();

// Middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

// Serve uploaded static files
const uploadMiddleware = require('./middlewares/upload');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (uploadMiddleware.uploadDir && uploadMiddleware.uploadDir !== path.join(__dirname, 'uploads')) {
  app.use('/uploads', express.static(uploadMiddleware.uploadDir));
}

// Root endpoint
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

// Health check endpoint (for Render / Railway / Uptime monitoring)
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
app.get('/api/system/features', require('./controllers/adminController').getPublicFeatureFlags);

// Mount Routes
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

// Setup Socket.IO Event Handlers
setupSockets(io);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] PulseChat API server running on http://127.0.0.1:${PORT}`);
  });
}

// Attach server and app properties for backwards compatibility and tests
app.server = server;
app.app = app;

// Vercel serverless requires the default export to be a function or server
module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.default = app;
