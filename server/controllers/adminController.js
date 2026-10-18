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

// @desc Delete a user permanently
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin' && targetUser._id.toString() === adminUser._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    // Revoke sessions
    await Session.deleteMany({ user: targetUser._id });

    // Clean up references in conversations
    await Conversation.updateMany(
      { participants: targetUser._id },
      {
        $pull: {
          participants: targetUser._id,
          'groupDetails.admins': targetUser._id,
          pinnedBy: targetUser._id,
          archivedBy: targetUser._id,
          mutedBy: targetUser._id
        }
      }
    );

    // Delete user
    await User.findByIdAndDelete(id);

    // Audit log
    await AuditLog.create({
      actor: adminUser._id,
      action: 'USER_DELETE',
      targetType: 'User',
      targetId: targetUser._id,
      details: { username: targetUser.username, email: targetUser.email, role: targetUser.role },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `User @${targetUser.username} has been permanently deleted.`
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

module.exports = {
  getDashboardStats,
  getUsers,
  deleteUser,
  banUser,
  unbanUser,
  updateUserRole,
  getReports,
  resolveReport,
  getAuditLogs,
  getAllChats,
  getChatMessages,
  deleteChat,
  deleteAdminMessage
};
