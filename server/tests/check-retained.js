require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('../models/User');

  // Show all retained/pending_deletion accounts
  const retained = await User.find({
    deletionStatus: { $in: ['pending_deletion', 'retained'] }
  }).select('+password').lean();

  console.log('Retained/Pending accounts:', retained.length);
  retained.forEach(u => {
    console.log({
      username: u.username,
      email: u.email,
      deletionStatus: u.deletionStatus,
      hasPassword: !!u.password,
      recoveryDeadline: u.recoveryDeadline
    });
  });

  mongoose.disconnect();
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });

