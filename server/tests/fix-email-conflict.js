require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulsechat').then(async () => {
  const User = require('../models/User');

  console.log('=== ALL USERS ===');
  const all = await User.find({}).select('_id username email deletionStatus archivedEmail');
  all.forEach(u => console.log(`  [${u._id}] @${u.username} | ${u.email} | status=${u.deletionStatus || 'active'} | archived=${u.archivedEmail || '-'}`));

  // Find any user with the target email regardless of status
  const target = await User.find({ email: 'parthabatabyal.03.30.2004@gmail.com' }).select('_id username email deletionStatus');
  console.log('\n=== USERS WITH TARGET EMAIL ===');
  target.forEach(u => console.log(`  [${u._id}] @${u.username} | ${u.email} | status=${u.deletionStatus}`));

  if (target.length > 0) {
    console.log('\n=== FIXING: Archiving email on all found users ===');
    for (const u of target) {
      const archiveEmail = `archived_${u._id}_${Date.now()}@archive.pulsechat.internal`;
      await User.updateOne(
        { _id: u._id },
        { $set: { email: archiveEmail, archivedEmail: 'parthabatabyal.03.30.2004@gmail.com' } }
      );
      console.log(`  Fixed @${u.username}: email renamed to ${archiveEmail}`);
    }
    console.log('Done — email freed up. You can now create the new account.');
  } else {
    console.log('No user found with that email — DB may already be clean.');
  }

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });

