const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

// @desc Get moderation dashboard overview statistics
// @route GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, activeToday, bannedUsers, totalGroups, totalDirectChats, totalMessages, pendingReports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }),
      User.countDocuments({ isBanned: true }),
      Conversation.countDocuments({ type: 'group' }),
      Conversation.countDocuments({ type: 'private' }),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeToday,
        bannedUsers,
        totalGroups,
        totalDirectChats,
        totalMessages,
        pendingReports
      }
    });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving system statistics.' });
  }
};

// @desc Get users list for admin management
// @route GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { query, role, isBanned, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (query) {
      filter.$or = [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { nickname: { $regex: query, $options: 'i' } }
      ];
    }

    if (role) filter.role = role;
    if (isBanned !== undefined) filter.isBanned = isBanned === 'true';

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      users,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
};

// @desc Ban a user
// @route POST /api/admin/users/:id/ban
const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Violation of community guidelines' } = req.body;
    const adminUser = req.user;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot ban another administrator.' });
    }

    targetUser.isBanned = true;
    targetUser.banReason = reason;
    targetUser.bannedAt = new Date();
    targetUser.status = 'offline';
    await targetUser.save();

    // Revoke all sessions
    await Session.updateMany({ user: targetUser._id }, { isValid: false });

    // Record audit log
    await AuditLog.create({
      actor: adminUser._id,
      action: 'USER_BAN',
      targetType: 'User',
      targetId: targetUser._id,
      details: { username: targetUser.username, reason },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `User @${targetUser.username} has been banned.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error banning user.' });
  }
};

// @desc Unban a user
// @route POST /api/admin/users/:id/unban
const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    targetUser.isBanned = false;
    targetUser.banReason = '';
    targetUser.bannedAt = null;
    await targetUser.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: 'USER_UNBAN',
      targetType: 'User',
      targetId: targetUser._id,
      details: { username: targetUser.username },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `User @${targetUser.username} has been unbanned.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error unbanning user.' });
  }
};

// @desc Update user role
// @route POST /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'admin' or 'user'
    const adminUser = req.user;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: 'ROLE_CHANGE',
      targetType: 'User',
      targetId: targetUser._id,
      details: { username: targetUser.username, oldRole, newRole: role },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `User @${targetUser.username} role changed to ${role}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating role.' });
  }
};

// @desc Edit user profile details (Admin only)
// @route PUT /api/admin/users/:id
const updateUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, bio, role, isEmailVerified, email } = req.body;
    const adminUser = req.user;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (nickname !== undefined) user.nickname = nickname.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (role !== undefined && ['user', 'admin'].includes(role)) user.role = role;
    if (isEmailVerified !== undefined) user.isEmailVerified = Boolean(isEmailVerified);

    await user.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: 'USER_EDIT',
      targetType: 'User',
      targetId: user._id,
      details: { username: user.username, role: user.role, nickname: user.nickname },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `User @${user.username} updated.`, user: user.toJSON() });
  } catch (error) {
    console.error('[Admin Update User Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating user.' });
  }
};

// @desc Get reports list
// @route GET /api/admin/reports
const getReports = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .populate('reporter', 'username nickname avatar')
      .populate('reportedUser', 'username nickname avatar isBanned')
      .populate({
        path: 'reportedMessage',
        select: 'content fileUrl sender createdAt isEncrypted encryptionMetadata conversation',
        populate: { path: 'sender', select: 'username nickname' }
      })
      .populate('reportedGroup', 'groupDetails.name groupDetails.avatar')
      .populate('resolvedBy', 'username nickname')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching reports.' });
  }
};

// @desc Resolve report
// @route POST /api/admin/reports/:id/resolve
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body; // status: 'resolved' | 'dismissed'
    const adminUser = req.user;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    report.status = status || 'resolved';
    report.actionTaken = actionTaken || 'Reviewed and addressed.';
    report.resolvedBy = adminUser._id;
    report.resolvedAt = new Date();
    await report.save();

    await AuditLog.create({
      actor: adminUser._id,
      action: 'REPORT_RESOLVE',
      targetType: 'Report',
      targetId: report._id,
      details: { status: report.status, actionTaken: report.actionTaken },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Report resolved successfully.', report });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error resolving report.' });
  }
};

// @desc Get audit logs
// @route GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'username nickname avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching audit logs.' });
  }
};

// @desc Delete audit logs (batch or clear all)
// @route DELETE /api/admin/audit-logs
const deleteAuditLogs = async (req, res) => {
  try {
    const { ids, all } = req.body || {};

    if (all) {
      const result = await AuditLog.deleteMany({});
      return res.json({
        success: true,
        message: `All ${result.deletedCount || 0} audit logs cleared.`
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select audit logs to delete.' });
    }

    const result = await AuditLog.deleteMany({ _id: { $in: ids } });
    return res.json({
      success: true,
      message: `${result.deletedCount || 0} audit logs deleted.`
    });
  } catch (error) {
    console.error('[Delete Audit Logs Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting audit logs.' });
  }
};

// @desc Delete a user permanently
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    const adminUser = req.user;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin' && targetUser._id.toString() === adminUser._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    // Store user info before deletion
    const { email, username, _id: userId } = targetUser;

    // Force-logout via socket BEFORE deleting sessions so the event still fires
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('admin:force_logout', { reason });
    }

    // Revoke sessions
    await Session.deleteMany({ user: userId });

    // Clean up references in conversations
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

    // Delete user
    await User.findByIdAndDelete(id);

    // Send deletion email with reason and appeal link (non-blocking)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const appealUrl = `${clientUrl}/deletion-appeal?email=${encodeURIComponent(email)}`;
    emailService.sendAdminDeletionEmail(email, username, reason, appealUrl).catch((err) => {
      console.warn('[Admin Delete] Email send error:', err.message);
    });

    // Audit log
    await AuditLog.create({
      actor: adminUser._id,
      action: 'USER_DELETE',
      targetType: 'User',
      targetId: userId,
      details: { username, email, role: targetUser.role, reason },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `User @${username} has been permanently deleted.`
    });
  } catch (error) {
    console.error('[Admin Delete User Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting user.' });
  }
};

// @desc Get all conversations across the system for admin oversight
// @route GET /api/admin/chats
const getAllChats = async (req, res) => {
  try {
    const { query, type, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (type && ['private', 'group'].includes(type)) {
      filter.type = type;
    }

    if (query) {
      const matchedUsers = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { nickname: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).select('_id');
      const matchedUserIds = matchedUsers.map((u) => u._id);

      filter.$or = [
        { 'groupDetails.name': { $regex: query, $options: 'i' } },
        { participants: { $in: matchedUserIds } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', 'username nickname email avatar isBanned role status')
        .populate('groupDetails.owner', 'username nickname avatar')
        .populate('groupDetails.admins', 'username nickname avatar')
        .populate({
          path: 'lastMessage',
          select: 'content messageType fileUrl sender createdAt isEncrypted encryptionMetadata',
          populate: { path: 'sender', select: 'username nickname' }
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Conversation.countDocuments(filter)
    ]);

    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await Message.countDocuments({ conversation: conv._id });
        return {
          ...conv,
          messageCount
        };
      })
    );

    return res.json({
      success: true,
      conversations: conversationsWithCounts,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('[Admin Get Chats Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving chats.' });
  }
};

// @desc Get all messages for a specific conversation for admin inspection
// @route GET /api/admin/chats/:id/messages
const getChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 200 } = req.query;

    const conversation = await Conversation.findById(id)
      .populate('participants', 'username nickname email avatar isBanned role status')
      .populate('groupDetails.owner', 'username nickname avatar')
      .populate('groupDetails.admins', 'username nickname avatar')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversation: id })
      .populate('sender', 'username nickname email avatar role')
      .populate({
        path: 'replyTo',
        select: 'content fileUrl sender messageType isEncrypted encryptionMetadata',
        populate: { path: 'sender', select: 'username nickname' }
      })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({
      success: true,
      conversation,
      messages
    });
  } catch (error) {
    console.error('[Admin Get Messages Error]', error);
    return res.status(500).json({ success: false, message: 'Error fetching chat messages.' });
  }
};

// @desc Delete an entire conversation and its messages
// @route DELETE /api/admin/chats/:id
const deleteChat = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messageCount = await Message.countDocuments({ conversation: id });
    await Message.deleteMany({ conversation: id });
    await Conversation.findByIdAndDelete(id);

    await AuditLog.create({
      actor: adminUser._id,
      action: 'CHAT_DELETE',
      targetType: 'Conversation',
      targetId: id,
      details: {
        type: conversation.type,
        name: conversation.type === 'group' ? conversation.groupDetails?.name : 'Private Chat',
        deletedMessages: messageCount
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Conversation and all associated messages have been deleted.'
    });
  } catch (error) {
    console.error('[Admin Delete Chat Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting conversation.' });
  }
};

// @desc Delete an inappropriate message from any chat
// @route DELETE /api/admin/messages/:id
const deleteAdminMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    await Message.findByIdAndDelete(id);

    await AuditLog.create({
      actor: adminUser._id,
      action: 'MESSAGE_DELETE',
      targetType: 'Message',
      targetId: id,
      details: {
        conversation: message.conversation,
        sender: message.sender,
        contentPreview: message.content ? message.content.substring(0, 50) : '[attachment]'
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Message has been removed.'
    });
  } catch (error) {
    console.error('[Admin Delete Message Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting message.' });
  }
};

// @desc Get database health and connection status
// @route GET /api/admin/database/status
const getDatabaseStatus = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const SystemConfig = require('../models/SystemConfig');

    const startPing = Date.now();
    let isHealthy = false;
    let latencyMs = 0;

    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        latencyMs = Date.now() - startPing;
        isHealthy = true;
      }
    } catch (pingErr) {
      latencyMs = Date.now() - startPing;
      isHealthy = false;
    }

    const [userCount, convCount, msgCount, auditCount, reportCount] = await Promise.all([
      User.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
      AuditLog.countDocuments(),
      Report.countDocuments()
    ]);

    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }

    const stateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const connectionState = stateMap[mongoose.connection.readyState] || 'unknown';

    const multiDb = require('../config/multiDb');
    const multiDbReport = await multiDb.getDatabaseStatus().catch(() => null);

    return res.json({
      success: true,
      database: {
        status: isHealthy ? 'healthy' : 'degraded',
        connectionState,
        latencyMs,
        host: mongoose.connection.host || '127.0.0.1',
        name: mongoose.connection.name || 'pulsechat',
        collections: {
          users: userCount,
          conversations: convCount,
          messages: msgCount,
          auditLogs: auditCount,
          reports: reportCount
        },
        assignments: config.databaseAssignments,
        retentionSettings: config.retentionSettings,
        categories: multiDbReport ? multiDbReport.categories : null
      }
    });
  } catch (error) {
    console.error('[Admin DB Status Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to inspect database health.' });
  }
};

// @desc Manually trigger retention policy execution
// @route POST /api/admin/retention/run
const runManualRetention = async (req, res) => {
  try {
    const { runRetentionPurge } = require('../jobs/retentionJob');
    const result = await runRetentionPurge();
    return res.json({
      success: true,
      message: 'Retention policy execution completed.',
      report: result.report
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to run retention execution.' });
  }
};

// @desc Get complete storage metrics for free-tier MongoDB optimization
// @route GET /api/admin/storage/metrics
const getStorageMetrics = async (req, res) => {
  try {
    const User = require('../models/User');
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');
    const Session = require('../models/Session');
    const VerificationCode = require('../models/VerificationCode');
    const AuditLog = require('../models/AuditLog');
    const Notification = require('../models/Notification');
    const Report = require('../models/Report');
    const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
    const Status = require('../models/Status');
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [
      totalUsers,
      totalConversations,
      totalMessages,
      mediaMessages,
      totalSessions,
      expiredSessions,
      totalCodes,
      pendingCodes,
      expiredCodes,
      totalAuditLogs,
      oldAuditLogs,
      totalNotifications,
      readNotifications,
      totalReports,
      totalRecoveries,
      totalStatuses,
      totalMaintenance,
      pastMaintenance
    ] = await Promise.all([
      User.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ mediaUrl: { $exists: true, $ne: '' } }),
      Session.countDocuments(),
      Session.countDocuments({ expiresAt: { $lt: now } }),
      VerificationCode.countDocuments(),
      VerificationCode.countDocuments({ status: 'pending' }),
      VerificationCode.countDocuments({ $or: [{ expiresAt: { $lt: now } }, { status: { $in: ['used', 'expired'] } }] }),
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: true, createdAt: { $lt: thirtyDaysAgo } }),
      Report.countDocuments(),
      AccountRecoveryRequest.countDocuments(),
      Status ? Status.countDocuments() : 0,
      MaintenanceSchedule ? MaintenanceSchedule.countDocuments() : 0,
      MaintenanceSchedule ? MaintenanceSchedule.countDocuments({ status: { $in: ['completed', 'cancelled'] } }) : 0
    ]);

    const estimatedSizeBytes = (
      totalUsers * 1200 +
      totalConversations * 1000 +
      totalMessages * 850 +
      totalSessions * 400 +
      totalCodes * 300 +
      totalAuditLogs * 650 +
      totalNotifications * 350 +
      totalReports * 800 +
      totalRecoveries * 1000 +
      totalStatuses * 500 +
      totalMaintenance * 600
    );

    const freeTierQuotaBytes = 512 * 1024 * 1024; // 512 MB
    const usagePercent = Math.min(100, Math.round((estimatedSizeBytes / freeTierQuotaBytes) * 1000) / 10);

    return res.json({
      success: true,
      storage: {
        totalDocuments: totalUsers + totalConversations + totalMessages + totalSessions + totalCodes + totalAuditLogs + totalNotifications + totalReports + totalRecoveries + totalStatuses + totalMaintenance,
        estimatedSizeBytes,
        estimatedSizeMB: (estimatedSizeBytes / (1024 * 1024)).toFixed(2),
        freeTierQuotaMB: 512,
        usagePercent,
        warning: usagePercent > 70 ? 'Storage usage is high (> 70% of free tier). Clean up obsolete sessions, logs, or codes.' : null,
        breakdown: {
          users: { count: totalUsers, deletable: 0 },
          conversations: { count: totalConversations, deletable: 0 },
          messages: { count: totalMessages, mediaCount: mediaMessages, deletable: 0 },
          sessions: { count: totalSessions, expiredCount: expiredSessions, cleanable: expiredSessions },
          verificationCodes: { count: totalCodes, pendingCount: pendingCodes, expiredCount: expiredCodes, cleanable: expiredCodes },
          auditLogs: { count: totalAuditLogs, olderThan30Days: oldAuditLogs, cleanable: oldAuditLogs },
          notifications: { count: totalNotifications, readOldCount: readNotifications, cleanable: readNotifications },
          maintenance: { count: totalMaintenance, pastCount: pastMaintenance, cleanable: pastMaintenance },
          reports: { count: totalReports },
          recoveries: { count: totalRecoveries },
          statuses: { count: totalStatuses }
        }
      }
    });
  } catch (error) {
    console.error('[Storage Metrics Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to compute storage metrics.' });
  }
};

// @desc Perform targeted or bulk database cleanup for storage optimization
// @route POST /api/admin/storage/cleanup
const runStorageCleanup = async (req, res) => {
  try {
    const Session = require('../models/Session');
    const VerificationCode = require('../models/VerificationCode');
    const AuditLog = require('../models/AuditLog');
    const Notification = require('../models/Notification');
    const Status = require('../models/Status');

    const { target } = req.body; // 'sessions' | 'codes' | 'audit_logs' | 'notifications' | 'statuses' | 'all'
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const summary = {};
    let totalPurged = 0;

    if (target === 'sessions' || target === 'all') {
      const resSession = await Session.deleteMany({ expiresAt: { $lt: now } });
      summary.expiredSessions = resSession.deletedCount;
      totalPurged += resSession.deletedCount;
    }

    if (target === 'codes' || target === 'all') {
      const resCodes = await VerificationCode.deleteMany({
        $or: [
          { expiresAt: { $lt: now } },
          { status: { $in: ['used', 'expired'] } }
        ]
      });
      summary.expiredVerificationCodes = resCodes.deletedCount;
      totalPurged += resCodes.deletedCount;
    }

    if (target === 'audit_logs' || target === 'all') {
      const resLogs = await AuditLog.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      summary.oldAuditLogs = resLogs.deletedCount;
      totalPurged += resLogs.deletedCount;
    }

    if (target === 'notifications' || target === 'all') {
      const resNotif = await Notification.deleteMany({
        $or: [
          { isRead: true, createdAt: { $lt: thirtyDaysAgo } },
          { createdAt: { $lt: new Date(Date.now() - 60 * 24 * 3600 * 1000) } }
        ]
      });
      summary.oldNotifications = resNotif.deletedCount;
      totalPurged += resNotif.deletedCount;
    }

    if (target === 'statuses' || target === 'all') {
      if (Status) {
        const resStatus = await Status.deleteMany({ expiresAt: { $lt: now } });
        summary.expiredStatuses = resStatus.deletedCount;
        totalPurged += resStatus.deletedCount;
      }
    }

    if (target === 'maintenance' || target === 'all') {
      const MaintenanceSchedule = require('../models/MaintenanceSchedule');
      if (MaintenanceSchedule) {
        const resMaint = await MaintenanceSchedule.deleteMany({ status: { $in: ['completed', 'cancelled'] } });
        summary.pastMaintenanceHistory = resMaint.deletedCount;
        totalPurged += resMaint.deletedCount;
      }
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'STORAGE_CLEANUP_PERFORMED',
      targetType: 'SystemStorage',
      details: { target, summary, totalPurged },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Storage optimization complete. Successfully purged ${totalPurged} obsolete record(s).`,
      summary,
      totalPurged
    });
  } catch (error) {
    console.error('[Storage Cleanup Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to run storage cleanup.' });
  }
};

// @desc Get runtime system settings & feature flags
// @route GET /api/admin/settings
const getSystemSettings = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }

    return res.json({
      success: true,
      settings: config
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve system settings.' });
  }
};

// @desc Update runtime system settings & feature flags
// @route PUT /api/admin/settings
const updateSystemSettings = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const { featureFlags, databaseAssignments, retentionSettings } = req.body;

    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = new SystemConfig({ key: 'system_settings' });
    }

    if (featureFlags) {
      config.featureFlags = { ...config.featureFlags, ...featureFlags };
    }
    if (req.body.defaultTheme) {
      config.defaultTheme = {
        ...(config.defaultTheme ? (config.defaultTheme.toObject ? config.defaultTheme.toObject() : config.defaultTheme) : {}),
        ...req.body.defaultTheme
      };
    }
    if (databaseAssignments) {
      config.databaseAssignments = { ...config.databaseAssignments, ...databaseAssignments };
    }
    if (retentionSettings) {
      config.retentionSettings = { ...config.retentionSettings, ...retentionSettings };
    }

    config.lastUpdatedBy = req.user._id;
    await config.save();

    // Broadcast feature flag updates to all connected clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('system:features_updated', config.featureFlags);
      if (req.body.defaultTheme) {
        io.emit('system:theme_updated', config.defaultTheme);
      }
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'update_system_settings',
      details: 'Updated system feature flags or database assignments',
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'System settings updated successfully.',
      settings: config
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
};

// @desc Get public/client feature flags
// @route GET /api/system/features
const getPublicFeatureFlags = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }
    const DEFAULT_FLAGS = {
      chatEnabled: true,
      statusesEnabled: true,
      callsEnabled: true,
      fileSharingEnabled: true,
      userRegistrationEnabled: true,
      notificationsEnabled: true,
      voiceMessagesEnabled: true,
      pollsEnabled: true,
      announcementsEnabled: true,
      e2eeEnabled: true,
      customAvatarUpload: true
    };

    return res.json({
      success: true,
      featureFlags: {
        ...DEFAULT_FLAGS,
        ...(config?.featureFlags || {})
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching feature flags',
      featureFlags: {
        chatEnabled: true,
        statusesEnabled: true,
        callsEnabled: true,
        fileSharingEnabled: true,
        userRegistrationEnabled: true,
        notificationsEnabled: true,
        voiceMessagesEnabled: true,
        pollsEnabled: true,
        announcementsEnabled: true,
        e2eeEnabled: true,
        customAvatarUpload: true
      }
    });
  }
};

// @desc Get public default application theme & typography
// @route GET /api/system/theme
const getPublicTheme = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }
    const DEFAULT_THEME = {
      accentColor: 'indigo',
      primaryColor: '#6366f1',
      primaryHover: '#4f46e5',
      primaryLight: 'rgba(99, 102, 241, 0.15)',
      primaryBorder: 'rgba(99, 102, 241, 0.35)',
      secondaryColor: '#10b981',
      mode: 'dark',
      fontFamily: 'Inter',
      fontSize: 'medium',
      fontWeightNormal: '400',
      fontWeightHeading: '700',
      headingLetterSpacing: '-0.02em',
      headingTransform: 'none'
    };

    return res.json({
      success: true,
      defaultTheme: {
        ...DEFAULT_THEME,
        ...(config?.defaultTheme || {})
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching theme settings'
    });
  }
};

// @desc Update system default theme & typography
// @route PUT /api/admin/theme
const updateSystemTheme = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const { defaultTheme } = req.body;

    if (!defaultTheme || typeof defaultTheme !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid theme configuration provided.' });
    }

    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = new SystemConfig({ key: 'system_settings' });
    }

    config.defaultTheme = {
      ...(config.defaultTheme ? (config.defaultTheme.toObject ? config.defaultTheme.toObject() : config.defaultTheme) : {}),
      ...defaultTheme
    };
    config.lastUpdatedBy = req.user._id;
    await config.save();

    // Broadcast theme updates to all connected clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('system:theme_updated', config.defaultTheme);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'update_system_theme',
      details: `Updated default application theme (${config.defaultTheme.primaryColor || ''}, ${config.defaultTheme.fontFamily || ''})`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'System default theme & typography updated successfully.',
      defaultTheme: config.defaultTheme
    });
  } catch (error) {
    console.error('[Admin Theme Update Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update system theme.' });
  }
};

// @desc Get public landing page configuration
// @route GET /api/system/landing
const getPublicLandingConfig = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }

    return res.json({
      success: true,
      landingPageConfig: config.landingPageConfig
    });
  } catch (error) {
    console.error('[Get Landing Config Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching landing page configuration'
    });
  }
};

// @desc Get landing page configuration for admin
// @route GET /api/admin/landing
const getLandingConfig = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }

    return res.json({
      success: true,
      landingPageConfig: config.landingPageConfig
    });
  } catch (error) {
    console.error('[Get Admin Landing Config Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching landing page configuration'
    });
  }
};

// @desc Update landing page configuration (images, text, features, sections)
// @route PUT /api/admin/landing
const updateLandingConfig = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const { landingPageConfig } = req.body;

    if (!landingPageConfig || typeof landingPageConfig !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid landing page configuration provided.' });
    }

    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = new SystemConfig({ key: 'system_settings' });
    }

    config.landingPageConfig = {
      ...(config.landingPageConfig ? (config.landingPageConfig.toObject ? config.landingPageConfig.toObject() : config.landingPageConfig) : {}),
      ...landingPageConfig
    };
    config.lastUpdatedBy = req.user._id;
    await config.save();

    // Broadcast landing page updates to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('system:landing_updated', config.landingPageConfig);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'update_landing_page',
      details: 'Updated landing page CMS configuration (text, images, features)',
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Landing page configuration updated successfully.',
      landingPageConfig: config.landingPageConfig
    });
  } catch (error) {
    console.error('[Update Landing Config Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating landing page configuration'
    });
  }
};

// @desc Get public official contact info
// @route GET /api/system/contact
const getPublicContact = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }
    const contact = config.officialContact || {};
    return res.json({
      success: true,
      contact: contact.enabled ? contact : { enabled: false }
    });
  } catch (error) {
    console.error('[Get Public Contact Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve official contact details' });
  }
};

// @desc Get official contact configuration for admin
// @route GET /api/admin/contact
const getAdminContact = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'system_settings' }).lean();
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings' });
    }
    return res.json({
      success: true,
      contact: config.officialContact || {}
    });
  } catch (error) {
    console.error('[Get Admin Contact Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin contact details' });
  }
};

// @desc Update official contact details
// @route PUT /api/admin/contact
const updateAdminContact = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const { contact } = req.body;
    if (!contact || typeof contact !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid contact configuration provided' });
    }

    let config = await SystemConfig.findOne({ key: 'system_settings' });
    if (!config) {
      config = new SystemConfig({ key: 'system_settings' });
    }

    config.officialContact = {
      ...(config.officialContact ? (config.officialContact.toObject ? config.officialContact.toObject() : config.officialContact) : {}),
      ...contact
    };
    config.lastUpdatedBy = req.user._id;
    await config.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('system:contact_updated', config.officialContact);
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'OFFICIAL_CONTACT_UPDATED',
      targetType: 'SystemConfig',
      targetId: config._id,
      details: { phone: config.officialContact.phone, enabled: config.officialContact.enabled },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Official contact details updated and broadcast to all users.',
      contact: config.officialContact
    });
  } catch (error) {
    console.error('[Update Admin Contact Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update official contact details' });
  }
};

// @desc Get all account recovery requests
// @route GET /api/admin/recoveries
const getRecoveryRequests = async (req, res) => {
  try {
    const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
    const requests = await AccountRecoveryRequest.find()
      .populate('user', 'username email deletionStatus recoveryDeadline createdAt')
      .populate('newAccount', 'username email createdAt')
      .populate('decidedBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve recovery requests.' });
  }
};

// @desc Approve or Reject a whole account recovery request (restore OR full migration)
// @route POST /api/admin/recoveries/:id/resolve
const resolveRecoveryRequest = async (req, res) => {
  try {
    const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
    const emailService = require('../services/emailService');
    const { id } = req.params;
    const { action, reason = '' } = req.body; // action: 'approve' | 'reject'

    const recoveryReq = await AccountRecoveryRequest.findById(id)
      .populate('user')
      .populate('newAccount', 'username email _id');

    if (!recoveryReq) {
      return res.status(404).json({ success: false, message: 'Recovery request not found.' });
    }
    if (!['pending', 'partial'].includes(recoveryReq.status)) {
      return res.status(400).json({ success: false, message: `Request is already ${recoveryReq.status}.` });
    }

    const targetUser = recoveryReq.user; // old account
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Associated user account record not found.' });
    }

    const isMigration = recoveryReq.requestType === 'data_migration';
    const newAccount  = recoveryReq.newAccount;
    const io          = req.app.get('io');

    if (action === 'approve') {
      recoveryReq.status = 'approved';
      recoveryReq.decidedBy = req.user._id;
      recoveryReq.decidedAt = new Date();
      recoveryReq.adminDecisionReason = reason ||
        (isMigration ? 'Admin approved data migration to new account.' : 'Admin verified ownership and approved restoration.');

      // Approve all pending items too
      recoveryReq.requestedItems = recoveryReq.requestedItems.map(item =>
        item.status === 'pending' ? { ...item.toObject(), status: 'approved', decidedAt: new Date() } : item.toObject()
      );
      await recoveryReq.save();

      if (isMigration && newAccount) {
        targetUser.deletionStatus = 'deleted';
        targetUser.recoveryDeadline = undefined;
        await targetUser.save();

        emailService.sendRecoveryDecisionEmail(
          newAccount.email, newAccount.username, true,
          `Your old account data (@${targetUser.username}) has been approved for migration to your new account (@${newAccount.username}).`
        ).catch(() => {});

        // Real-time: notify the new account user
        if (io) {
          io.to(`user:${newAccount._id}`).emit('recovery:decision', {
            requestId: recoveryReq._id,
            action: 'approved',
            items: recoveryReq.requestedItems
          });
        }

        await AuditLog.create({
          admin: req.user._id,
          action: 'approve_data_migration',
          target: newAccount._id,
          targetModel: 'User',
          details: `Approved data migration: old @${targetUser.username} → new @${newAccount.username}`,
          ipAddress: req.ip
        }).catch(() => {});

        return res.json({
          success: true,
          message: `Data migration approved. Old @${targetUser.username} → new @${newAccount.username}.`
        });

      } else {
        // RESTORE
        targetUser.deletionStatus = 'active';
        targetUser.deletionConfirmedAt = undefined;
        targetUser.recoveryDeadline = undefined;
        await targetUser.save();

        emailService.sendRecoveryDecisionEmail(targetUser.email, targetUser.username, true, reason).catch(() => {});

        if (io) {
          io.to(`user:${targetUser._id}`).emit('recovery:decision', {
            requestId: recoveryReq._id,
            action: 'approved'
          });
        }

        await AuditLog.create({
          admin: req.user._id,
          action: 'approve_account_recovery',
          target: targetUser._id,
          targetModel: 'User',
          details: `Approved account recovery for ${targetUser.username} (${targetUser.email})`,
          ipAddress: req.ip
        }).catch(() => {});

        return res.json({ success: true, message: `Account recovery approved. @${targetUser.username} is now active.` });
      }

    } else {
      // REJECT
      recoveryReq.status = 'rejected';
      recoveryReq.decidedBy = req.user._id;
      recoveryReq.decidedAt = new Date();
      recoveryReq.adminDecisionReason = reason || 'Ownership verification failed.';
      recoveryReq.requestedItems = recoveryReq.requestedItems.map(item =>
        item.status === 'pending' ? { ...item.toObject(), status: 'rejected', adminNote: reason, decidedAt: new Date() } : item.toObject()
      );
      await recoveryReq.save();

      const notifyEmail = isMigration && newAccount ? newAccount.email : targetUser.email;
      const notifyName  = isMigration && newAccount ? newAccount.username : targetUser.username;
      const notifyId    = isMigration && newAccount ? newAccount._id : targetUser._id;
      emailService.sendRecoveryDecisionEmail(notifyEmail, notifyName, false, reason).catch(() => {});

      if (io) {
        io.to(`user:${notifyId}`).emit('recovery:decision', {
          requestId: recoveryReq._id,
          action: 'rejected',
          reason,
          items: recoveryReq.requestedItems
        });
      }

      await AuditLog.create({
        admin: req.user._id,
        action: isMigration ? 'reject_data_migration' : 'reject_account_recovery',
        target: targetUser._id,
        targetModel: 'User',
        details: `Rejected ${isMigration ? 'data migration' : 'account recovery'} for ${targetUser.username}: ${reason}`,
        ipAddress: req.ip
      }).catch(() => {});

      return res.json({
        success: true,
        message: isMigration ? 'Data migration request rejected.' : 'Account recovery request rejected.'
      });
    }
  } catch (error) {
    console.error('[Resolve Recovery Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to process recovery request.' });
  }
};

// @desc Approve or Reject a single data item within a migration request
// @route POST /api/admin/recoveries/:id/items/:itemKey/resolve
const resolveDataItem = async (req, res) => {
  try {
    const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
    const emailService = require('../services/emailService');
    const { id, itemKey } = req.params;
    const { action, adminNote = '' } = req.body;

    const recoveryReq = await AccountRecoveryRequest.findById(id)
      .populate('newAccount', 'username email _id');

    if (!recoveryReq) {
      return res.status(404).json({ success: false, message: 'Recovery request not found.' });
    }

    const item = recoveryReq.requestedItems.find(i => i.key === itemKey);
    if (!item) {
      return res.status(404).json({ success: false, message: `Item "${itemKey}" not found in this request.` });
    }

    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.adminNote = adminNote;
    item.decidedAt = new Date();

    // Recalculate overall status
    const statuses = recoveryReq.requestedItems.map(i => i.status);
    if (statuses.every(s => s === 'approved')) recoveryReq.status = 'approved';
    else if (statuses.every(s => s === 'rejected')) recoveryReq.status = 'rejected';
    else if (statuses.some(s => s !== 'pending')) recoveryReq.status = 'partial';

    recoveryReq.decidedBy = req.user._id;
    await recoveryReq.save();

    const io = req.app.get('io');
    if (io && recoveryReq.newAccount) {
      io.to(`user:${recoveryReq.newAccount._id}`).emit('recovery:item_decision', {
        requestId: recoveryReq._id,
        itemKey,
        action,
        adminNote,
        overallStatus: recoveryReq.status,
        items: recoveryReq.requestedItems
      });
    }

    await AuditLog.create({
      admin: req.user._id,
      action: `${action}_data_item`,
      target: recoveryReq.newAccount?._id || recoveryReq.user,
      targetModel: 'User',
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} data item "${itemKey}" for migration request ${id}`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Item "${itemKey}" ${action === 'approve' ? 'approved' : 'rejected'}.`,
      item,
      overallStatus: recoveryReq.status
    });
  } catch (error) {
    console.error('[Resolve Data Item Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve data item.' });
  }
};

// @desc Delete one or multiple recovery/migration requests
// @route DELETE /api/admin/recoveries
const deleteRecoveryRequests = async (req, res) => {
  try {
    const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
    const { ids, all } = req.body;

    let result;
    if (all) {
      result = await AccountRecoveryRequest.deleteMany({});
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await AccountRecoveryRequest.deleteMany({ _id: { $in: ids } });
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids or all=true.' });
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'RECOVERY_REQUESTS_DELETE',
      targetType: 'AccountRecoveryRequest',
      details: all ? 'Cleared all recovery requests' : `Deleted ${result.deletedCount} request(s)`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('[Delete Recovery Requests Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting recovery requests.' });
  }
};

// @desc Get all verification code requests for admin manual dispatch
// @route GET /api/admin/verification-codes
const getVerificationCodes = async (req, res) => {
  try {
    const VerificationCode = require('../models/VerificationCode');
    const { action, status, search, from, to } = req.query;

    const filter = {};
    if (action && action !== 'all') filter.action = action;
    if (status && status !== 'all') filter.status = status;

    if (search) {
      const q = search.trim();
      filter.$or = [
        { code: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } }
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const codes = await VerificationCode.find(filter)
      .populate('user', 'username email avatar')
      .populate('sentBy', 'username')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      success: true,
      codes
    });
  } catch (error) {
    console.error('[Get Verification Codes Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch verification codes.' });
  }
};

// @desc Manually send verification code to user in real-time
// @route POST /api/admin/verification-codes/:id/send
const sendVerificationCode = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const VerificationCode = require('../models/VerificationCode');
    const { id } = req.params;

    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing verification code ID.' });
    }

    const codeDoc = await VerificationCode.findById(id).populate('user', 'username email');
    if (!codeDoc) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    codeDoc.status = 'sent';
    codeDoc.sentBy = req.user._id;
    codeDoc.sentAt = new Date();
    await codeDoc.save();

    const io = req.app.get('io');
    if (io) {
      const cleanEmail = (codeDoc.email || '').toLowerCase().trim();
      const payload = {
        code: codeDoc.code,
        action: codeDoc.action,
        email: cleanEmail,
        username: codeDoc.username,
        message: `Your ${codeDoc.action === 'password_reset' ? 'Password Reset' : codeDoc.action === 'account_deletion' ? 'Account Deletion' : 'Email Verification'} Code is ${codeDoc.code}`,
        sentAt: codeDoc.sentAt
      };

      // Emit to email room (for guest / unauthenticated clients on reset/verify page)
      io.to(`email:${cleanEmail}`).emit('auth:code_received', payload);

      // If user document is linked, emit to their authenticated user room as well
      if (codeDoc.user) {
        const targetUserId = (codeDoc.user._id || codeDoc.user).toString();
        io.to(`user:${targetUserId}`).emit('auth:code_received', payload);
        io.to(targetUserId).emit('auth:code_received', payload);
      }

      // If username exists, emit to username room
      if (codeDoc.username) {
        io.to(`username:${codeDoc.username.toLowerCase().trim()}`).emit('auth:code_received', payload);
      }
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'VERIFICATION_CODE_SENT',
      targetType: 'VerificationCode',
      targetId: codeDoc._id,
      details: { email: codeDoc.email, code: codeDoc.code, action: codeDoc.action },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Code ${codeDoc.code} sent to ${codeDoc.email} successfully!`,
      code: codeDoc
    });
  } catch (error) {
    console.error('[Send Verification Code Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification code.' });
  }
};

// @desc Delete verification codes
// @route DELETE /api/admin/verification-codes
const deleteVerificationCodes = async (req, res) => {
  try {
    const VerificationCode = require('../models/VerificationCode');
    const { ids, all } = req.body;

    let result;
    if (all) {
      result = await VerificationCode.deleteMany({});
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await VerificationCode.deleteMany({ _id: { $in: ids } });
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all=true.' });
    }

    return res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('[Delete Verification Codes Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete verification codes.' });
  }
};

// @desc Admin generate verification code for user
// @route POST /api/admin/verification-codes/generate
const generateVerificationCode = async (req, res) => {
  try {
    const crypto = require('crypto');
    const VerificationCode = require('../models/VerificationCode');
    const User = require('../models/User');
    const { email, username, userId, action = 'email_verification', customCode, expiryMinutes = 60, autoDispatch = false } = req.body;

    let targetEmail = (email || '').toLowerCase().trim();
    let targetUsername = (username || '').trim();
    let targetUser = null;

    if (userId) {
      targetUser = await User.findById(userId);
    } else if (targetEmail) {
      targetUser = await User.findOne({ email: targetEmail });
    } else if (targetUsername) {
      targetUser = await User.findOne({ username: targetUsername });
    }

    if (targetUser) {
      targetEmail = targetUser.email;
      targetUsername = targetUser.username;
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'A valid email address or username is required.' });
    }

    const generatedCode = (customCode && /^[0-9]{6}$/.test(customCode.trim()))
      ? customCode.trim()
      : crypto.randomInt(100000, 999999).toString();

    const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
    const hashed = hashToken(generatedCode);
    const expiresAt = new Date(Date.now() + (parseInt(expiryMinutes, 10) || 60) * 60 * 1000);

    if (targetUser) {
      if (action === 'email_verification') {
        targetUser.emailVerificationToken = hashed;
        targetUser.emailVerificationExpires = expiresAt;
      } else if (action === 'password_reset') {
        targetUser.passwordResetToken = hashed;
        targetUser.passwordResetExpires = expiresAt;
      } else if (action === 'account_deletion') {
        targetUser.deletionConfirmationToken = hashed;
        targetUser.deletionConfirmationExpires = expiresAt;
      }
      await targetUser.save();
    }

    await VerificationCode.updateMany(
      { email: targetEmail, action, status: 'pending' },
      { status: 'expired' }
    );

    const codeRecord = await VerificationCode.create({
      code: generatedCode,
      action,
      email: targetEmail,
      username: targetUsername,
      user: targetUser ? targetUser._id : null,
      status: autoDispatch ? 'sent' : 'pending',
      sentBy: autoDispatch ? req.user._id : null,
      sentAt: autoDispatch ? new Date() : null,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    const io = req.app.get('io');
    if (autoDispatch && io) {
      const payload = {
        code: generatedCode,
        action,
        email: targetEmail,
        username: targetUsername,
        message: `Your ${action === 'password_reset' ? 'Password Reset' : action === 'account_deletion' ? 'Account Deletion' : 'Email Verification'} Code is ${generatedCode}`,
        sentAt: codeRecord.sentAt
      };
      io.to(`email:${targetEmail}`).emit('auth:code_received', payload);
      if (targetUser) {
        io.to(`user:${targetUser._id}`).emit('auth:code_received', payload);
        io.to(targetUser._id.toString()).emit('auth:code_received', payload);
      }
      if (targetUsername) {
        io.to(`username:${targetUsername.toLowerCase()}`).emit('auth:code_received', payload);
      }
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'VERIFICATION_CODE_GENERATED',
      targetType: 'VerificationCode',
      targetId: codeRecord._id,
      details: { email: targetEmail, code: generatedCode, action, autoDispatch },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Verification code ${generatedCode} generated for ${targetEmail}${autoDispatch ? ' and dispatched' : ''}.`,
      code: codeRecord
    });
  } catch (error) {
    console.error('[Generate Verification Code Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to generate verification code.' });
  }
};

// @desc Revoke a verification code
// @route POST /api/admin/verification-codes/:id/revoke
const revokeVerificationCode = async (req, res) => {
  try {
    const VerificationCode = require('../models/VerificationCode');
    const User = require('../models/User');
    const { id } = req.params;

    const codeDoc = await VerificationCode.findById(id);
    if (!codeDoc) {
      return res.status(404).json({ success: false, message: 'Verification code not found.' });
    }

    codeDoc.status = 'expired';
    await codeDoc.save();

    if (codeDoc.email) {
      await User.updateOne(
        { email: codeDoc.email.toLowerCase().trim() },
        {
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpires: 1,
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );
    }

    const io = req.app.get('io');
    if (io && codeDoc.email) {
      const cleanEmail = codeDoc.email.toLowerCase().trim();
      io.to(`email:${cleanEmail}`).emit('auth:code_revoked', {
        email: cleanEmail,
        action: codeDoc.action,
        status: 'Code Expired',
        message: 'This verification code has been revoked or expired by an administrator.'
      });
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'VERIFICATION_CODE_REVOKED',
      targetType: 'VerificationCode',
      targetId: codeDoc._id,
      details: { email: codeDoc.email, code: codeDoc.code },
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Verification code successfully revoked.',
      code: codeDoc
    });
  } catch (error) {
    console.error('[Revoke Verification Code Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to revoke verification code.' });
  }
};

/* =========================================================
   SCHEDULED MAINTENANCE MANAGEMENT CONTROLLERS
========================================================= */

// @desc Get all maintenance schedules
// @route GET /api/admin/maintenance
const getMaintenanceSchedules = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const schedules = await MaintenanceSchedule.find()
      .populate('createdBy', 'username email avatar')
      .sort({ createdAt: -1 })
      .lean();

    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const currentState = await getCurrentMaintenanceState();

    return res.json({
      success: true,
      schedules,
      active: currentState.active,
      upcoming: currentState.upcoming
    });
  } catch (error) {
    console.error('[Get Maintenance Schedules Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve maintenance schedules.' });
  }
};

// @desc Create a new maintenance schedule
// @route POST /api/admin/maintenance
const createMaintenanceSchedule = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');

    const {
      title,
      description = '',
      scope = 'full_system',
      affectedFeatures = [],
      startTime,
      endTime,
      isImmediate = false
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Maintenance title is required.' });
    }

    const now = new Date();
    const parsedStart = isImmediate || !startTime ? now : new Date(startTime);
    const parsedEnd = endTime ? new Date(endTime) : null;

    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time.' });
    }

    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end time.' });
    }

    if (parsedEnd && parsedEnd <= parsedStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    const status = isImmediate || parsedStart <= now ? 'active' : 'scheduled';

    if (status === 'active' && scope === 'full_system') {
      await MaintenanceSchedule.updateMany(
        { status: 'active' },
        { $set: { status: 'completed', completedAt: now } }
      );
    }

    const schedule = await MaintenanceSchedule.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      scope,
      affectedFeatures: scope === 'partial' ? affectedFeatures : [],
      status,
      startTime: parsedStart,
      endTime: parsedEnd,
      isImmediate: Boolean(isImmediate),
      createdBy: req.user._id
    });

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('createdBy', 'username email avatar')
      .lean();

    // Broadcast updated state to all connected clients
    const io = req.app.get('io');
    if (io) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'create_maintenance_schedule',
      details: `Created ${status} maintenance: "${title}" (${scope})`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: isImmediate ? 'Maintenance mode activated immediately.' : 'Maintenance successfully scheduled.',
      schedule: populated
    });
  } catch (error) {
    console.error('[Create Maintenance Schedule Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to create maintenance schedule.' });
  }
};

// @desc Update/reschedule an existing maintenance schedule
// @route PUT /api/admin/maintenance/:id
const updateMaintenanceSchedule = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const { id } = req.params;
    const { title, description, scope, affectedFeatures, startTime, endTime } = req.body;

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found.' });
    }

    if (schedule.status === 'completed' || schedule.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit a finished maintenance schedule.' });
    }

    if (title !== undefined) schedule.title = title.trim();
    if (description !== undefined) schedule.description = description.trim();
    if (scope !== undefined) schedule.scope = scope;
    if (affectedFeatures !== undefined) schedule.affectedFeatures = affectedFeatures;

    if (startTime) {
      const s = new Date(startTime);
      if (!isNaN(s.getTime())) schedule.startTime = s;
    }

    if (endTime !== undefined) {
      if (!endTime) {
        schedule.endTime = null;
      } else {
        const e = new Date(endTime);
        if (!isNaN(e.getTime())) schedule.endTime = e;
      }
    }

    await schedule.save();

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('createdBy', 'username email avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'update_maintenance_schedule',
      details: `Updated maintenance: "${schedule.title}"`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Maintenance schedule updated.',
      schedule: populated
    });
  } catch (error) {
    console.error('[Update Maintenance Schedule Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update maintenance schedule.' });
  }
};

// @desc Immediately activate a maintenance schedule
// @route POST /api/admin/maintenance/:id/activate
const activateMaintenanceSchedule = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const { id } = req.params;

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found.' });
    }

    const now = new Date();
    schedule.status = 'active';
    schedule.startTime = now;

    if (schedule.endTime && new Date(schedule.endTime) <= now) {
      schedule.endTime = new Date(now.getTime() + 60 * 60 * 1000);
    }

    if (schedule.scope === 'full_system') {
      await MaintenanceSchedule.updateMany(
        { _id: { $ne: schedule._id }, status: 'active' },
        { $set: { status: 'completed', completedAt: now } }
      );
    }

    await schedule.save();

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('createdBy', 'username email avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'activate_maintenance_schedule',
      details: `Activated maintenance mode: "${schedule.title}"`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Maintenance mode is now active.',
      schedule: populated
    });
  } catch (error) {
    console.error('[Activate Maintenance Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to activate maintenance.' });
  }
};

// @desc Immediately complete/end an active maintenance schedule
// @route POST /api/admin/maintenance/:id/end
const endMaintenanceSchedule = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const { id } = req.params;

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found.' });
    }

    const now = new Date();
    schedule.status = 'completed';
    schedule.completedAt = now;
    schedule.endTime = now;
    await schedule.save();

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('createdBy', 'username email avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'end_maintenance_schedule',
      details: `Ended maintenance: "${schedule.title}"`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Maintenance ended. All services restored.',
      schedule: populated
    });
  } catch (error) {
    console.error('[End Maintenance Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to end maintenance.' });
  }
};

// @desc Cancel a scheduled or active maintenance
// @route DELETE /api/admin/maintenance/:id
const cancelMaintenanceSchedule = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const { id } = req.params;

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found.' });
    }

    if (req.query.permanent === 'true' || schedule.status === 'completed' || schedule.status === 'cancelled') {
      const deletedTitle = schedule.title;
      await MaintenanceSchedule.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: `Maintenance record "${deletedTitle}" permanently deleted.`,
        deletedId: id
      });
    }

    schedule.status = 'cancelled';
    schedule.cancelledAt = new Date();
    await schedule.save();

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('createdBy', 'username email avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      actor: req.user._id,
      admin: req.user._id,
      action: 'cancel_maintenance_schedule',
      details: `Cancelled maintenance schedule: "${schedule.title}"`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Maintenance schedule cancelled.',
      schedule: populated
    });
  } catch (error) {
    console.error('[Cancel Maintenance Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel maintenance.' });
  }
};

// @desc Permanently delete maintenance history records (single or bulk)
// @route DELETE /api/admin/maintenance/history
const deleteMaintenanceHistory = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { ids, all } = req.body || {};
    let query = {};

    if (all || req.query.all === 'true') {
      query = { status: { $in: ['completed', 'cancelled'] } };
    } else if (Array.isArray(ids) && ids.length > 0) {
      query = { _id: { $in: ids } };
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all=true.' });
    }

    const result = await MaintenanceSchedule.deleteMany(query);

    await AuditLog.create({
      actor: req.user._id,
      admin: req.user._id,
      action: 'delete_maintenance_history',
      targetType: 'MaintenanceSchedule',
      details: `Deleted ${result.deletedCount} maintenance history records`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Deleted ${result.deletedCount} maintenance history record(s).`,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('[Delete Maintenance History Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete maintenance history.' });
  }
};

// @desc Permanently delete a single maintenance record (schedule or history item)
// @route DELETE /api/admin/maintenance/:id/permanent
const deleteSingleMaintenance = async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/MaintenanceSchedule');
    const { getCurrentMaintenanceState } = require('../jobs/maintenanceScheduler');
    const { id } = req.params;

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    const deletedTitle = schedule.title;
    const wasActive = schedule.status === 'active';
    await MaintenanceSchedule.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io && wasActive) {
      const currentState = await getCurrentMaintenanceState();
      io.emit('maintenance:updated', currentState);
    }

    await AuditLog.create({
      actor: req.user._id,
      admin: req.user._id,
      action: 'delete_maintenance_record',
      targetType: 'MaintenanceSchedule',
      details: `Permanently removed maintenance record "${deletedTitle}"`,
      ipAddress: req.ip
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Maintenance record "${deletedTitle}" permanently deleted.`,
      deletedId: id
    });
  } catch (error) {
    console.error('[Delete Single Maintenance Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete maintenance record.' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  deleteUser,
  banUser,
  unbanUser,
  updateUserRole,
  updateUserAdmin,
  getReports,
  resolveReport,
  getAuditLogs,
  deleteAuditLogs,
  getPublicFeatureFlags,
  getPublicTheme,
  updateSystemTheme,
  getPublicLandingConfig,
  getLandingConfig,
  updateLandingConfig,
  getPublicContact,
  getAdminContact,
  updateAdminContact,
  getStorageMetrics,
  runStorageCleanup,
  getAllChats,
  getChatMessages,
  deleteChat,
  deleteAdminMessage,
  getDatabaseStatus,
  getSystemSettings,
  updateSystemSettings,
  getRecoveryRequests,
  resolveRecoveryRequest,
  resolveDataItem,
  deleteRecoveryRequests,
  getVerificationCodes,
  sendVerificationCode,
  generateVerificationCode,
  revokeVerificationCode,
  deleteVerificationCodes,
  runManualRetention,
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  activateMaintenanceSchedule,
  endMaintenanceSchedule,
  cancelMaintenanceSchedule,
  deleteMaintenanceHistory,
  deleteSingleMaintenance
};
