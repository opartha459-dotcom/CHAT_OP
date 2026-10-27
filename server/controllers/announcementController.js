const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

// Helper to format announcement response with user vote status & percentages
const formatAnnouncement = (announcement, userId) => {
  const isAcknowledged = userId
    ? announcement.acknowledgedBy?.some((ack) => ack.user?.toString() === userId.toString())
    : false;

  let userVotedIndices = [];
  let totalPollVotes = 0;

  if (announcement.hasPoll && announcement.poll && Array.isArray(announcement.poll.options)) {
    announcement.poll.options.forEach((opt, idx) => {
      const count = opt.votes ? opt.votes.length : 0;
      totalPollVotes += count;
      if (userId && opt.votes?.some((v) => (v._id || v)?.toString() === userId.toString())) {
        userVotedIndices.push(idx);
      }
    });
  }

  return {
    ...announcement,
    isAcknowledged,
    acknowledgmentCount: announcement.acknowledgedBy ? announcement.acknowledgedBy.length : 0,
    userVotedIndices,
    totalPollVotes
  };
};

// @desc Get active announcements for current user
// @route GET /api/announcements
const getActiveAnnouncements = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const userRole = req.user ? req.user.role : 'user';

    const now = new Date();
    const query = {
      isPublished: true,
      isArchived: false,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }]
    };

    if (userRole !== 'admin') {
      query.targetAudience = { $in: ['all', 'users'] };
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = announcements.map((a) => formatAnnouncement(a, userId));

    return res.json({ success: true, announcements: formatted });
  } catch (error) {
    console.error('[Announcements Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements.' });
  }
};

// @desc Acknowledge / dismiss announcement for current user
// @route POST /api/announcements/:id/acknowledge
const acknowledgeAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    const alreadyAcked = announcement.acknowledgedBy.some(
      (ack) => ack.user.toString() === userId.toString()
    );

    if (!alreadyAcked) {
      announcement.acknowledgedBy.push({
        user: userId,
        acknowledgedAt: new Date()
      });
      await announcement.save();
    }

    return res.json({
      success: true,
      message: 'Announcement acknowledged',
      announcementId: id
    });
  } catch (error) {
    console.error('[Acknowledge Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge announcement.' });
  }
};

// @desc Get all announcements for admin management
// @route GET /api/announcements/admin/all
const getAllAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = announcements.map((a) => formatAnnouncement(a, req.user._id));

    return res.json({ success: true, announcements: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin announcements.' });
  }
};

// @desc Create new announcement (with optional poll & design styling)
// @route POST /api/announcements/admin
const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'info',
      targetAudience = 'all',
      expiresAt,
      hasPoll = false,
      poll,
      design
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    // Process Poll if attached
    let processedPoll = null;
    let willHavePoll = false;

    if (hasPoll && poll && Array.isArray(poll.options) && poll.options.length >= 2) {
      willHavePoll = true;
      processedPoll = {
        question: (poll.question || title).trim(),
        options: poll.options
          .map((opt) => (typeof opt === 'string' ? opt.trim() : opt?.text?.trim()))
          .filter(Boolean)
          .map((optText) => ({ text: optText, votes: [] })),
        allowMultiple: Boolean(poll.allowMultiple),
        isClosed: false
      };

      if (processedPoll.options.length < 2) {
        return res.status(400).json({ success: false, message: 'A poll must have at least 2 valid options.' });
      }
    }

    // Process Design settings
    const processedDesign = {
      theme: design?.theme || 'default',
      font: design?.font || 'sans',
      badge: design?.badge || (willHavePoll ? '🗳️' : '📢'),
      style: design?.style || 'banner',
      animation: design?.animation || 'none'
    };

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      type,
      targetAudience,
      hasPoll: willHavePoll,
      poll: processedPoll,
      design: processedDesign,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      author: req.user._id,
      isPublished: true,
      isArchived: false
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = formatAnnouncement(populated, req.user._id);

    // Broadcast to online clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:new', formatted);
    }

    // Log admin audit action
    await AuditLog.create({
      admin: req.user._id,
      action: 'create_announcement',
      target: announcement._id,
      targetModel: 'Announcement',
      details: `Published announcement "${announcement.title}" (${type}${willHavePoll ? ' with Poll' : ''})`
    }).catch(() => {});

    return res.status(201).json({ success: true, announcement: formatted });
  } catch (error) {
    console.error('[Create Announcement Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create announcement.' });
  }
};

// @desc Vote on an announcement poll
// @route POST /api/announcements/:id/poll/vote
const voteAnnouncementPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    let index = req.body.optionIndex;
    if (index === undefined && Array.isArray(req.body.optionIndexes) && req.body.optionIndexes.length > 0) {
      index = req.body.optionIndexes[0];
    }
    if (index === undefined || index === null || isNaN(Number(index))) {
      return res.status(400).json({ success: false, message: 'optionIndex number is required.' });
    }
    const optionIndex = Number(index);

    const announcement = await Announcement.findById(id);
    if (!announcement || !announcement.hasPoll || !announcement.poll) {
      return res.status(404).json({ success: false, message: 'Announcement poll not found.' });
    }

    if (announcement.poll.isClosed) {
      return res.status(400).json({ success: false, message: 'This poll is already closed.' });
    }

    const options = announcement.poll.options;
    if (optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option index.' });
    }

    const allowMultiple = announcement.poll.allowMultiple;
    const targetOption = options[optionIndex];
    const userVoteIdx = targetOption.votes.findIndex((v) => v.toString() === userId.toString());

    if (userVoteIdx > -1) {
      // User is toggling off their vote on this option
      targetOption.votes.splice(userVoteIdx, 1);
    } else {
      // If single choice, remove votes from all other options first
      if (!allowMultiple) {
        options.forEach((opt) => {
          const idx = opt.votes.findIndex((v) => v.toString() === userId.toString());
          if (idx > -1) opt.votes.splice(idx, 1);
        });
      }
      targetOption.votes.push(userId);
    }

    await announcement.save();

    const populated = await Announcement.findById(id)
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = formatAnnouncement(populated, userId);

    // Emit live update to all sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:poll:voted', {
        announcementId: id,
        poll: populated.poll,
        formatted
      });
    }

    return res.json({ success: true, announcement: formatted });
  } catch (error) {
    console.error('[Announcement Poll Vote Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to register vote.' });
  }
};

// @desc Close or reopen an announcement poll (Admin only)
// @route POST /api/announcements/admin/:id/poll/close
const toggleAnnouncementPollClosed = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);
    if (!announcement || !announcement.hasPoll || !announcement.poll) {
      return res.status(404).json({ success: false, message: 'Announcement poll not found.' });
    }

    announcement.poll.isClosed = !announcement.poll.isClosed;
    announcement.poll.closedAt = announcement.poll.isClosed ? new Date() : null;
    await announcement.save();

    const populated = await Announcement.findById(id)
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = formatAnnouncement(populated, req.user._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:poll:closed', {
        announcementId: id,
        isClosed: announcement.poll.isClosed,
        formatted
      });
    }

    return res.json({
      success: true,
      message: `Poll has been ${announcement.poll.isClosed ? 'closed' : 'reopened'}.`,
      announcement: formatted
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update poll state.' });
  }
};

// @desc Update announcement
// @route PUT /api/announcements/admin/:id
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, targetAudience, isPublished, isArchived, expiresAt, design } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    if (title !== undefined) announcement.title = title.trim();
    if (content !== undefined) announcement.content = content.trim();
    if (type !== undefined) announcement.type = type;
    if (targetAudience !== undefined) announcement.targetAudience = targetAudience;
    if (isPublished !== undefined) announcement.isPublished = Boolean(isPublished);
    if (isArchived !== undefined) announcement.isArchived = Boolean(isArchived);
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;

    if (design) {
      const currentDesign = announcement.design ? (announcement.design.toObject ? announcement.design.toObject() : announcement.design) : {};
      announcement.design = {
        ...currentDesign,
        ...design
      };
      announcement.markModified('design');
    }

    if (req.body.hasPoll !== undefined) {
      announcement.hasPoll = Boolean(req.body.hasPoll);
    }

    if (req.body.poll) {
      const incomingPoll = req.body.poll;
      const currentPoll = announcement.poll ? (announcement.poll.toObject ? announcement.poll.toObject() : announcement.poll) : { options: [] };
      const currentOptions = currentPoll.options || [];

      const newOptions = Array.isArray(incomingPoll.options)
        ? incomingPoll.options.map((opt, idx) => {
            const text = typeof opt === 'string' ? opt.trim() : opt?.text?.trim() || '';
            const existingOpt = currentOptions[idx];
            return {
              text,
              votes: existingOpt?.votes || []
            };
          }).filter((o) => Boolean(o.text))
        : currentOptions;

      announcement.poll = {
        ...currentPoll,
        question: (incomingPoll.question || announcement.title || '').trim(),
        options: newOptions,
        allowMultiple: incomingPoll.allowMultiple !== undefined ? Boolean(incomingPoll.allowMultiple) : currentPoll.allowMultiple,
        isClosed: incomingPoll.isClosed !== undefined ? Boolean(incomingPoll.isClosed) : Boolean(currentPoll.isClosed)
      };
      announcement.markModified('poll');
    }

    await announcement.save();

    const populated = await Announcement.findById(id)
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = formatAnnouncement(populated, req.user._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:updated', formatted);
    }

    // Log admin audit action
    await AuditLog.create({
      admin: req.user._id,
      action: 'update_announcement',
      target: announcement._id,
      targetModel: 'Announcement',
      details: `Updated announcement "${announcement.title}" (theme: ${announcement.design?.theme || 'default'})`
    }).catch(() => {});

    return res.json({ success: true, announcement: formatted });
  } catch (error) {
    console.error('[Update Announcement Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update announcement.' });
  }
};

// @desc Delete announcement
// @route DELETE /api/announcements/admin/:id
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'delete_announcement',
      target: id,
      targetModel: 'Announcement',
      details: `Deleted announcement "${announcement.title}"`
    }).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:deleted', { announcementId: id });
    }

    return res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
};

module.exports = {
  getActiveAnnouncements,
  acknowledgeAnnouncement,
  getAllAnnouncementsAdmin,
  createAnnouncement,
  voteAnnouncementPoll,
  toggleAnnouncementPollClosed,
  updateAnnouncement,
  deleteAnnouncement
};
