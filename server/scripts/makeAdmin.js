require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const target = process.argv[2] || 'partha_op';

async function run() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat';
    await mongoose.connect(uri);
    console.log('[Script] Connected to MongoDB');

    const result = await User.updateMany(
      { $or: [{ username: target }, { email: target }, { username: 'partha_op' }, { email: 'op@gmail.com' }] },
      { role: 'admin' }
    );
    console.log(`[Script] Successfully promoted matches to admin:`, result);

    const users = await User.find({}, 'username email role');
    console.log('[Script] Current User Roles:');
    users.forEach(u => console.log(` - ${u.username} (${u.email}): role = ${u.role}`));

    process.exit(0);
  } catch (err) {
    console.error('[Script Error]', err);
    process.exit(1);
  }
}

run();
