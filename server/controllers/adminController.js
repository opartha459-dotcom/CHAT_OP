const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');

// @desc Get moderation dashboard overview statistics
// @route GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, activeToday, bannedUsers, totalGroups, totalMessages, pendingReports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }),
      User.countDocuments({ isBanned: true }),
      Conversation.countDocuments({ type: 'group' }),
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
        select: 'content fileUrl sender createdAt',
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

module.exports = {
  getDashboardStats,
  getUsers,
  banUser,
  unbanUser,
  updateUserRole,
  getReports,
  resolveReport,
  getAuditLogs
};
