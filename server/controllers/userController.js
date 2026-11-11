
const mongoose = require('mongoose');

const User = require('../models/User');
const Block = require('../models/Block');
const Session = require('../models/Session');

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserId = (user) => user?._id?.toString() || user?.toString();

const isSameId = (a, b) => getUserId(a) === getUserId(b);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSocketController = () => require('../sockets');

const isValidCallAccess = (setupSockets, callId, userId) => {
  if (
    !setupSockets ||
    typeof setupSockets.isCallParticipant !== 'function'
  ) {
    return false;
  }

  return setupSockets.isCallParticipant(callId, userId);
};

// --------------------------------------------------
// SEARCH USERS
// @route GET /api/users/search
// --------------------------------------------------

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (
      typeof query !== 'string' ||
      query.trim().length < 2 ||
      query.trim().length > 50
    ) {
      return res.json({
        success: true,
        users: []
      });
    }

    const blocks = await Block.find({
      $or: [
        { blocker: currentUserId },
        { blocked: currentUserId }
      ]
    }).select('blocker blocked');

    const excludedUserIds = [
      currentUserId,
      ...blocks.map((block) =>
        isSameId(block.blocker, currentUserId)
          ? block.blocked
          : block.blocker
      )
    ];

    const searchRegex = new RegExp(
      escapeRegex(query.trim()),
      'i'
    );

    const filter = {
      _id: { $nin: excludedUserIds },
      isBanned: false,
      isDeactivated: false,
      deletionStatus: 'active',
      'privacySettings.profileVisibility': { $ne: 'nobody' },
      $or: [
        { username: searchRegex },
        { nickname: searchRegex },
        { email: searchRegex }
      ]
    };

    const users = await User.find(filter)
      .select(
        'username nickname avatar bio status lastSeen privacySettings e2eePublicKey'
      )
      .limit(30)
      .lean();

    const sanitizedUsers = users.map((user) => {
      const profileVisible =
        user.privacySettings?.profileVisibility !== 'nobody';

      const lastSeenVisible =
        user.privacySettings?.lastSeenVisibility !== 'nobody';

      return {
        _id: user._id,
        username: user.username,
        nickname: user.nickname || user.username,
        avatar: profileVisible ? user.avatar : '',
        bio: profileVisible ? user.bio : '',
        status: lastSeenVisible ? user.status : 'offline',
        lastSeen: lastSeenVisible ? user.lastSeen : null,
        e2eePublicKey: user.e2eePublicKey || ''
      };
    });

    return res.json({
      success: true,
      users: sanitizedUsers
    });

  } catch (error) {
    console.error('[Search Users Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error searching users.'
    });
  }
};

// --------------------------------------------------
// GET USER PROFILE
// @route GET /api/users/:id
// --------------------------------------------------

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: id },
        { blocker: id, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return res.status(404).json({
        success: false,
        message: 'User not found or unavailable.'
      });
    }

    const targetUser = await User.findById(id)
      .select(
        'username nickname email avatar bio status lastSeen privacySettings chatSettings e2eePublicKey createdAt isBanned isDeactivated deletionStatus'
      )
      .lean();

    if (
      !targetUser ||
      targetUser.isBanned ||
      targetUser.isDeactivated ||
      targetUser.deletionStatus !== 'active'
    ) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const isOwnProfile = isSameId(currentUserId, targetUser._id);

    if (!isOwnProfile) {
      const profileVisible =
        targetUser.privacySettings?.profileVisibility !== 'nobody';

      const lastSeenVisible =
        targetUser.privacySettings?.lastSeenVisibility !== 'nobody';

      return res.json({
        success: true,
        user: {
          _id: targetUser._id,
          username: targetUser.username,
          nickname: targetUser.nickname || targetUser.username,
          avatar: profileVisible ? targetUser.avatar : '',
          bio: profileVisible ? targetUser.bio : '',
          status: lastSeenVisible ? targetUser.status : 'offline',
          lastSeen: lastSeenVisible ? targetUser.lastSeen : null,
          e2eePublicKey: targetUser.e2eePublicKey || '',
          createdAt: targetUser.createdAt
        }
      });
    }

    // Never return internal account security fields.
    delete targetUser.isBanned;
    delete targetUser.isDeactivated;
    delete targetUser.deletionStatus;

    return res.json({
      success: true,
      user: targetUser
    });

  } catch (error) {
    console.error('[Get User Profile Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error retrieving user profile.'
    });
  }
};

// --------------------------------------------------
// UPDATE PROFILE
// @route PUT /api/users/profile
// --------------------------------------------------

const updateProfile = async (req, res) => {
  try {
    const {
      nickname,
      bio,
      avatar,
      e2eePublicKey
    } = req.body;

    const updateData = {};

    if (nickname !== undefined) {
      if (typeof nickname !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid nickname.'
        });
      }

      updateData.nickname = nickname.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid bio.'
        });
      }

      updateData.bio = bio.trim();
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid avatar.'
        });
      }

      updateData.avatar = avatar;
    }

    if (e2eePublicKey !== undefined) {
      if (typeof e2eePublicKey !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid encryption public key.'
        });
      }

      updateData.e2eePublicKey = e2eePublicKey;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profile fields provided.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('[Update Profile Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error updating profile.'
    });
  }
};

// --------------------------------------------------
// UPDATE PRIVACY SETTINGS
// @route PUT /api/users/settings/privacy
// --------------------------------------------------

const updatePrivacySettings = async (req, res) => {
  try {
    const {
      profileVisibility,
      lastSeenVisibility,
      readReceipts,
      typingIndicators,
      groupAddPermission
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.privacySettings) {
      user.privacySettings = {};
    }

    if (profileVisibility !== undefined) {
      user.privacySettings.profileVisibility = profileVisibility;
    }

    if (lastSeenVisibility !== undefined) {
      user.privacySettings.lastSeenVisibility = lastSeenVisibility;
    }

    if (readReceipts !== undefined) {
      user.privacySettings.readReceipts = readReceipts;
    }

    if (typingIndicators !== undefined) {
      user.privacySettings.typingIndicators = typingIndicators;
    }

    if (groupAddPermission !== undefined) {
      user.privacySettings.groupAddPermission = groupAddPermission;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Privacy settings saved.',
      privacySettings: user.privacySettings
    });

  } catch (error) {
    console.error('[Privacy Settings Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error updating privacy settings.'
    });
  }
};

// --------------------------------------------------
// UPDATE CHAT SETTINGS
// @route PUT /api/users/settings/chat
// --------------------------------------------------

const updateChatSettings = async (req, res) => {
  try {
    const {
      theme,
      accentColor,
      fontSize,
      soundEnabled,
      notificationPreferences
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.chatSettings) {
      user.chatSettings = {};
    }

    if (theme !== undefined) {
      user.chatSettings.theme = theme;
    }

    if (accentColor !== undefined) {
      user.chatSettings.accentColor = accentColor;
    }

    if (fontSize !== undefined) {
      user.chatSettings.fontSize = fontSize;
    }

    if (soundEnabled !== undefined) {
      user.chatSettings.soundEnabled = soundEnabled;
    }

    if (notificationPreferences !== undefined) {
      if (
        typeof notificationPreferences !== 'object' ||
        notificationPreferences === null ||
        Array.isArray(notificationPreferences)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification preferences.'
        });
      }

      user.chatSettings.notificationPreferences = {
        ...user.chatSettings.notificationPreferences,
        ...notificationPreferences
      };
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Chat settings saved.',
      chatSettings: user.chatSettings
    });

  } catch (error) {
    console.error('[Chat Settings Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error updating chat settings.'
    });
  }
};

// --------------------------------------------------
// BLOCK USER
// @route POST /api/users/block/:id
// --------------------------------------------------

const blockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (!isValidObjectId(targetUserId)) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (isSameId(targetUserId, currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself.'
      });
    }

    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    await Block.findOneAndUpdate(
      {
        blocker: currentUserId,
        blocked: targetUserId
      },
      {
        $setOnInsert: {
          blocker: currentUserId,
          blocked: targetUserId
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    return res.json({
      success: true,
      message: `Successfully blocked @${targetUser.username}.`
    });

  } catch (error) {
    console.error('[Block User Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error blocking user.'
    });
  }
};

// --------------------------------------------------
// UNBLOCK USER
// @route POST /api/users/unblock/:id
// --------------------------------------------------

const unblockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }

    await Block.findOneAndDelete({
      blocker: req.user._id,
      blocked: targetUserId
    });

    return res.json({
      success: true,
      message: 'User unblocked successfully.'
    });

  } catch (error) {
    console.error('[Unblock User Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error unblocking user.'
    });
  }
};

// --------------------------------------------------
// GET BLOCKED USERS
// @route GET /api/users/blocked
// --------------------------------------------------

const getBlockedUsers = async (req, res) => {
  try {
    const blocks = await Block.find({
      blocker: req.user._id
    })
      .populate('blocked', 'username nickname avatar')
      .lean();

    const blockedList = blocks
      .filter((block) => block.blocked)
      .map((block) => ({
        _id: block.blocked._id,
        username: block.blocked.username,
        nickname:
          block.blocked.nickname || block.blocked.username,
        avatar: block.blocked.avatar,
        blockedAt: block.createdAt
      }));

    return res.json({
      success: true,
      blockedUsers: blockedList
    });

  } catch (error) {
    console.error('[Get Blocked Users Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching blocked users.'
    });
  }
};

// --------------------------------------------------
// GET ACTIVE SESSIONS
// @route GET /api/users/sessions
// --------------------------------------------------

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      isValid: true
    })
      .sort({ lastActive: -1 })
      .lean();

    const sessionList = sessions.map((session) => ({
      _id: session._id,
      deviceType: session.deviceType,
      os: session.os,
      browser: session.browser,
      ip: session.ip,
      lastActive: session.lastActive,
      isCurrent: isSameId(session._id, req.sessionId)
    }));

    return res.json({
      success: true,
      sessions: sessionList
    });

  } catch (error) {
    console.error('[Get Sessions Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching sessions.'
    });
  }
};

// --------------------------------------------------
// REVOKE SESSION
// @route DELETE /api/users/sessions/:id
// --------------------------------------------------

const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID.'
      });
    }

    const session = await Session.findOne({
      _id: id,
      user: req.user._id,
      isValid: true
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already revoked.'
      });
    }

    session.isValid = false;

    await session.save();

    return res.json({
      success: true,
      message: 'Session revoked successfully.'
    });

  } catch (error) {
    console.error('[Revoke Session Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error revoking session.'
    });
  }
};

// --------------------------------------------------
// UPLOAD FILE
// @route POST /api/users/upload
// --------------------------------------------------

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided.'
      });
    }

    const storageService = require('../services/storage');

    const result = await storageService.upload(req.file);

    return res.json({
      success: true,
      fileUrl: result.url,
      fileName: result.fileName,
      fileSize: result.fileSize,
      fileMimeType: result.fileMimeType,
      provider: result.provider
    });

  } catch (error) {
    console.error('[Upload Error]', error);

    return res.status(500).json({
      success: false,
      message: 'File upload processing failed.'
    });
  }
};

// --------------------------------------------------
// GET PUSH PUBLIC KEY
// @route GET /api/users/push-key
// --------------------------------------------------

const getPushPublicKey = (req, res) => {
  try {
    const { getVapidPublicKey } = require('../utils/webPush');

    return res.json({
      success: true,
      publicKey: getVapidPublicKey()
    });

  } catch (error) {
    console.error('[Push Key Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve push public key.'
    });
  }
};

// --------------------------------------------------
// SUBSCRIBE PUSH
// @route POST /api/users/push-subscribe
// --------------------------------------------------

const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.endpoint ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data.'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }

    const existingSubscription = user.pushSubscriptions.find(
      (item) => item.endpoint === subscription.endpoint
    );

    if (existingSubscription) {
      existingSubscription.keys = {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      };
    } else {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Push subscription registered successfully.'
    });

  } catch (error) {
    console.error('[Push Subscribe Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save push subscription.'
    });
  }
};

// --------------------------------------------------
// UNSUBSCRIBE PUSH
// @route POST /api/users/push-unsubscribe
// --------------------------------------------------

const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required.'
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          pushSubscriptions: { endpoint }
        }
      }
    );

    return res.json({
      success: true,
      message: 'Push subscription removed successfully.'
    });

  } catch (error) {
    console.error('[Push Unsubscribe Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription.'
    });
  }
};

// --------------------------------------------------
// GET ACTIVE CALL INFO
// @route GET /api/users/call/:callId
// --------------------------------------------------

const getCallInfo = (req, res) => {
  try {
    const { callId } = req.params;
    const currentUserId = getUserId(req.user);

    if (!callId || typeof callId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid call ID.'
      });
    }

    const setupSockets = getSocketController();

    const call = setupSockets.getActiveCall
      ? setupSockets.getActiveCall(callId)
      : null;

    if (
      !call ||
      call.logged ||
      !isValidCallAccess(setupSockets, callId, currentUserId)
    ) {
      return res.status(404).json({
        success: false,
        message: 'Call has ended or does not exist.'
      });
    }

    return res.json({
      success: true,
      call: {
        callId,
        conversationId: call.conversationId,
        isGroup: call.isGroup,
        callType: call.callType,
        caller: {
          _id: call.callerId,
          username: call.callerUsername || 'Caller',
          nickname: call.callerNickname || 'Caller',
          avatar: call.callerAvatar || ''
        }
      }
    });

  } catch (error) {
    console.error('[Get Call Info Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve call information.'
    });
  }
};

// --------------------------------------------------
// DECLINE CALL
// @route POST /api/users/call/:callId/decline
// --------------------------------------------------

const declineCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body || {};

    if (!callId || typeof callId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid call ID.'
      });
    }

    const setupSockets = getSocketController();

    if (
      !setupSockets.declineCall ||
      !isValidCallAccess(
        setupSockets,
        callId,
        getUserId(req.user)
      )
    ) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or you are not authorized.'
      });
    }

    const success = await setupSockets.declineCall(
      callId,
      req.user,
      typeof reason === 'string' ? reason : 'declined'
    );

    return res.json({
      success,
      message: success
        ? 'Call declined.'
        : 'Call already ended or not found.'
    });

  } catch (error) {
    console.error('[Call Decline Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to decline call.'
    });
  }
};

// --------------------------------------------------
// ANSWER CALL
// @route POST /api/users/call/:callId/answer
// --------------------------------------------------

const answerCall = async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callId || typeof callId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid call ID.'
      });
    }

    const setupSockets = getSocketController();

    if (
      !setupSockets.answerCall ||
      !isValidCallAccess(
        setupSockets,
        callId,
        getUserId(req.user)
      )
    ) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or you are not authorized.'
      });
    }

    const success = await setupSockets.answerCall(
      callId,
      req.user
    );

    return res.json({
      success,
      message: success
        ? 'Call marked as answered.'
        : 'Call already ended or not found.'
    });

  } catch (error) {
    console.error('[Call Answer Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to answer call.'
    });
  }
};

// --------------------------------------------------
// EXPORT CONTROLLERS
// --------------------------------------------------

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
  unsubscribePush,
  getCallInfo,
  declineCall,
  answerCall
};
