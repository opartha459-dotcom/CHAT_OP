const Status = require('../models/Status');
const Block = require('../models/Block');

// @desc Create a new 24h status (with optional poll & styling)
// @route POST /api/status
const createStatus = async (req, res) => {
  try {
    const { text, type = 'text', mediaUrl, style, privacy, hasPoll, poll } = req.body;
    const currentUserId = req.user._id;

    if (type === 'text' && (!text || !text.trim()) && !hasPoll) {
      return res.status(400).json({ success: false, message: 'Status text or poll is required.' });
    }

    if (type === 'media' && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media URL is required.' });
    }

    let pollData = null;
    if (hasPoll && poll && Array.isArray(poll.options)) {
      const validOptions = poll.options
        .map((opt) => (typeof opt === 'string' ? opt.trim() : opt?.text?.trim() || ''))
        .filter(Boolean)
        .map((text) => ({ text, votes: [] }));

      if (validOptions.length >= 2) {
        pollData = {
          question: poll.question ? poll.question.trim() : 'Poll Question',
          options: validOptions,
          isClosed: false
        };
      }
    }

    const status = await Status.create({
      user: currentUserId,
      type,
      text: text ? text.trim() : '',
      mediaUrl: mediaUrl || '',
      style: {
        background: style?.background || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        font: style?.font || 'sans',
        textColor: style?.textColor || '#ffffff'
      },
      privacy: {
        audience: privacy?.audience || 'everyone',
        allowedUsers: privacy?.allowedUsers || [],
        excludedUsers: privacy?.excludedUsers || []
      },
      hasPoll: Boolean(pollData),
      poll: pollData || undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const populated = await Status.findById(status._id)
      .populate('user', 'username nickname avatar status')
      .populate('viewers.user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('status:new', populated);
    }

    return res.status(201).json({
      success: true,
      message: 'Status published successfully.',
      status: populated
    });
  } catch (error) {
    console.error('[Create Status Error]', error);
    return res.status(500).json({ success: false, message: 'Error publishing status.' });
  }
};

// @desc Get active statuses grouped by user for the feed
// @route GET /api/status/feed
const getStatusFeed = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const now = new Date();

    // Find blocks involving current user
    const blocks = await Block.find({
      $or: [{ blocker: currentUserId }, { blocked: currentUserId }]
    });
    const blockedUserIds = blocks.map((b) =>
      b.blocker.toString() === currentUserId.toString() ? b.blocked.toString() : b.blocker.toString()
    );

    // Fetch all active non-expired statuses
    const activeStatuses = await Status.find({
      expiresAt: { $gt: now },
      user: { $nin: blockedUserIds }
    })
      .sort({ createdAt: 1 })
      .populate('user', 'username nickname avatar status')
      .populate('viewers.user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar')
      .lean();

    // Filter statuses based on privacy rules
    const visibleStatuses = activeStatuses.filter((s) => {
      if (s.user._id.toString() === currentUserId.toString()) return true;

      const p = s.privacy || {};
      if (p.audience === 'custom') {
        return (p.allowedUsers || []).some((id) => (id?._id || id)?.toString() === currentUserId.toString());
      }
      if (p.excludedUsers && p.excludedUsers.some((id) => (id?._id || id)?.toString() === currentUserId.toString())) {
        return false;
      }
      return true;
    });

    // Group statuses by user
    const userMap = new Map();

    visibleStatuses.forEach((s) => {
      const uId = s.user._id.toString();
      const hasViewed = (s.viewers || []).some(
        (v) => v.user?._id?.toString() === currentUserId.toString() || v.user?.toString() === currentUserId.toString()
      );

      if (!userMap.has(uId)) {
        userMap.set(uId, {
          user: s.user,
          statuses: [],
          allViewed: true,
          latestCreatedAt: s.createdAt
        });
      }

      const group = userMap.get(uId);
      group.statuses.push({
        ...s,
        hasViewed
      });

      if (!hasViewed) {
        group.allViewed = false;
      }
      if (new Date(s.createdAt) > new Date(group.latestCreatedAt)) {
        group.latestCreatedAt = s.createdAt;
      }
    });

    const feed = Array.from(userMap.values()).sort((a, b) => {
      if (a.user._id.toString() === currentUserId.toString()) return -1;
      if (b.user._id.toString() === currentUserId.toString()) return 1;
      if (!a.allViewed && b.allViewed) return -1;
      if (a.allViewed && !b.allViewed) return 1;
      return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
    });

    return res.json({
      success: true,
      feed
    });
  } catch (error) {
    console.error('[Get Status Feed Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving status feed.' });
  }
};

// @desc Get current user's active statuses with viewer & reaction details
// @route GET /api/status/mine
const getMyStatuses = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const now = new Date();

    const statuses = await Status.find({
      user: currentUserId,
      expiresAt: { $gt: now }
    })
      .sort({ createdAt: -1 })
      .populate('viewers.user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar')
      .lean();

    return res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('[Get My Statuses Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving your statuses.' });
  }
};

// @desc Mark status as viewed and broadcast real-time update
// @route POST /api/status/:id/view
const viewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found.' });
    }

    const authorId = (status.user?._id || status.user).toString();
    if (authorId !== currentUserId.toString()) {
      const alreadyViewed = status.viewers.some(
        (v) => (v.user?._id || v.user)?.toString() === currentUserId.toString()
      );
      if (!alreadyViewed) {
        const viewItem = { user: currentUserId, viewedAt: new Date() };
        status.viewers.push(viewItem);
        await status.save();

        const viewerData = {
          _id: req.user._id,
          username: req.user.username,
          nickname: req.user.nickname,
          avatar: req.user.avatar,
          viewedAt: viewItem.viewedAt
        };

        const io = req.app.get('io');
        if (io) {
          const payload = {
            statusId: status._id.toString(),
            authorId: status.user.toString(),
            viewer: viewerData,
            totalViewers: status.viewers.length
          };
          // Broadcast to everyone and author rooms for immediate real-time update without reload
          io.emit('status:viewed', payload);
          io.to(status.user.toString()).emit('status:viewed', payload);
          io.to(`user:${status.user.toString()}`).emit('status:viewed', payload);
        }
      }
    }

    return res.json({
      success: true,
      viewersCount: status.viewers.length
    });
  } catch (error) {
    console.error('[View Status Error]', error);
    return res.status(500).json({ success: false, message: 'Error recording status view.' });
  }
};

// @desc React to a status with an emoji (toggle or replace)
// @route POST /api/status/:id/react
const reactToStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ success: false, message: 'Emoji reaction is required.' });
    }

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found.' });
    }

    if (!status.reactions) {
      status.reactions = [];
    }
    if (!status.viewers) {
      status.viewers = [];
    }

    const authorId = (status.user?._id || status.user).toString();

    // Automatically record viewer if not already viewed (reacting implies viewing)
    let newViewerAdded = false;
    let viewItem = null;
    if (authorId !== currentUserId.toString()) {
      const alreadyViewed = status.viewers.some(
        (v) => (v.user?._id || v.user)?.toString() === currentUserId.toString()
      );
      if (!alreadyViewed) {
        viewItem = { user: currentUserId, viewedAt: new Date() };
        status.viewers.push(viewItem);
        newViewerAdded = true;
      }
    }

    const existingIdx = status.reactions.findIndex(
      (r) => (r.user?._id || r.user)?.toString() === currentUserId.toString()
    );

    let actionTaken = 'added';
    if (existingIdx > -1) {
      if (status.reactions[existingIdx].emoji === emoji.trim()) {
        // Toggle off reaction
        status.reactions.splice(existingIdx, 1);
        actionTaken = 'removed';
      } else {
        // Change reaction emoji
        status.reactions[existingIdx].emoji = emoji.trim();
        status.reactions[existingIdx].createdAt = new Date();
        actionTaken = 'updated';
      }
    } else {
      status.reactions.push({
        user: currentUserId,
        emoji: emoji.trim(),
        createdAt: new Date()
      });
    }

    status.markModified('reactions');
    if (newViewerAdded) {
      status.markModified('viewers');
    }
    await status.save();

    const populated = await Status.findById(id)
      .populate('user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('viewers.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      // Broadcast reaction update
      const reactionPayload = {
        statusId: id.toString(),
        reactions: populated.reactions || [],
        user: {
          _id: req.user._id,
          username: req.user.username,
          nickname: req.user.nickname,
          avatar: req.user.avatar
        },
        emoji: emoji.trim(),
        action: actionTaken,
        totalViewers: populated.viewers?.length || 0
      };

      io.emit('status:reaction', reactionPayload);
      io.to(authorId).emit('status:reaction', reactionPayload);
      io.to(`user:${authorId}`).emit('status:reaction', reactionPayload);

      // If viewing was recorded at the same time, broadcast viewer update immediately
      if (newViewerAdded) {
        const viewerData = {
          _id: req.user._id,
          username: req.user.username,
          nickname: req.user.nickname,
          avatar: req.user.avatar,
          viewedAt: viewItem?.viewedAt || new Date()
        };
        const viewPayload = {
          statusId: id.toString(),
          authorId,
          viewer: viewerData,
          totalViewers: populated.viewers?.length || 0
        };
        io.emit('status:viewed', viewPayload);
        io.to(authorId).emit('status:viewed', viewPayload);
        io.to(`user:${authorId}`).emit('status:viewed', viewPayload);
      }
    }

    return res.json({
      success: true,
      action: actionTaken,
      reactions: populated.reactions || [],
      viewers: populated.viewers || [],
      totalViewers: populated.viewers?.length || 0
    });
  } catch (error) {
    console.error('[React to Status Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to react to status.' });
  }
};

// @desc Vote on a status poll
// @route POST /api/status/:id/poll/vote
const voteStatusPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);
    if (!status || !status.hasPoll || !status.poll || !status.poll.options) {
      return res.status(404).json({ success: false, message: 'Status poll not found.' });
    }

    if (status.poll.isClosed) {
      return res.status(400).json({ success: false, message: 'Poll has closed.' });
    }

    const idx = parseInt(optionIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= status.poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid poll option.' });
    }

    if (!status.viewers) {
      status.viewers = [];
    }

    const authorId = (status.user?._id || status.user).toString();

    // Automatically record viewer if not already viewed (voting implies viewing)
    let newViewerAdded = false;
    let viewItem = null;
    if (authorId !== currentUserId.toString()) {
      const alreadyViewed = status.viewers.some(
        (v) => (v.user?._id || v.user)?.toString() === currentUserId.toString()
      );
      if (!alreadyViewed) {
        viewItem = { user: currentUserId, viewedAt: new Date() };
        status.viewers.push(viewItem);
        newViewerAdded = true;
      }
    }

    // Toggle vote if already voted on this option, or switch vote
    status.poll.options.forEach((opt, oIdx) => {
      if (!Array.isArray(opt.votes)) {
        opt.votes = [];
      }
      const vIdx = opt.votes.findIndex((v) => (v._id || v)?.toString() === currentUserId.toString());
      if (oIdx === idx) {
        if (vIdx > -1) {
          // Toggle off
          opt.votes.splice(vIdx, 1);
        } else {
          opt.votes.push(currentUserId);
        }
      } else {
        // Single vote per status poll
        if (vIdx > -1) {
          opt.votes.splice(vIdx, 1);
        }
      }
    });

    status.markModified('poll');
    if (newViewerAdded) {
      status.markModified('viewers');
    }
    await status.save();

    const populated = await Status.findById(id)
      .populate('user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('viewers.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const pollPayload = {
        statusId: id.toString(),
        poll: populated.poll,
        totalViewers: populated.viewers?.length || 0
      };

      io.emit('status:poll_voted', pollPayload);
      io.to(authorId).emit('status:poll_voted', pollPayload);
      io.to(`user:${authorId}`).emit('status:poll_voted', pollPayload);

      if (newViewerAdded) {
        const viewerData = {
          _id: req.user._id,
          username: req.user.username,
          nickname: req.user.nickname,
          avatar: req.user.avatar,
          viewedAt: viewItem?.viewedAt || new Date()
        };
        const viewPayload = {
          statusId: id.toString(),
          authorId,
          viewer: viewerData,
          totalViewers: populated.viewers?.length || 0
        };
        io.emit('status:viewed', viewPayload);
        io.to(authorId).emit('status:viewed', viewPayload);
        io.to(`user:${authorId}`).emit('status:viewed', viewPayload);
      }
    }

    return res.json({
      success: true,
      poll: populated.poll,
      viewers: populated.viewers || [],
      totalViewers: populated.viewers?.length || 0
    });
  } catch (error) {
    console.error('[Status Poll Vote Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to cast vote on status poll.' });
  }
};

// @desc Close a status poll (Creator or admin only)
// @route POST /api/status/:id/poll/close
const closeStatusPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);
    if (!status || !status.hasPoll || !status.poll) {
      return res.status(404).json({ success: false, message: 'Status poll not found.' });
    }

    const authorId = (status.user?._id || status.user).toString();
    if (authorId !== currentUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the creator can end this poll.' });
    }

    status.poll.isClosed = true;
    status.markModified('poll');
    await status.save();

    const populated = await Status.findById(id)
      .populate('user', 'username nickname avatar')
      .populate('reactions.user', 'username nickname avatar')
      .populate('viewers.user', 'username nickname avatar')
      .populate('poll.options.votes', 'username nickname avatar')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const pollPayload = {
        statusId: id.toString(),
        poll: populated.poll
      };
      io.emit('status:poll_voted', pollPayload);
      io.to(authorId).emit('status:poll_voted', pollPayload);
      io.to(`user:${authorId}`).emit('status:poll_voted', pollPayload);
    }

    return res.json({
      success: true,
      poll: populated.poll
    });
  } catch (error) {
    console.error('[Close Status Poll Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to close status poll.' });
  }
};

// @desc Delete a status
// @route DELETE /api/status/:id
const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found.' });
    }

    const authorId = (status.user?._id || status.user).toString();
    if (authorId !== currentUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this status.' });
    }

    await Status.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('status:deleted', { statusId: id, userId: status.user });
    }

    return res.json({
      success: true,
      message: 'Status deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Status Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting status.' });
  }
};

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
