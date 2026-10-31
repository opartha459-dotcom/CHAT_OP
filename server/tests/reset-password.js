// Usage: node tests/reset-password.js <email> <newpassword>
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const [,, email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.log('Usage: node tests/reset-password.js <email> <newpassword>');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('../models/User');

  const user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }]
  }).select('+password');

  if (!user) { console.log('❌ User not found'); mongoose.disconnect(); return; }

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  console.log('✅ Password reset for:', user.username, '|', user.email);
  console.log('   Deletion status:', user.deletionStatus);
  mongoose.disconnect();
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });

