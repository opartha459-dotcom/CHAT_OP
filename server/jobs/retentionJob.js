const mongoose = require('mongoose');
const User = require('../models/User');
const Status = require('../models/Status');
const Conversation = require('../models/Conversation');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');

/**
 * Execute systematic data retention and purge policies
 */
const runRetentionPurge = async () => {
  const now = new Date();
  const report = {
    startedAt: now.toISOString(),
    statusesPurged: 0,
    accountsPurged: 0,
    invitesCleaned: 0,
    tokensCleaned: 0,
    errors: []
  };

  if (mongoose.connection.readyState !== 1) {
    report.message = 'Database not connected, skipping retention cycle';
    return { success: false, report };
  }

  try {
    // 1. Purge expired 24h statuses
    const statusRes = await Status.deleteMany({ expiresAt: { $lt: now } });
    report.statusesPurged = statusRes.deletedCount || 0;

    // 2. Purge accounts whose 14-day recovery deadline has lapsed
    const expiredAccounts = await User.find({
      deletionStatus: 'confirmed_pending_purge',
      recoveryDeadline: { $lt: now }
    });

    for (const user of expiredAccounts) {
      try {
        const userId = user._id;

        // Revoke all sessions
        await Session.deleteMany({ user: userId });

        // Remove from conversation participants
        await Conversation.updateMany(
          { participants: userId },
          {
            $pull: {
              participants: userId,
              'groupDetails.admins': userId,
              pinnedBy: userId,
              archivedBy: userId,
              mutedBy: userId
            }
          }
        );

        // Close any open recovery requests
        await AccountRecoveryRequest.updateMany(
          { user: userId, status: 'pending' },
          { status: 'expired', decidedAt: now, reason: 'Retention window elapsed without approved recovery.' }
        );

        // Anonymize and finalize purge (prevents orphan document FK crashes while freeing email/username)
        user.deletionStatus = 'purged';
        user.isDeactivated = true;
        user.email = `purged_${Date.now()}_${user._id}@deleted.local`;
        user.username = `deleted_${Date.now()}_${user._id.toString().slice(-4)}`;
        user.nickname = 'Deleted User';
        user.avatar = '';
        user.bio = '';
        user.passwordResetToken = null;
        user.emailVerificationToken = null;
        user.deletionConfirmationToken = null;
        await user.save();

        // Audit log
        await AuditLog.create({
          action: 'SYSTEM_RETENTION_PURGE',
          targetType: 'User',
          targetId: userId,
          details: {
            reason: '14-day retention window expired. Account permanently anonymized and purged.'
          }
        }).catch(() => {});

        report.accountsPurged++;
      } catch (userPurgeErr) {
        report.errors.push(`Account ${user._id}: ${userPurgeErr.message}`);
      }
    }

    // 3. Clean up expired group invite codes
    const inviteRes = await Conversation.updateMany(
      {
        type: 'group',
        'groupDetails.inviteExpiresAt': { $lt: now }
      },
      {
        $unset: {
          'groupDetails.inviteCode': '',
          'groupDetails.inviteExpiresAt': ''
        }
      }
    );
    report.invitesCleaned = inviteRes.modifiedCount || 0;

    // 4. Invalidate expired password reset and deletion tokens
    const tokenRes = await User.updateMany(
      {
        $or: [
          { passwordResetExpires: { $lt: now } },
          { deletionConfirmationExpires: { $lt: now } }
        ]
      },
      {
        $set: {
          passwordResetToken: null,
          passwordResetExpires: null,
          deletionConfirmationToken: null,
          deletionConfirmationExpires: null
        }
      }
    );
    report.tokensCleaned = tokenRes.modifiedCount || 0;

    report.completedAt = new Date().toISOString();
    return { success: true, report };
  } catch (error) {
    console.error('[Retention Job Error]', error);
    report.errors.push(error.message);
    return { success: false, report, error: error.message };
  }
};

/**
 * Initialize background cron schedule (runs every 6 hours)
 */
const initRetentionSchedule = () => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  // Run once shortly after startup
  const startupTimer = setTimeout(() => {
    runRetentionPurge()
      .then((res) => console.log('[Retention] Initial startup purge pass executed:', res.report))
      .catch((err) => console.error('[Retention Error] Initial startup pass error:', err));
  }, 10000);
  startupTimer.unref();

  // Recurring interval
  const intervalTimer = setInterval(() => {
    runRetentionPurge()
      .then((res) => console.log('[Retention] Scheduled purge pass executed:', res.report))
      .catch((err) => console.error('[Retention Error] Scheduled pass error:', err));
  }, SIX_HOURS);
  intervalTimer.unref();
};

module.exports = {
  runRetentionPurge,
  initRetentionSchedule
};
