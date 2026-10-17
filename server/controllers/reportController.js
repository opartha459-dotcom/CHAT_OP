const Report = require('../models/Report');
const User = require('../models/User');

// @desc Submit a report for a user, message, or group
// @route POST /api/reports
const createReport = async (req, res) => {
  try {
    const { reportedUserId, reportedMessageId, reportedGroupId, category, reason } = req.body;
    const currentUserId = req.user._id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required for submitting a report.' });
    }

    if (!reportedUserId && !reportedMessageId && !reportedGroupId) {
      return res.status(400).json({ success: false, message: 'Please specify the user, message, or group being reported.' });
    }

    const report = await Report.create({
      reporter: currentUserId,
      reportedUser: reportedUserId || null,
      reportedMessage: reportedMessageId || null,
      reportedGroup: reportedGroupId || null,
      category: category || 'spam',
      reason: reason.trim(),
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our moderation team will review it.',
      reportId: report._id
    });
  } catch (error) {
    console.error('[Create Report Error]', error);
    return res.status(500).json({ success: false, message: 'Error submitting report.' });
  }
};

// @desc Get reports created by current user
// @route GET /api/reports/my
const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate('reportedUser', 'username nickname')
      .populate('reportedGroup', 'groupDetails.name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching reports.' });
  }
};

module.exports = {
  createReport,
  getMyReports
};
