require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat').then(async () => {
  const all = await User.find({}).select('_id username email deletionStatus');
  console.log('=== ALL USERS ===');
  all.forEach(u => console.log(u.username, '|', u.email, '|', u.deletionStatus || 'active'));
  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });

