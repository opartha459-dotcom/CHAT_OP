const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Block = require('../models/Block');
const User = require('../models/User');

// @desc Get all conversations for current user
// @route GET /api/chats
const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all conversations where user is a participant and not deleted
    const conversations = await Conversation.find({
      participants: currentUserId,
      deletedFor: { $ne: currentUserId }
    })
      .populate('participants', 'username nickname avatar status lastSeen privacySettings e2eePublicKey')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username nickname' }
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Map through conversations and compute per-user flags
    const formattedConversations = conversations.map((conv) => {
      const isPinned = conv.pinnedBy?.some((id) => id.toString() === currentUserId.toString()) || false;
      const isArchived = conv.archivedBy?.some((id) => id.toString() === currentUserId.toString()) || false;
      const muteInfo = conv.mutedBy?.find((m) => m.user?.toString() === currentUserId.toString());
      const isMuted = muteInfo ? (!muteInfo.until || new Date(muteInfo.until) > new Date()) : false;

      const unreadCount = (conv.unreadCounts && conv.unreadCounts[currentUserId.toString()]) || 0;

      // For 1-on-1 private chat, identify the other party
      let otherUser = null;
      if (conv.type === 'private') {
        otherUser = conv.participants.find((p) => p._id.toString() !== currentUserId.toString()) || conv.participants[0];
      }

      return {
        _id: conv._id,
        type: conv.type,
        participants: conv.participants,
        groupDetails: conv.groupDetails,
        lastMessage: conv.lastMessage,
        isEncrypted: conv.isEncrypted,
        isPinned,
        isArchived,
        isMuted,
        unreadCount,
        otherUser,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt
      };
    });

    return res.json({ success: true, conversations: formattedConversations });
  } catch (error) {
    console.error('[Get Conversations Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving conversations.' });
  }
};

// @desc Get or create private 1-on-1 conversation
// @route POST /api/chats/private
const getOrCreatePrivateChat = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required.' });
    }

    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself.' });
    }

    // Verify recipient exists and is not banned
    const recipient = await User.findById(recipientId);
    if (!recipient || recipient.isBanned || recipient.isDeactivated) {
      return res.status(404).json({ success: false, message: 'User not available.' });
    }

    // Check block list in both directions
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: recipientId },
        { blocker: recipientId, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot start conversation. Communication is blocked between these users.'
      });
    }

    // Find existing private conversation
    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [currentUserId, recipientId], $size: 2 }
    })
      .populate('participants', 'username nickname avatar status lastSeen privacySettings e2eePublicKey')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [currentUserId, recipientId],
        isEncrypted: true,
        unreadCounts: {
          [currentUserId.toString()]: 0,
          [recipientId.toString()]: 0
        }
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username nickname avatar status lastSeen privacySettings e2eePublicKey');
    } else {
      // If was previously deleted by current user, restore it
      if (conversation.deletedFor && conversation.deletedFor.includes(currentUserId)) {
        conversation.deletedFor = conversation.deletedFor.filter(
          (id) => id.toString() !== currentUserId.toString()
        );
        await conversation.save();
      }
    }

    const convObj = conversation.toObject ? conversation.toObject() : conversation;
    const otherUser = convObj.participants?.find(
      (p) => (p._id || p).toString() !== currentUserId.toString()
    ) || convObj.participants?.[0];

    return res.json({
      success: true,
      conversation: {
        ...convObj,
        otherUser
      }
    });
  } catch (error) {
    console.error('[Get Or Create Chat Error]', error);
    return res.status(500).json({ success: false, message: 'Error creating private chat.' });
  }
};

// @desc Toggle pin conversation
// @route POST /api/chats/:id/pin
const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: currentUserId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isPinned = conversation.pinnedBy.some((uid) => uid.toString() === currentUserId.toString());
    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter((uid) => uid.toString() !== currentUserId.toString());
    } else {
      conversation.pinnedBy.push(currentUserId);
    }

    await conversation.save();
    return res.json({ success: true, isPinned: !isPinned });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error pinning conversation.' });
  }
};

// @desc Toggle archive conversation
// @route POST /api/chats/:id/archive
const toggleArchive = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: currentUserId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isArchived = conversation.archivedBy.some((uid) => uid.toString() === currentUserId.toString());
    if (isArchived) {
      conversation.archivedBy = conversation.archivedBy.filter((uid) => uid.toString() !== currentUserId.toString());
    } else {
      conversation.archivedBy.push(currentUserId);
    }

    await conversation.save();
    return res.json({ success: true, isArchived: !isArchived });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error archiving conversation.' });
  }
};

// @desc Mute/unmute conversation
// @route POST /api/chats/:id/mute
const toggleMute = async (req, res) => {
  try {
    const { id } = req.params;
    const { durationHours } = req.body; // 8, 24, or -1 for indefinite, 0 to unmute
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: currentUserId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const existingMuteIndex = conversation.mutedBy.findIndex((m) => m.user.toString() === currentUserId.toString());

    if (durationHours === 0 || durationHours === null) {
      // Unmute
      if (existingMuteIndex > -1) {
        conversation.mutedBy.splice(existingMuteIndex, 1);
      }
    } else {
      const until = durationHours > 0 ? new Date(Date.now() + durationHours * 3600 * 1000) : null;
      if (existingMuteIndex > -1) {
        conversation.mutedBy[existingMuteIndex].until = until;
      } else {
        conversation.mutedBy.push({ user: currentUserId, until });
      }
    }

    await conversation.save();
    return res.json({ success: true, message: 'Notification settings updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error muting conversation.' });
  }
};

// @desc Delete conversation for current user
// @route DELETE /api/chats/:id
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: currentUserId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (!conversation.deletedFor.includes(currentUserId)) {
      conversation.deletedFor.push(currentUserId);
    }

    // Also mark messages as deleted for this user
    await Message.updateMany(
      { conversation: id, deletedFor: { $ne: currentUserId } },
      { $addToSet: { deletedFor: currentUserId } }
    );

    await conversation.save();
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting conversation.' });
  }
};

// @desc Mark conversation as read
// @route POST /api/chats/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: currentUserId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(currentUserId.toString(), 0);
      await conversation.save();
    }

    // Update readBy on recent messages in this conversation
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: currentUserId },
        'readBy.user': { $ne: currentUserId }
      },
      {
        $push: {
          readBy: {
            user: currentUserId,
            readAt: new Date()
          }
        }
      }
    );

    return res.json({ success: true, message: 'Conversation marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating read status.' });
  }
};

module.exports = {
  getConversations,
  getOrCreatePrivateChat,
  togglePin,
  toggleArchive,
  toggleMute,
  deleteConversation,
  markAsRead
};
