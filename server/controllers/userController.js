const User = require('../models/User');
const Block = require('../models/Block');
const Session = require('../models/Session');

// @desc Search users for discovery and adding to chats
// @route GET /api/users/search
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    // Get list of blocked user IDs (both ways)
    const blocks = await Block.find({
      $or: [{ blocker: currentUserId }, { blocked: currentUserId }]
    });

    const excludedUserIds = [
      currentUserId,
      ...blocks.map((b) => (b.blocker.toString() === currentUserId.toString() ? b.blocked : b.blocker))
    ];

    // Privacy protection: Do not expose random or all users. Require at least 2 characters.
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }

    const trimmedQuery = query.trim();
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');

    const filter = {
      _id: { $nin: excludedUserIds },
      isBanned: false,
      isDeactivated: false,
      'privacySettings.profileVisibility': { $ne: 'nobody' },
      $or: [{ username: searchRegex }, { nickname: searchRegex }, { email: searchRegex }]
    };

    const users = await User.find(filter)
      .select('username nickname avatar bio status lastSeen privacySettings e2eePublicKey')
      .limit(30)
      .lean();

    // Mask fields based on privacySettings
    const sanitizedUsers = users.map((u) => {
      const isProfileVisible = u.privacySettings?.profileVisibility !== 'nobody';
      const isLastSeenVisible = u.privacySettings?.lastSeenVisibility !== 'nobody';

      return {
        _id: u._id,
        username: u.username,
        nickname: u.nickname || u.username,
        avatar: isProfileVisible ? u.avatar : '',
        bio: isProfileVisible ? u.bio : '',
        status: isLastSeenVisible ? u.status : 'offline',
        lastSeen: isLastSeenVisible ? u.lastSeen : null,
        e2eePublicKey: u.e2eePublicKey || ''
      };
    });

    return res.json({ success: true, users: sanitizedUsers });
  } catch (error) {
    console.error('[Search Users Error]', error);
    return res.status(500).json({ success: false, message: 'Error searching users.' });
  }
};

// @desc Get user profile by ID
// @route GET /api/users/:id
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: id },
        { blocker: id, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return res.status(404).json({ success: false, message: 'User not found or unavailable.' });
    }

    const targetUser = await User.findById(id)
      .select('username nickname email avatar bio status lastSeen privacySettings chatSettings e2eePublicKey createdAt')
      .lean();

    if (!targetUser || targetUser.isBanned || targetUser.isDeactivated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isOwnProfile = currentUserId.toString() === targetUser._id.toString();

    if (!isOwnProfile) {
      const isProfileVisible = targetUser.privacySettings?.profileVisibility !== 'nobody';
      const isLastSeenVisible = targetUser.privacySettings?.lastSeenVisibility !== 'nobody';

      return res.json({
        success: true,
        user: {
          _id: targetUser._id,
          username: targetUser.username,
          nickname: targetUser.nickname || targetUser.username,
          avatar: isProfileVisible ? targetUser.avatar : '',
          bio: isProfileVisible ? targetUser.bio : '',
          status: isLastSeenVisible ? targetUser.status : 'offline',
          lastSeen: isLastSeenVisible ? targetUser.lastSeen : null,
          e2eePublicKey: targetUser.e2eePublicKey || '',
          createdAt: targetUser.createdAt
        }
      });
    }

    return res.json({ success: true, user: targetUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
};

// @desc Update user profile
// @route PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { nickname, bio, avatar, e2eePublicKey } = req.body;
    const updateData = {};

    if (nickname !== undefined) updateData.nickname = nickname.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (e2eePublicKey !== undefined) updateData.e2eePublicKey = e2eePublicKey;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    return res.json({ success: true, message: 'Profile updated successfully.', user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
};

// @desc Update privacy settings
// @route PUT /api/users/settings/privacy
const updatePrivacySettings = async (req, res) => {
  try {
    const { profileVisibility, lastSeenVisibility, readReceipts, typingIndicators, groupAddPermission } = req.body;
    const user = await User.findById(req.user._id);

    if (profileVisibility !== undefined) user.privacySettings.profileVisibility = profileVisibility;
    if (lastSeenVisibility !== undefined) user.privacySettings.lastSeenVisibility = lastSeenVisibility;
    if (readReceipts !== undefined) user.privacySettings.readReceipts = readReceipts;
    if (typingIndicators !== undefined) user.privacySettings.typingIndicators = typingIndicators;
    if (groupAddPermission !== undefined) user.privacySettings.groupAddPermission = groupAddPermission;

    await user.save();
    return res.json({ success: true, message: 'Privacy settings saved.', privacySettings: user.privacySettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating privacy settings.' });
  }
};

// @desc Update chat settings
// @route PUT /api/users/settings/chat
const updateChatSettings = async (req, res) => {
  try {
    const { theme, accentColor, fontSize, soundEnabled, notificationPreferences } = req.body;
    const user = await User.findById(req.user._id);

    if (theme !== undefined) user.chatSettings.theme = theme;
    if (accentColor !== undefined) user.chatSettings.accentColor = accentColor;
    if (fontSize !== undefined) user.chatSettings.fontSize = fontSize;
    if (soundEnabled !== undefined) user.chatSettings.soundEnabled = soundEnabled;
    if (notificationPreferences !== undefined) {
      user.chatSettings.notificationPreferences = {
        ...user.chatSettings.notificationPreferences,
        ...notificationPreferences
      };
    }

    await user.save();
    return res.json({ success: true, message: 'Chat settings saved.', chatSettings: user.chatSettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating chat settings.' });
  }
};

// @desc Block user
// @route POST /api/users/block/:id
const blockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await Block.findOneAndUpdate(
      { blocker: currentUserId, blocked: targetUserId },
      { blocker: currentUserId, blocked: targetUserId },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: `Successfully blocked @${targetUser.username}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error blocking user.' });
  }
};

// @desc Unblock user
// @route POST /api/users/unblock/:id
const unblockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    await Block.findOneAndDelete({ blocker: currentUserId, blocked: targetUserId });
    return res.json({ success: true, message: 'User unblocked successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error unblocking user.' });
  }
};

// @desc Get blocked users list
// @route GET /api/users/blocked
const getBlockedUsers = async (req, res) => {
  try {
    const blocks = await Block.find({ blocker: req.user._id })
      .populate('blocked', 'username nickname avatar status')
      .lean();

    const blockedList = blocks
      .filter((b) => b.blocked)
      .map((b) => ({
        _id: b.blocked._id,
        username: b.blocked.username,
        nickname: b.blocked.nickname || b.blocked.username,
        avatar: b.blocked.avatar,
        blockedAt: b.createdAt
      }));

    return res.json({ success: true, blockedUsers: blockedList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching blocked users.' });
  }
};

// @desc Get active sessions for current user
// @route GET /api/users/sessions
const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id, isValid: true })
      .sort({ lastActive: -1 })
      .lean();

    const sessionList = sessions.map((s) => ({
      _id: s._id,
      deviceType: s.deviceType,
      os: s.os,
      browser: s.browser,
      ip: s.ip,
      lastActive: s.lastActive,
      isCurrent: s._id.toString() === req.sessionId?.toString()
    }));

    return res.json({ success: true, sessions: sessionList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching sessions.' });
  }
};

// @desc Revoke specific session
// @route DELETE /api/users/sessions/:id
const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ _id: id, user: req.user._id });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    session.isValid = false;
    await session.save();

    return res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error revoking session.' });
  }
};

// @desc Upload avatar or media
// @route POST /api/users/upload
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileMimeType: req.file.mimetype
  });
};

// @desc Get VAPID public key
// @route GET /api/users/push-key
const getPushPublicKey = (req, res) => {
  const { getVapidPublicKey } = require('../utils/webPush');
  return res.json({ success: true, publicKey: getVapidPublicKey() });
};

// @desc Save user's Web Push subscription
// @route POST /api/users/push-subscribe
const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }

    const exists = user.pushSubscriptions.some((s) => s.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
      await user.save();
    }

    return res.json({ success: true, message: 'Push subscription registered successfully.' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save push subscription.' });
  }
};

// @desc Unregister user's Web Push subscription
// @route POST /api/users/push-unsubscribe
const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint } }
    });

    return res.json({ success: true, message: 'Push subscription removed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove push subscription.' });
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateProfile,
  updatePrivacySettings,
  updateChatSettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getActiveSessions,
  revokeSession,
  uploadFile,
  getPushPublicKey,
  subscribePush,
  unsubscribePush
};
