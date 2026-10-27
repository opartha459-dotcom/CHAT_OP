const mongoose = require('mongoose');

// Registry of database connections mapped by category
const connections = {
  auth: null,
  messages: null,
  status: null,
  logs: null
};

const getCategoryUri = (category) => {
  const defaultUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat';
  switch (category) {
    case 'auth':
      return process.env.MONGODB_URI_AUTH || defaultUri;
    case 'messages':
      return process.env.MONGODB_URI_MESSAGES || defaultUri;
    case 'status':
      return process.env.MONGODB_URI_STATUS || defaultUri;
    case 'logs':
      return process.env.MONGODB_URI_LOGS || defaultUri;
    default:
      return defaultUri;
  }
};

/**
 * Initialize category database connections.
 * If specialized URI is omitted, reuses mongoose.connection without overhead.
 */
const initMultiDb = () => {
  const categories = ['auth', 'messages', 'status', 'logs'];

  categories.forEach((cat) => {
    const uri = getCategoryUri(cat);
    const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat';

    // If custom URI is provided and differs from default, create separate connection
    if (uri && uri !== primaryUri) {
      try {
        connections[cat] = mongoose.createConnection(uri, {
          autoIndex: true,
          serverSelectionTimeoutMS: 10000
        });
        console.log(`[MultiDB] Category '${cat}' mapped to dedicated URI: ${uri.split('@')[1] || uri}`);
      } catch (err) {
        console.warn(`[MultiDB Warning] Failed connecting dedicated DB for '${cat}', falling back to primary:`, err.message);
        connections[cat] = mongoose.connection;
      }
    } else {
      // Re-use primary connection
      connections[cat] = mongoose.connection;
    }
  });
};

/**
 * Get real-time connection health and metrics for all categories
 */
const getDatabaseStatus = async () => {
  const primaryReadyState = mongoose.connection.readyState;
  const stateLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  const categories = ['auth', 'messages', 'status', 'logs'];
  const statusReport = {};

  for (const cat of categories) {
    const conn = connections[cat] || mongoose.connection;
    const readyState = conn.readyState;
    const isDedicated = conn !== mongoose.connection;

    let pingMs = null;
    if (readyState === 1) {
      try {
        const start = Date.now();
        await conn.db.admin().ping();
        pingMs = Date.now() - start;
      } catch (e) {
        pingMs = -1;
      }
    }

    statusReport[cat] = {
      category: cat,
      status: stateLabels[readyState] || 'unknown',
      isConnected: readyState === 1,
      isDedicated,
      databaseName: conn.name || (conn.client?.s?.options?.dbName) || 'pulsechat',
      host: conn.host || '127.0.0.1',
      port: conn.port || 27017,
      pingMs
    };
  }

  return {
    overall: stateLabels[primaryReadyState] || 'disconnected',
    primaryHost: mongoose.connection.host || '127.0.0.1',
    primaryDatabase: mongoose.connection.name || 'pulsechat',
    categories: statusReport,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  initMultiDb,
  getDatabaseStatus,
  connections
};
