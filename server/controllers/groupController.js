const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Block = require('../models/Block');

// Helper to create and broadcast group system notifications in real-time
const broadcastGroupSystemMessage = async (req, conversationId, content) => {
  try {
    const sysMsg = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content,
      messageType: 'system'
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: sysMsg._id
    });

    const populated = await Message.findById(sysMsg._id)
      .populate('sender', 'username nickname avatar status');

    const io = req.app?.get('io');
    if (io) {
      io.to(conversationId.toString()).emit('message:received', populated);
      io.to(conversationId.toString()).emit('conversation:updated', { conversationId });
    }

    return sysMsg;
  } catch (err) {
    console.error('[Group System Message Error]', err);
  }
};

// @desc Create a new group conversation
// @route POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, participantIds, onlyAdminsCanMessage, onlyAdminsCanAddMembers } = req.body;
    const currentUserId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    const uniqueParticipants = Array.from(new Set([
      currentUserId.toString(),
      ...(Array.isArray(participantIds) ? participantIds.map((id) => id.toString()) : [])
    ]));

    if (uniqueParticipants.length < 2) {
      return res.status(400).json({ success: false, message: 'A group must have at least 2 members.' });
    }

    const unreadCounts = {};
    uniqueParticipants.forEach((pId) => {
      unreadCounts[pId] = 0;
    });

    const group = await Conversation.create({
      type: 'group',
      participants: uniqueParticipants,
      groupDetails: {
        name: name.trim(),
        description: description ? description.trim() : '',
        avatar: avatar || '',
        owner: currentUserId,
        admins: [currentUserId],
        onlyAdminsCanMessage: !!onlyAdminsCanMessage,
        onlyAdminsCanAddMembers: !!onlyAdminsCanAddMembers,
        inviteCode: crypto.randomBytes(8).toString('hex'),
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
      },
      isEncrypted: true,
      unreadCounts
    });

    // Create system message
    const systemMsg = await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} created group "${group.groupDetails.name}"`
    );

    const populatedGroup = await Conversation.findById(group._id)
      .populate('participants', 'username nickname avatar status lastSeen privacySettings e2eePublicKey')
      .populate('lastMessage');

    return res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error('[Create Group Error]', error);
    return res.status(500).json({ success: false, message: 'Error creating group.' });
  }
};

// @desc Get group details
// @route GET /api/groups/:id
const getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({
      _id: id,
      type: 'group',
      participants: currentUserId
    })
      .populate('participants', 'username nickname avatar bio status lastSeen privacySettings e2eePublicKey')
      .populate('groupDetails.owner', 'username nickname avatar')
      .populate('groupDetails.admins', 'username nickname avatar');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found or you are not a member.' });
    }

    return res.json({ success: true, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching group details.' });
  }
};

// @desc Update group details and permissions
// @route PUT /api/groups/:id
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar, onlyAdminsCanMessage, onlyAdminsCanAddMembers } = req.body;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isAdmin = group.groupDetails.admins.some((adminId) => adminId.toString() === currentUserId.toString());
    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Only group admins can update group settings.' });
    }

    if (name !== undefined) group.groupDetails.name = name.trim();
    if (description !== undefined) group.groupDetails.description = description.trim();
    if (avatar !== undefined) group.groupDetails.avatar = avatar;
    if (onlyAdminsCanMessage !== undefined) group.groupDetails.onlyAdminsCanMessage = onlyAdminsCanMessage;
    if (onlyAdminsCanAddMembers !== undefined) group.groupDetails.onlyAdminsCanAddMembers = onlyAdminsCanAddMembers;

    await group.save();

    // Create and broadcast system notification message
    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} updated the group settings.`
    );

    return res.json({ success: true, message: 'Group updated successfully.', group });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating group.' });
  }
};

// @desc Add members to group
// @route POST /api/groups/:id/members
const addMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const currentUserId = req.user._id;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'memberIds array is required.' });
    }

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isAdmin = group.groupDetails.admins.some((adminId) => adminId.toString() === currentUserId.toString());
    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();

    if (group.groupDetails.onlyAdminsCanAddMembers && !isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Only admins can add members to this group.' });
    }

    const newMembers = [];
    for (const memberId of memberIds) {
      if (!group.participants.some((p) => p.toString() === memberId.toString())) {
        // Check blocks
        const isBlocked = await Block.findOne({
          $or: [
            { blocker: currentUserId, blocked: memberId },
            { blocker: memberId, blocked: currentUserId }
          ]
        });
        if (!isBlocked) {
          group.participants.push(memberId);
          group.unreadCounts.set(memberId.toString(), 0);
          newMembers.push(memberId);
        }
      }
    }

    await group.save();

    if (newMembers.length > 0) {
      const addedUsers = await User.find({ _id: { $in: newMembers } }).select('username nickname');
      const names = addedUsers.map((u) => u.nickname || u.username).join(', ');
      await broadcastGroupSystemMessage(
        req,
        group._id,
        `${req.user.nickname || req.user.username} added ${names} to the group.`
      );
    }

    const updated = await Conversation.findById(group._id)
      .populate('participants', 'username nickname avatar status lastSeen privacySettings e2eePublicKey');

    return res.json({ success: true, message: 'Members added successfully.', group: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error adding members.' });
  }
};

// @desc Remove member from group
// @route DELETE /api/groups/:id/members/:memberId
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();
    const isAdmin = group.groupDetails.admins.some((a) => a.toString() === currentUserId.toString());
    const targetIsOwner = group.groupDetails.owner.toString() === memberId.toString();
    const targetIsAdmin = group.groupDetails.admins.some((a) => a.toString() === memberId.toString());

    if (targetIsOwner) {
      return res.status(400).json({ success: false, message: 'Group owner cannot be removed.' });
    }

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can remove members.' });
    }

    if (!isOwner && targetIsAdmin) {
      return res.status(403).json({ success: false, message: 'Only the owner can remove group admins.' });
    }

    group.participants = group.participants.filter((p) => p.toString() !== memberId.toString());
    group.groupDetails.admins = group.groupDetails.admins.filter((a) => a.toString() !== memberId.toString());
    if (group.unreadCounts) {
      group.unreadCounts.delete(memberId.toString());
    }

    await group.save();

    const removedUser = await User.findById(memberId);
    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} removed ${removedUser ? (removedUser.nickname || removedUser.username) : 'a user'} from the group.`
    );

    return res.json({ success: true, message: 'Member removed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error removing member.' });
  }
};

// @desc Promote member to admin
// @route POST /api/groups/:id/promote/:memberId
const promoteAdmin = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the group owner can promote admins.' });
    }

    if (!group.groupDetails.admins.some((a) => a.toString() === memberId.toString())) {
      group.groupDetails.admins.push(memberId);
      await group.save();

      const promotedUser = await User.findById(memberId);
      await broadcastGroupSystemMessage(
        req,
        group._id,
        `${promotedUser ? (promotedUser.nickname || promotedUser.username) : 'A member'} was promoted to group admin.`
      );
    }

    return res.json({ success: true, message: 'Member promoted to admin.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error promoting member.' });
  }
};

// @desc Demote admin to member
// @route POST /api/groups/:id/demote/:memberId
const demoteAdmin = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the group owner can demote admins.' });
    }

    group.groupDetails.admins = group.groupDetails.admins.filter((a) => a.toString() !== memberId.toString());
    await group.save();

    const demotedUser = await User.findById(memberId);
    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${demotedUser ? (demotedUser.nickname || demotedUser.username) : 'An admin'} was demoted to regular member.`
    );

    return res.json({ success: true, message: 'Admin demoted to member.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error demoting admin.' });
  }
};

// @desc Transfer group ownership
// @route POST /api/groups/:id/transfer
const transferOwnership = async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (group.groupDetails.owner.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the current owner can transfer ownership.' });
    }

    if (!group.participants.some((p) => p.toString() === newOwnerId.toString())) {
      return res.status(400).json({ success: false, message: 'New owner must be a member of the group.' });
    }

    group.groupDetails.owner = newOwnerId;
    if (!group.groupDetails.admins.some((a) => a.toString() === newOwnerId.toString())) {
      group.groupDetails.admins.push(newOwnerId);
    }

    await group.save();

    const newOwnerUser = await User.findById(newOwnerId);
    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} transferred group ownership to ${newOwnerUser ? (newOwnerUser.nickname || newOwnerUser.username) : 'another member'}.`
    );

    return res.json({ success: true, message: 'Ownership transferred successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error transferring ownership.' });
  }
};

// @desc Leave group
// @route POST /api/groups/:id/leave
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    group.participants = group.participants.filter((p) => p.toString() !== currentUserId.toString());
    group.groupDetails.admins = group.groupDetails.admins.filter((a) => a.toString() !== currentUserId.toString());

    // If leaving user is owner, transfer ownership to oldest admin or member
    if (group.groupDetails.owner.toString() === currentUserId.toString()) {
      if (group.groupDetails.admins.length > 0) {
        group.groupDetails.owner = group.groupDetails.admins[0];
      } else if (group.participants.length > 0) {
        group.groupDetails.owner = group.participants[0];
        group.groupDetails.admins.push(group.participants[0]);
      }
    }

    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} left the group.`
    );

    await group.save();

    return res.json({ success: true, message: 'You have left the group.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error leaving group.' });
  }
};

// @desc Generate new invite link
// @route POST /api/groups/:id/invite
const generateInviteLink = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({ _id: id, type: 'group', participants: currentUserId });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const isAdmin = group.groupDetails.admins.some((a) => a.toString() === currentUserId.toString());
    const isOwner = group.groupDetails.owner.toString() === currentUserId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Only admins can generate invite links.' });
    }

    group.groupDetails.inviteCode = crypto.randomBytes(8).toString('hex');
    group.groupDetails.inviteExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await group.save();

    return res.json({
      success: true,
      inviteCode: group.groupDetails.inviteCode,
      inviteExpiresAt: group.groupDetails.inviteExpiresAt
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error generating invite link.' });
  }
};

// @desc Join group using invite code
// @route POST /api/groups/join/:code
const joinByInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user._id;

    const group = await Conversation.findOne({
      type: 'group',
      'groupDetails.inviteCode': code
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });
    }

    if (group.groupDetails.inviteExpiresAt && new Date(group.groupDetails.inviteExpiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'This invite link has expired.' });
    }

    if (group.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.json({ success: true, message: 'You are already a member of this group.', groupId: group._id });
    }

    group.participants.push(currentUserId);
    group.unreadCounts.set(currentUserId.toString(), 0);
    await group.save();

    await broadcastGroupSystemMessage(
      req,
      group._id,
      `${req.user.nickname || req.user.username} joined via invite link.`
    );

    return res.json({ success: true, message: `Successfully joined "${group.groupDetails.name}".`, groupId: group._id });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error joining group.' });
  }
};

module.exports = {
  createGroup,
  getGroupDetails,
  updateGroup,
  addMembers,
  removeMember,
  promoteAdmin,
  demoteAdmin,
  transferOwnership,
  leaveGroup,
  generateInviteLink,
  joinByInvite
};
