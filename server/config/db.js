const dns = require('dns');
const mongoose = require('mongoose');

// Configure Node.js to use reliable public DNS servers (Google 8.8.8.8 and Cloudflare 1.1.1.1)
// Fixes querySrv ECONNREFUSED caused by ISP DNS blocking SRV lookups on MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setServers is restricted
}

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat';
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
      console.warn(`[Database Warning] Could not reach MongoDB. Retrying in 5 seconds...`);
    }
    // Retry connection without crashing the HTTP server
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
