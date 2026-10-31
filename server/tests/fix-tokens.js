require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('../models/User');

  // Clear expired tokens — users will be prompted to resend on the /verify-email page
  const r1 = await User.updateMany(
    { isEmailVerified: false, emailVerificationExpires: { $lt: new Date() } },
    { $unset: { emailVerificationToken: '', emailVerificationExpires: '' } }
  );
  console.log('Cleared expired tokens for', r1.modifiedCount, 'user(s)');

  const remaining = await User.find({ isEmailVerified: false }).select('+emailVerificationToken +emailVerificationExpires').lean();
  console.log('\nRemaining unverified accounts:');
  remaining.forEach(u => {
    console.log(' -', u.email, '| hasToken:', !!u.emailVerificationToken, '| expires:', u.emailVerificationExpires || 'none');
  });

  mongoose.disconnect();
  console.log('\nDone.');
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });

