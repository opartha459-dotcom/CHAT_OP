
const Status = require('../models/Status');
const Block = require('../models/Block');

const USER_FIELDS = 'username nickname avatar status';
const PUBLIC_USER_FIELDS = 'username nickname avatar';

/* =========================================================
   HELPERS
========================================================= */

const getId = (value) => {
  if (!value) return null;
  return (value._id || value).toString();
};

const isExpired = (status) => {
  return !status?.expiresAt || new Date(status.expiresAt) <= new Date();
};

const populateStatus = async (id) => {
  return Status.findById(id)
    .populate('user', USER_FIELDS)
    .populate('viewers.user', PUBLIC_USER_FIELDS)
    .populate('reactions.user', PUBLIC_USER_FIELDS)
    .populate('poll.options.votes', PUBLIC_USER_FIELDS)
    .lean();
};

const getSocket = (req) => req.app.get('io');

const emitStatusEvent = (req, event, payload) => {
  const io = getSocket(req);

  if (!io) return;

  // Emit once. Do not also emit to overlapping user rooms:
  // that can deliver duplicate events to the same socket.
  io.emit(event, payload);
};

const emitViewerUpdate = (req, status, viewer, totalViewers) => {
  const io = getSocket(req);
  if (!io) return;
  const authorId = getId(status.user);

  // Send viewer details ONLY to the author's room so only the status creator can view viewers!
  io.to(`user:${authorId}`).emit('status:viewed', {
    statusId: getId(status._id),
    authorId,
    viewer,
    totalViewers
  });
};

const emitReactionUpdate = (req, status) => {
  const io = getSocket(req);
  if (!io) return;
  const authorId = getId(status.user);

  // Send full reaction details and viewers list ONLY to the author
  io.to(`user:${authorId}`).emit('status:reaction', {
    statusId: getId(status._id),
    authorId,
    reactions: status.reactions || [],
    viewers: status.viewers || [],
    totalViewers: status.viewers?.length || 0
  });

  // Broadcast lightweight animation event without leaking user details
  io.emit('status:reaction_anim', {
    statusId: getId(status._id),
    authorId,
    emoji: status.reactions?.[status.reactions.length - 1]?.emoji
  });
};

const emitPollUpdate = (req, status) => {
  const io = getSocket(req);
  if (!io) return;
  const authorId = getId(status.user);

  // Convert Mongoose subdocument to plain object to avoid DocumentArray quirks
  const pollObj = status.poll?.toObject ? status.poll.toObject() : status.poll;
  if (!pollObj) return;

  const sanitizedOptions = (pollObj.options || []).map(opt => ({
    text: opt.text,
    _id: opt._id,
    votes: [],       // non-authors never see voter identities
    voteCount: (opt.votes || []).length
  }));

  // Send full poll details (with voter identities) ONLY to the author
  io.to(`user:${authorId}`).emit('status:poll_voted', {
    statusId: getId(status._id),
    authorId,
    poll: pollObj,
    viewers: status.viewers || [],
    totalViewers: status.viewers?.length || 0
  });

  // Broadcast sanitized counts to everyone EXCEPT the author
  io.except(`user:${authorId}`).emit('status:poll_voted', {
    statusId: getId(status._id),
    authorId,
    poll: { ...pollObj, options: sanitizedOptions }
  });
};

/*
 * Checks whether the current user is allowed to access a status.
 *
 * Supported audience values:
 * everyone
 * custom
 * only_share_with
 *
 * excludedUsers is also respected.
 *
 * Contact-based audiences need your application's actual
 * contact/friend relationship model to be enforced.
 */
const canViewStatus = async (status, userId) => {
  const currentId = userId.toString();
  const authorId = getId(status.user);

  if (authorId === currentId) return true;

  if (isExpired(status)) return false;

  const blockExists = await Block.exists({
    $or: [
      { blocker: userId, blocked: status.user },
      { blocker: status.user, blocked: userId }
    ]
  });

  if (blockExists) return false;

  const privacy = status.privacy || {};
  const audience = privacy.audience || 'everyone';

  const allowedUsers = (privacy.allowedUsers || []).map(getId);
  const excludedUsers = (privacy.excludedUsers || []).map(getId);

  if (excludedUsers.includes(currentId)) {
    return false;
  }

  if (
    audience === 'custom' ||
    audience === 'only_share_with'
  ) {
    return allowedUsers.includes(currentId);
  }

  if (audience === 'contacts') {
    const Conversation = require('../models/Conversation');
    const hasConversation = await Conversation.exists({
      participants: { $all: [status.user, userId] }
    });
    if (!hasConversation) {
      return false;
    }
  }

  if (audience === 'nobody') {
    return false;
  }

  return true;
};

const recordViewer = async (status, userId) => {
  if (!Array.isArray(status.viewers)) {
    status.viewers = [];
  }

  const alreadyViewed = status.viewers.some(
    (viewer) => getId(viewer.user) === userId.toString()
  );

  if (alreadyViewed) {
    return null;
  }

  const viewer = {
    user: userId,
    viewedAt: new Date()
  };

  status.viewers.push(viewer);

  return viewer;
};

const getViewerPayload = (req, viewer) => ({
  _id: req.user._id,
  username: req.user.username,
  nickname: req.user.nickname,
  avatar: req.user.avatar,
  viewedAt: viewer.viewedAt
});

/* =========================================================
   CREATE STATUS
   POST /api/status
========================================================= */

const createStatus = async (req, res) => {
  try {
    const {
      text,
      type = 'text',
      mediaUrl,
      style,
      privacy,
      hasPoll,
      poll
    } = req.body;

    const currentUserId = req.user._id;

    if (
      type === 'text' &&
      (!text || !text.trim()) &&
      !hasPoll
    ) {
      return res.status(400).json({
        success: false,
        message: 'Status text or poll is required.'
      });
    }

    if (type === 'media' && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Media URL is required.'
      });
    }

    let pollData = null;

    if (hasPoll && poll && Array.isArray(poll.options)) {
      const validOptions = poll.options
        .map((option) =>
          typeof option === 'string'
            ? option.trim()
            : option?.text?.trim() || ''
        )
        .filter(Boolean)
        .map((optionText) => ({
          text: optionText,
          votes: []
        }));

      const uniqueOptions = [
        ...new Set(validOptions.map((option) => option.text))
      ];

      if (uniqueOptions.length < 2 || uniqueOptions.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'A poll must contain between 2 and 4 unique options.'
        });
      }

      pollData = {
        question: poll.question?.trim() || 'Poll Question',
        options: validOptions,
        isClosed: false
      };
    } else if (hasPoll) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll options.'
      });
    }

    const status = await Status.create({
      user: currentUserId,
      type,
      text: text ? text.trim() : '',
      mediaUrl: mediaUrl || '',

      style: {
        background:
          style?.background ||
          'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        font: style?.font || 'sans',
        textColor: style?.textColor || '#ffffff',
        bold: Boolean(style?.bold),
        italic: Boolean(style?.italic)
      },

      privacy: {
        audience:
          privacy?.audience ||
          req.user.privacySettings?.statusAudience ||
          'everyone',
        allowedUsers:
          privacy?.allowedUsers ||
          req.user.privacySettings?.statusAllowedUsers ||
          [],
        excludedUsers:
          privacy?.excludedUsers ||
          req.user.privacySettings?.statusExcludedUsers ||
          []
      },

      hasPoll: Boolean(pollData),
      poll: pollData || undefined,

      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const populated = await populateStatus(status._id);

    // Clients should refresh their authorized feed after this event.
    emitStatusEvent(req, 'status:new', {
      statusId: getId(status._id),
      userId: getId(currentUserId)
    });

    return res.status(201).json({
      success: true,
      message: 'Status published successfully.',
      status: populated
    });
  } catch (error) {
    console.error('[Create Status Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error publishing status.'
    });
  }
};

/* =========================================================
   GET STATUS FEED
   GET /api/status/feed
========================================================= */

const getStatusFeed = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const now = new Date();

    const blocks = await Block.find({
      $or: [
        { blocker: currentUserId },
        { blocked: currentUserId }
      ]
    }).lean();

    const blockedUserIds = blocks.map((block) =>
      getId(
        getId(block.blocker) === currentUserId.toString()
          ? block.blocked
          : block.blocker
      )
    );

    const activeStatuses = await Status.find({
      expiresAt: { $gt: now },
      user: { $nin: blockedUserIds }
    })
      .sort({ createdAt: 1 })
      .populate('user', USER_FIELDS)
      .populate('viewers.user', PUBLIC_USER_FIELDS)
      .populate('reactions.user', PUBLIC_USER_FIELDS)
      .populate('poll.options.votes', PUBLIC_USER_FIELDS)
      .lean();

    const visibleStatuses = activeStatuses.filter((status) => {
      if (!status.user) return false;

      const authorId = getId(status.user);

      if (authorId === currentUserId.toString()) {
        return true;
      }

      const privacy = status.privacy || {};
      const audience = privacy.audience || 'everyone';

      const allowedUsers = (privacy.allowedUsers || []).map(getId);
      const excludedUsers = (privacy.excludedUsers || []).map(getId);

      if (excludedUsers.includes(currentUserId.toString())) {
        return false;
      }

      if (
        audience === 'custom' ||
        audience === 'only_share_with'
      ) {
        return allowedUsers.includes(currentUserId.toString());
      }

      return true;
    });

    const userMap = new Map();

    visibleStatuses.forEach((status) => {
      const userId = getId(status.user);

      const hasViewed = (status.viewers || []).some(
        (viewer) => getId(viewer.user) === currentUserId.toString()
      );

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: status.user,
          statuses: [],
          allViewed: true,
          latestCreatedAt: status.createdAt
        });
      }

      const group = userMap.get(userId);
      const isOwner = userId === currentUserId.toString();

      group.statuses.push({
        ...status,
        hasViewed,
        // Privacy rule: Only the creator of the status can view the viewers list and other users' reactions
        viewers: isOwner ? (status.viewers || []) : [],
        viewersCount: (status.viewers || []).length,
        reactions: isOwner
          ? (status.reactions || [])
          : (status.reactions || []).filter(
              (r) => getId(r.user) === currentUserId.toString()
            ),
        poll: status.hasPoll && status.poll
          ? {
              ...status.poll,
              options: status.poll.options?.map((opt) => ({
                ...opt,
                votes: isOwner
                  ? opt.votes
                  : (opt.votes || []).filter(
                      (v) => getId(v) === currentUserId.toString()
                    )
              }))
            }
          : status.poll
      });

      if (!hasViewed) {
        group.allViewed = false;
      }

      if (
        new Date(status.createdAt) >
        new Date(group.latestCreatedAt)
      ) {
        group.latestCreatedAt = status.createdAt;
      }
    });

    const feed = Array.from(userMap.values()).sort((a, b) => {
      if (
        getId(a.user) === currentUserId.toString()
      ) return -1;

      if (
        getId(b.user) === currentUserId.toString()
      ) return 1;

      if (!a.allViewed && b.allViewed) return -1;
      if (a.allViewed && !b.allViewed) return 1;

      return (
        new Date(b.latestCreatedAt) -
        new Date(a.latestCreatedAt)
      );
    });

    return res.json({
      success: true,
      feed
    });
  } catch (error) {
    console.error('[Get Status Feed Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error retrieving status feed.'
    });
  }
};

/* =========================================================
   GET MY STATUSES
   GET /api/status/mine
========================================================= */

const getMyStatuses = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const statuses = await Status.find({
      user: currentUserId,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .populate('viewers.user', PUBLIC_USER_FIELDS)
      .populate('reactions.user', PUBLIC_USER_FIELDS)
      .populate('poll.options.votes', PUBLIC_USER_FIELDS)
      .lean();

    return res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('[Get My Statuses Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error retrieving your statuses.'
    });
  }
};

/* =========================================================
   VIEW STATUS
   POST /api/status/:id/view
========================================================= */

const viewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);

    if (!status || isExpired(status)) {
      return res.status(404).json({
        success: false,
        message: 'Status not found or expired.'
      });
    }

    const allowed = await canViewStatus(status, currentUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view this status.'
      });
    }

    const authorId = getId(status.user);

    let newViewer = null;

    if (authorId !== currentUserId.toString()) {
      // Check viewer's status view receipt privacy setting
      const viewerHasReceipts =
        req.user?.privacySettings?.statusViewReceipts !== false;

      if (viewerHasReceipts) {
        newViewer = await recordViewer(status, currentUserId);

        if (newViewer) {
          status.markModified('viewers');
          await status.save();

          const viewerPayload = getViewerPayload(req, newViewer);

          emitViewerUpdate(
            req,
            status,
            viewerPayload,
            status.viewers.length
          );
        }
      }
    }

    const io = getSocket(req);
    if (io) {
      io.to(`user:${currentUserId}`).emit('status:viewed_by_me', {
        statusId: getId(status._id),
        authorId
      });
    }

    return res.json({
      success: true,
      statusId: getId(status._id),
      hasViewed: true,
      viewersCount: status.viewers?.length || 0
    });
  } catch (error) {
    console.error('[View Status Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error recording status view.'
    });
  }
};

/* =========================================================
   REACT TO STATUS
   POST /api/status/:id/react
========================================================= */

const reactToStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const emoji = req.body.emoji?.trim();
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji reaction is required.'
      });
    }

    const status = await Status.findById(id);

    if (!status || isExpired(status)) {
      return res.status(404).json({
        success: false,
        message: 'Status not found or expired.'
      });
    }

    const allowed = await canViewStatus(status, currentUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You cannot react to this status.'
      });
    }

    if (!Array.isArray(status.reactions)) {
      status.reactions = [];
    }

    if (!Array.isArray(status.viewers)) {
      status.viewers = [];
    }

    const authorId = getId(status.user);

    let newViewer = null;

    // Reacting also counts as viewing.
    if (authorId !== currentUserId.toString()) {
      newViewer = await recordViewer(status, currentUserId);
    }

    const existingIndex = status.reactions.findIndex(
      (reaction) =>
        getId(reaction.user) === currentUserId.toString()
    );

    let action = 'added';

    if (existingIndex !== -1) {
      const existing = status.reactions[existingIndex];

      if (existing.emoji === emoji) {
        status.reactions.splice(existingIndex, 1);
        action = 'removed';
      } else {
        existing.emoji = emoji;
        existing.createdAt = new Date();
        action = 'updated';
      }
    } else {
      status.reactions.push({
        user: currentUserId,
        emoji,
        createdAt: new Date()
      });
    }

    status.markModified('reactions');
    status.markModified('viewers');

    await status.save();

    const populated = await populateStatus(id);

    if (!populated) {
      return res.status(404).json({
        success: false,
        message: 'Status no longer exists.'
      });
    }

    const isOwner = authorId === currentUserId.toString();
    const io = getSocket(req);

    // Send full reaction and viewers details strictly to the status creator!
    if (io) {
      io.to(`user:${authorId}`).emit('status:reaction', {
        statusId: id.toString(),
        authorId,
        reactions: populated.reactions || [],
        viewers: populated.viewers || [],
        totalViewers: populated.viewers?.length || 0,
        user: {
          _id: currentUserId,
          username: req.user.username,
          nickname: req.user.nickname,
          avatar: req.user.avatar
        },
        emoji,
        action
      });

      // Broadcast floating reaction burst for other viewers without exposing full user list
      io.emit('status:reaction_anim', {
        statusId: id.toString(),
        authorId,
        emoji,
        action
      });
    }

    if (newViewer) {
      emitViewerUpdate(
        req,
        status,
        getViewerPayload(req, newViewer),
        populated.viewers?.length || 0
      );
    }

    return res.json({
      success: true,
      action,
      reactions: isOwner
        ? (populated.reactions || [])
        : (populated.reactions || []).filter((r) => getId(r.user) === currentUserId.toString()),
      viewers: isOwner ? (populated.viewers || []) : [],
      totalViewers: isOwner ? (populated.viewers?.length || 0) : undefined
    });
  } catch (error) {
    console.error('[React to Status Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to react to status.'
    });
  }
};

/* =========================================================
   VOTE ON STATUS POLL
   POST /api/status/:id/poll/vote
========================================================= */

const voteStatusPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const optionIndex = Number(req.body.optionIndex);

    if (!Number.isInteger(optionIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll option.'
      });
    }

    const status = await Status.findById(id);

    if (
      !status ||
      isExpired(status) ||
      !status.hasPoll ||
      !status.poll ||
      !Array.isArray(status.poll.options)
    ) {
      return res.status(404).json({
        success: false,
        message: 'Status poll not found or expired.'
      });
    }

    const allowed = await canViewStatus(status, currentUserId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You cannot vote on this poll.'
      });
    }

    if (status.poll.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Poll has closed.'
      });
    }

    if (
      optionIndex < 0 ||
      optionIndex >= status.poll.options.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll option.'
      });
    }

    if (!Array.isArray(status.viewers)) {
      status.viewers = [];
    }

    const authorId = getId(status.user);

    let newViewer = null;

    // Voting also counts as viewing.
    if (authorId !== currentUserId.toString()) {
      newViewer = await recordViewer(status, currentUserId);
    }

    // Enforce one vote per user.
    // Clicking the same option again removes the vote.
    let alreadySelected = false;

    status.poll.options.forEach((option, index) => {
      if (!Array.isArray(option.votes)) {
        option.votes = [];
      }

      const voteIndex = option.votes.findIndex(
        (vote) => getId(vote) === currentUserId.toString()
      );

      if (index === optionIndex && voteIndex !== -1) {
        alreadySelected = true;
      }

      if (voteIndex !== -1) {
        option.votes.splice(voteIndex, 1);
      }
    });

    if (!alreadySelected) {
      status.poll.options[optionIndex].votes.push(currentUserId);
    }

    status.markModified('poll');
    status.markModified('viewers');

    await status.save();

    const populated = await populateStatus(id);

    if (!populated) {
      return res.status(404).json({
        success: false,
        message: 'Status no longer exists.'
      });
    }

    const isOwner = authorId === currentUserId.toString();
    const io = getSocket(req);

    // populated comes from .lean() so it's already a plain JS object
    const populatedPoll = populated.poll || null;

    // Send full poll with voter identities and viewers ONLY to the status creator
    if (io && populatedPoll) {
      io.to(`user:${authorId}`).emit('status:poll_voted', {
        statusId: id.toString(),
        authorId,
        poll: populatedPoll,
        viewers: populated.viewers || [],
        totalViewers: populated.viewers?.length || 0
      });

      // Build sanitized options: include ONLY the voter's own vote so they
      // can see their selection (hasVoted), but hide all other voter identities.
      const sanitizedOptions = (populatedPoll.options || []).map((opt) => ({
        text: opt.text,
        _id: opt._id,
        votes: (opt.votes || []).filter(
          (v) => getId(v) === currentUserId.toString()
        ),
        voteCount: (opt.votes || []).length
      }));

      // Broadcast sanitized counts to everyone EXCEPT the author
      io.except(`user:${authorId}`).emit('status:poll_voted', {
        statusId: id.toString(),
        authorId,
        poll: { ...populatedPoll, options: sanitizedOptions }
      });
    }

    if (newViewer) {
      emitViewerUpdate(
        req,
        status,
        getViewerPayload(req, newViewer),
        populated.viewers?.length || 0
      );
    }

    return res.json({
      success: true,
      poll: isOwner
        ? populated.poll
        : {
            ...populated.poll,
            options: populated.poll?.options?.map((opt) => ({
              text: opt.text,
              _id: opt._id,
              voteCount: (opt.votes || []).length,
              votes: (opt.votes || []).filter(
                (v) => getId(v) === currentUserId.toString()
              )
            }))
          },
      viewers: isOwner ? (populated.viewers || []) : [],
      totalViewers: isOwner ? (populated.viewers?.length || 0) : undefined
    });
  } catch (error) {
    console.error('[Status Poll Vote Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to cast vote on status poll.'
    });
  }
};

/* =========================================================
   CLOSE STATUS POLL
   POST /api/status/:id/poll/close
========================================================= */

const closeStatusPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);

    if (
      !status ||
      isExpired(status) ||
      !status.hasPoll ||
      !status.poll
    ) {
      return res.status(404).json({
        success: false,
        message: 'Status poll not found or expired.'
      });
    }

    const authorId = getId(status.user);

    if (
      authorId !== currentUserId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can end this poll.'
      });
    }

    if (status.poll.isClosed) {
      return res.json({
        success: true,
        poll: status.poll,
        message: 'Poll is already closed.'
      });
    }

    status.poll.isClosed = true;
    status.markModified('poll');

    await status.save();

    const populated = await populateStatus(id);

    if (!populated) {
      return res.status(404).json({
        success: false,
        message: 'Status no longer exists.'
      });
    }

    emitStatusEvent(req, 'status:poll_voted', {
      statusId: id.toString(),
      authorId,
      poll: populated.poll,
      viewers: populated.viewers || [],
      totalViewers: populated.viewers?.length || 0
    });

    emitStatusEvent(req, 'status:updated', {
      statusId: id.toString(),
      authorId,
      status: populated
    });

    return res.json({
      success: true,
      poll: populated.poll
    });
  } catch (error) {
    console.error('[Close Status Poll Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to close status poll.'
    });
  }
};

/* =========================================================
   DELETE STATUS
   DELETE /api/status/:id
========================================================= */

const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found.'
      });
    }

    const authorId = getId(status.user);

    if (
      authorId !== currentUserId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this status.'
      });
    }

    await Status.findByIdAndDelete(id);

    emitStatusEvent(req, 'status:deleted', {
      statusId: id.toString(),
      userId: authorId
    });

    emitStatusEvent(req, 'status:updated', {
      statusId: id.toString(),
      authorId,
      deleted: true
    });

    return res.json({
      success: true,
      message: 'Status deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Status Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Error deleting status.'
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createStatus,
  getStatusFeed,
  getMyStatuses,
  viewStatus,
  reactToStatus,
  voteStatusPoll,
  closeStatusPoll,
  deleteStatus
};
