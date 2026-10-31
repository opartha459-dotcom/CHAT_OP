// Usage: node tests/verify-password.js <email> <password>
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Usage: node tests/verify-password.js <email> <password>');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('../models/User');

  const user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }]
  }).select('+password');

  if (!user) {
    console.log('❌ User not found');
    mongoose.disconnect(); return;
  }

  console.log('Found user:', user.username, '|', user.email, '| status:', user.deletionStatus);
  const match = await user.comparePassword(password);
  console.log(match ? '✅ Password is CORRECT' : '❌ Password is WRONG');

  mongoose.disconnect();
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });

