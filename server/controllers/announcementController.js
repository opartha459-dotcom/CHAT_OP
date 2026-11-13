
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

/* =========================================================
   HELPERS
========================================================= */

const getUserId = (user) => {
  if (!user) return null;
  return (user._id || user).toString();
};

const formatAnnouncement = (announcement, userId) => {
  if (!announcement) return null;

  const isAcknowledged = userId
    ? announcement.acknowledgedBy?.some(
      (ack) => getUserId(ack.user) === userId.toString()
    )
    : false;

  const userVotedIndices = [];
  let totalPollVotes = 0;

  if (
    announcement.hasPoll &&
    announcement.poll &&
    Array.isArray(announcement.poll.options)
  ) {
    announcement.poll.options.forEach((option, index) => {
      const votes = option.votes || [];

      totalPollVotes += votes.length;

      if (
        userId &&
        votes.some((vote) => getUserId(vote) === userId.toString())
      ) {
        userVotedIndices.push(index);
      }
    });
  }

  return {
    ...announcement,
    isAcknowledged,
    acknowledgmentCount: announcement.acknowledgedBy?.length || 0,
    userVotedIndices,
    totalPollVotes
  };
};

const getPopulatedAnnouncement = async (id) => {
  return Announcement.findById(id)
    .populate('author', 'username nickname avatar')
    .lean();
};

/*
 * IMPORTANT:
 * Never broadcast formatAnnouncement() as the shared event payload.
 *
 * isAcknowledged and userVotedIndices are specific to one user.
 * Shared socket events must contain common announcement data.
 */

const getSharedAnnouncement = (announcement) => {
  if (!announcement) return null;

  const {
    isAcknowledged,
    userVotedIndices,
    ...shared
  } = announcement;

  return shared;
};

const emitAnnouncementEvent = (req, event, payload) => {
  const io = req.app.get('io');

  if (io) {
    io.emit(event, payload);
  }
};

const getPollStats = (poll) => {
  if (!poll || !Array.isArray(poll.options)) {
    return {
      totalPollVotes: 0,
      options: []
    };
  }

  let totalPollVotes = 0;

  const options = poll.options.map((option, index) => {
    const votes = option.votes || [];
    totalPollVotes += votes.length;

    return {
      optionIndex: index,
      text: option.text,
      voteCount: votes.length,
      percentage: 0
    };
  });

  options.forEach((option) => {
    option.percentage = totalPollVotes
      ? Math.round((option.voteCount / totalPollVotes) * 100)
      : 0;
  });

  return {
    totalPollVotes,
    options
  };
};

/* =========================================================
   GET ACTIVE ANNOUNCEMENTS
   GET /api/announcements
========================================================= */

const getActiveAnnouncements = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const userRole = req.user?.role || 'user';

    const now = new Date();

    const query = {
      isPublished: true,
      isArchived: false,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    if (userRole !== 'admin') {
      query.targetAudience = { $in: ['all', 'users'] };
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = announcements.map((announcement) =>
      formatAnnouncement(announcement, userId)
    );

    return res.json({
      success: true,
      announcements: formatted
    });
  } catch (error) {
    console.error('[Announcements Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements.'
    });
  }
};

/* =========================================================
   ACKNOWLEDGE ANNOUNCEMENT
   POST /api/announcements/:id/acknowledge
========================================================= */

const acknowledgeAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.'
      });
    }

    const alreadyAcknowledged = announcement.acknowledgedBy.some(
      (ack) => getUserId(ack.user) === userId.toString()
    );

    if (!alreadyAcknowledged) {
      announcement.acknowledgedBy.push({
        user: userId,
        acknowledgedAt: new Date()
      });

      await announcement.save();

      emitAnnouncementEvent(req, 'announcement:acknowledged', {
        announcementId: id,
        userId: userId.toString(),
        acknowledgmentCount: announcement.acknowledgedBy.length
      });
    }

    return res.json({
      success: true,
      message: 'Announcement acknowledged.',
      announcementId: id,
      isAcknowledged: true,
      acknowledgmentCount: announcement.acknowledgedBy.length
    });
  } catch (error) {
    console.error('[Acknowledge Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge announcement.'
    });
  }
};

/* =========================================================
   GET ALL ANNOUNCEMENTS FOR ADMIN
   GET /api/announcements/admin/all
========================================================= */

const getAllAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username nickname avatar')
      .lean();

    const formatted = announcements.map((announcement) =>
      formatAnnouncement(announcement, req.user._id)
    );

    return res.json({
      success: true,
      announcements: formatted
    });
  } catch (error) {
    console.error('[Admin Announcements Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin announcements.'
    });
  }
};

/* =========================================================
   CREATE ANNOUNCEMENT
   POST /api/announcements/admin
========================================================= */

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

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required.'
      });
    }

    let processedPoll = null;
    let willHavePoll = false;

    if (hasPoll) {
      if (!poll || !Array.isArray(poll.options)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid poll.'
        });
      }

      const validOptions = poll.options
        .map((option) =>
          typeof option === 'string'
            ? option.trim()
            : option?.text?.trim() || ''
        )
        .filter(Boolean);

      const uniqueOptions = [...new Set(validOptions)];

      if (uniqueOptions.length < 2 || uniqueOptions.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'A poll must have between 2 and 4 unique options.'
        });
      }

      willHavePoll = true;

      processedPoll = {
        question: (poll.question || title).trim(),
        options: uniqueOptions.map((text) => ({
          text,
          votes: []
        })),
        allowMultiple: Boolean(poll.allowMultiple),
        isClosed: false
      };
    }

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

    const populated = await getPopulatedAnnouncement(announcement._id);

    const formatted = formatAnnouncement(populated, req.user._id);

    // Broadcast shared data, not creator-specific voting state.
    emitAnnouncementEvent(req, 'announcement:new', {
      announcement: getSharedAnnouncement(populated),
      announcementId: announcement._id.toString()
    });

    await AuditLog.create({
      admin: req.user._id,
      action: 'create_announcement',
      target: announcement._id,
      targetModel: 'Announcement',
      details: `Published announcement "${announcement.title}" (${type}${willHavePoll ? ' with Poll' : ''})`
    }).catch(() => { });

    return res.status(201).json({
      success: true,
      announcement: formatted
    });
  } catch (error) {
    console.error('[Create Announcement Error]', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create announcement.'
    });
  }
};

/* =========================================================
   VOTE ON ANNOUNCEMENT POLL
   POST /api/announcements/:id/poll/vote
========================================================= */

const voteAnnouncementPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let index = req.body.optionIndex;

    if (
      index === undefined &&
      Array.isArray(req.body.optionIndexes) &&
      req.body.optionIndexes.length > 0
    ) {
      index = req.body.optionIndexes[0];
    }

    if (
      index === undefined ||
      index === null ||
      !Number.isInteger(Number(index))
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid optionIndex is required.'
      });
    }

    const optionIndex = Number(index);

    const announcement = await Announcement.findById(id);

    if (
      !announcement ||
      !announcement.hasPoll ||
      !announcement.poll
    ) {
      return res.status(404).json({
        success: false,
        message: 'Announcement poll not found.'
      });
    }

    if (announcement.poll.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'This poll is already closed.'
      });
    }

    const options = announcement.poll.options;

    if (
      optionIndex < 0 ||
      optionIndex >= options.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option index.'
      });
    }

    const allowMultiple = Boolean(announcement.poll.allowMultiple);
    const targetOption = options[optionIndex];

    const targetVotes = targetOption.votes || [];

    const alreadySelected = targetVotes.some(
      (vote) => getUserId(vote) === userId.toString()
    );

    // Remove the user's previous vote when single choice is enabled.
    if (!allowMultiple) {
      options.forEach((option) => {
        option.votes = (option.votes || []).filter(
          (vote) => getUserId(vote) !== userId.toString()
        );
      });
    }

    // Toggle the selected option.
    if (!alreadySelected) {
      if (!Array.isArray(targetOption.votes)) {
        targetOption.votes = [];
      }

      targetOption.votes.push(userId);
    }

    announcement.markModified('poll');

    await announcement.save();

    const populated = await getPopulatedAnnouncement(id);

    if (!populated) {
      return res.status(404).json({
        success: false,
        message: 'Announcement no longer exists.'
      });
    }

    const formatted = formatAnnouncement(populated, userId);
    const pollStats = getPollStats(populated.poll);

    /*
     * CRITICAL FIX:
     * The socket payload is now shared.
     *
     * It does not contain the acting user's:
     * - userVotedIndices
     * - isAcknowledged
     *
     * All connected clients receive the same poll state.
     */

    emitAnnouncementEvent(req, 'announcement:poll:voted', {
      announcementId: id,
      poll: populated.poll,
      pollStats,
      formatted,
      updatedBy: userId.toString(),
      action: alreadySelected ? 'removed' : 'voted'
    });

    return res.json({
      success: true,
      announcement: formatted,
      pollStats
    });
  } catch (error) {
    console.error('[Announcement Poll Vote Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to register vote.'
    });
  }
};

/* =========================================================
   CLOSE / REOPEN ANNOUNCEMENT POLL
   POST /api/announcements/admin/:id/poll/close
========================================================= */

const toggleAnnouncementPollClosed = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (
      !announcement ||
      !announcement.hasPoll ||
      !announcement.poll
    ) {
      return res.status(404).json({
        success: false,
        message: 'Announcement poll not found.'
      });
    }

    announcement.poll.isClosed = !announcement.poll.isClosed;

    announcement.poll.closedAt = announcement.poll.isClosed
      ? new Date()
      : null;

    await announcement.save();

    const populated = await getPopulatedAnnouncement(id);
    const formatted = formatAnnouncement(populated, req.user._id);

    emitAnnouncementEvent(req, 'announcement:poll:closed', {
      announcementId: id,
      isClosed: populated.poll.isClosed,
      poll: populated.poll,
      pollStats: getPollStats(populated.poll),
      formatted
    });

    return res.json({
      success: true,
      message: `Poll has been ${populated.poll.isClosed ? 'closed' : 'reopened'}.`,
      announcement: formatted
    });
  } catch (error) {
    console.error('[Close Announcement Poll Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update poll state.'
    });
  }
};

/* =========================================================
   UPDATE ANNOUNCEMENT
   PUT /api/announcements/admin/:id
========================================================= */

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      content,
      type,
      targetAudience,
      isPublished,
      isArchived,
      expiresAt,
      design
    } = req.body;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.'
      });
    }

    if (title !== undefined) announcement.title = title.trim();
    if (content !== undefined) announcement.content = content.trim();
    if (type !== undefined) announcement.type = type;
    if (targetAudience !== undefined) announcement.targetAudience = targetAudience;
    if (isPublished !== undefined) announcement.isPublished = Boolean(isPublished);
    if (isArchived !== undefined) announcement.isArchived = Boolean(isArchived);

    if (expiresAt !== undefined) {
      announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    if (design) {
      const currentDesign = announcement.design?.toObject
        ? announcement.design.toObject()
        : announcement.design || {};

      announcement.design = {
        ...currentDesign,
        ...design
      };

      announcement.markModified('design');
    }

    if (req.body.hasPoll !== undefined) {
      announcement.hasPoll = Boolean(req.body.hasPoll);

      if (!announcement.hasPoll) {
        announcement.poll = undefined;
      }
    }

    if (req.body.poll) {
      const incomingPoll = req.body.poll;

      const currentPoll = announcement.poll?.toObject
        ? announcement.poll.toObject()
        : announcement.poll || { options: [] };

      const currentOptions = currentPoll.options || [];

      const newOptions = Array.isArray(incomingPoll.options)
        ? incomingPoll.options
          .map((option, index) => {
            const text = typeof option === 'string'
              ? option.trim()
              : option?.text?.trim() || '';

            const existingOption = currentOptions[index];

            return {
              text,
              votes: existingOption?.votes || []
            };
          })
          .filter((option) => Boolean(option.text))
        : currentOptions;

      const uniqueTexts = new Set(
        newOptions.map((option) => option.text)
      );

      if (
        announcement.hasPoll &&
        (newOptions.length < 2 || uniqueTexts.size !== newOptions.length)
      ) {
        return res.status(400).json({
          success: false,
          message: 'A poll must have at least 2 unique options.'
        });
      }

      announcement.poll = {
        ...currentPoll,
        question: (incomingPoll.question || announcement.title || '').trim(),
        options: newOptions,
        allowMultiple:
          incomingPoll.allowMultiple !== undefined
            ? Boolean(incomingPoll.allowMultiple)
            : Boolean(currentPoll.allowMultiple),
        isClosed:
          incomingPoll.isClosed !== undefined
            ? Boolean(incomingPoll.isClosed)
            : Boolean(currentPoll.isClosed)
      };

      announcement.markModified('poll');
    }

    await announcement.save();

    const populated = await getPopulatedAnnouncement(id);
    const formatted = formatAnnouncement(populated, req.user._id);

    emitAnnouncementEvent(req, 'announcement:updated', {
      announcement: getSharedAnnouncement(populated),
      announcementId: id
    });

    await AuditLog.create({
      admin: req.user._id,
      action: 'update_announcement',
      target: announcement._id,
      targetModel: 'Announcement',
      details: `Updated announcement "${announcement.title}" (theme: ${announcement.design?.theme || 'default'})`
    }).catch(() => { });

    return res.json({
      success: true,
      announcement: formatted
    });
  } catch (error) {
    console.error('[Update Announcement Error]', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update announcement.'
    });
  }
};

/* =========================================================
   DELETE ANNOUNCEMENT
   DELETE /api/announcements/admin/:id
========================================================= */

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.'
      });
    }

    await AuditLog.create({
      admin: req.user._id,
      action: 'delete_announcement',
      target: id,
      targetModel: 'Announcement',
      details: `Deleted announcement "${announcement.title}"`
    }).catch(() => { });

    emitAnnouncementEvent(req, 'announcement:deleted', {
      announcementId: id
    });

    return res.json({
      success: true,
      message: 'Announcement deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Announcement Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement.'
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

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
