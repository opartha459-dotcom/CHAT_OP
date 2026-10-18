const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Block = require('../models/Block');

// @desc Get paginated messages in a conversation
// @route GET /api/messages/:conversationId
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 40 } = req.query;
    const currentUserId = req.user._id;

    // Verify user is in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Access denied to conversation messages.' });
    }

    const query = {
      conversation: conversationId,
      deletedFor: { $ne: currentUserId }
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('sender', 'username nickname avatar status')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType isEncrypted fileUrl',
        populate: { path: 'sender', select: 'username nickname' }
      })
      .lean();

    return res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit, 10)
    });
  } catch (error) {
    console.error('[Get Messages Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving messages.' });
  }
};

// @desc Send a message
// @route POST /api/messages/:conversationId
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      content,
      isEncrypted,
      encryptionMetadata,
      messageType = 'text',
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      replyTo,
      forwardFrom,
      mentions
    } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });
    }

    // Check block list for 1-on-1 chats
    if (conversation.type === 'private') {
      const otherParticipant = conversation.participants.find(
        (p) => p.toString() !== currentUserId.toString()
      );
      if (otherParticipant) {
        const isBlocked = await Block.findOne({
          $or: [
            { blocker: currentUserId, blocked: otherParticipant },
            { blocker: otherParticipant, blocked: currentUserId }
          ]
        });
        if (isBlocked) {
          return res.status(403).json({ success: false, message: 'Cannot send message. Communication is blocked.' });
        }
      }
    }

    // Check admin restrictions for group chats
    if (conversation.type === 'group' && conversation.groupDetails.onlyAdminsCanMessage) {
      const isAdmin = conversation.groupDetails.admins.some((a) => a.toString() === currentUserId.toString());
      const isOwner = conversation.groupDetails.owner.toString() === currentUserId.toString();
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: 'Only group admins can send messages in this group.' });
      }
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      content: content || '',
      isEncrypted: !!isEncrypted,
      encryptionMetadata: encryptionMetadata || {},
      messageType,
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      fileMimeType: fileMimeType || '',
      replyTo: replyTo || null,
      forwardFrom: forwardFrom || null,
      mentions: Array.isArray(mentions) ? mentions : [],
      readBy: [{ user: currentUserId, readAt: new Date() }],
      deliveredTo: [{ user: currentUserId, deliveredAt: new Date() }]
    });

    // Update conversation lastMessage & increment unreadCounts for other participants
    conversation.lastMessage = message._id;
    if (!conversation.unreadCounts) conversation.unreadCounts = new Map();

    conversation.participants.forEach((pId) => {
      if (pId.toString() !== currentUserId.toString()) {
        const currentCount = conversation.unreadCounts.get(pId.toString()) || 0;
        conversation.unreadCounts.set(pId.toString(), currentCount + 1);
      }
    });

    // Restore conversation if other users had deleted it
    conversation.deletedFor = [];
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username nickname avatar status')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType isEncrypted fileUrl',
        populate: { path: 'sender', select: 'username nickname' }
      });

    // Emit via socket if io is attached to app
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('message:received', populatedMessage);
      // Also emit conversation update event to notify inbox lists
      conversation.participants.forEach((pId) => {
        io.to(`user:${pId.toString()}`).emit('conversation:updated', {
          conversationId,
          lastMessage: populatedMessage,
          unreadCounts: Object.fromEntries(conversation.unreadCounts)
        });
      });
    }

    return res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('[Send Message Error]', error);
    return res.status(500).json({ success: false, message: 'Error sending message.' });
  }
};

// @desc Edit an existing message
// @route PUT /api/messages/:id
const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    const message = await Message.findOne({ _id: id, sender: currentUserId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or unauthorized.' });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ success: false, message: 'Cannot edit deleted message.' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username nickname avatar status')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType isEncrypted fileUrl',
        populate: { path: 'sender', select: 'username nickname' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(message.conversation.toString()).emit('message:edited', populated);
    }

    return res.json({ success: true, message: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error editing message.' });
  }
};

// @desc Delete a message
// @route DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType = 'forMe' } = req.body; // 'forMe' or 'forEveryone'
    const currentUserId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (deleteType === 'forEveryone') {
      const isSender = message.sender.toString() === currentUserId.toString();
      const isGroupAdmin =
        conversation.type === 'group' &&
        conversation.groupDetails.admins.some((a) => a.toString() === currentUserId.toString());

      if (!isSender && !isGroupAdmin) {
        return res.status(403).json({ success: false, message: 'Only sender or group admins can delete for everyone.' });
      }

      message.isDeletedForEveryone = true;
      message.content = 'This message was deleted';
      message.fileUrl = '';
      await message.save();

      const io = req.app.get('io');
      if (io) {
        io.to(message.conversation.toString()).emit('message:deleted', {
          messageId: message._id,
          conversationId: message.conversation,
          forEveryone: true
        });
      }
    } else {
      // Delete for me
      if (!message.deletedFor.includes(currentUserId)) {
        message.deletedFor.push(currentUserId);
        await message.save();
      }
    }

    return res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting message.' });
  }
};

// @desc React to a message
// @route POST /api/messages/:id/react
const reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required.' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUserId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // Toggle off
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Remove previous reaction from this user if any, and add new one
      message.reactions = message.reactions.filter((r) => r.user.toString() !== currentUserId.toString());
      message.reactions.push({ user: currentUserId, emoji, createdAt: new Date() });
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username nickname avatar status')
      .populate('reactions.user', 'username nickname');

    const io = req.app.get('io');
    if (io) {
      io.to(message.conversation.toString()).emit('message:reacted', {
        messageId: message._id,
        reactions: populated.reactions
      });
    }

    return res.json({ success: true, reactions: populated.reactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error reacting to message.' });
  }
};

// @desc Search messages in conversations
// @route GET /api/messages/search
const searchMessages = async (req, res) => {
  try {
    const { q, conversationId } = req.query;
    const currentUserId = req.user._id;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const accessibleConversations = await Conversation.find({
      participants: currentUserId,
      deletedFor: { $ne: currentUserId }
    }).select('_id');

    const conversationIds = accessibleConversations.map((c) => c._id);

    const query = {
      conversation: conversationId ? conversationId : { $in: conversationIds },
      content: { $regex: q.trim(), $options: 'i' },
      isDeletedForEveryone: false,
      deletedFor: { $ne: currentUserId }
    };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'username nickname avatar')
      .populate('conversation', 'type groupDetails');

    return res.json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error searching messages.' });
  }
};

// @desc Get call history for the current user
// @route GET /api/messages/calls/history
const getCallHistory = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all conversations user is a part of
    const userConversations = await Conversation.find({
      participants: currentUserId
    }).select('_id');

    const convIds = userConversations.map((c) => c._id);

    // Find all call messages in those conversations
    const callMessages = await Message.find({
      conversation: { $in: convIds },
      messageType: 'call',
      deletedFor: { $ne: currentUserId }
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('sender', 'username nickname avatar')
      .populate({
        path: 'conversation',
        select: 'type groupDetails participants isGroup otherUser',
        populate: {
          path: 'participants',
          select: 'username nickname avatar status lastSeen'
        }
      })
      .lean();

    return res.json({
      success: true,
      calls: callMessages
    });
  } catch (error) {
    console.error('[Get Call History Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving call history.' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  getCallHistory
};

