const express = require('express');
const router = express.Router();
const {
  getActiveAnnouncements,
  acknowledgeAnnouncement,
  getAllAnnouncementsAdmin,
  createAnnouncement,
  voteAnnouncementPoll,
  toggleAnnouncementPollClosed,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');

// Public or User-authenticated routes
router.get('/', protect, getActiveAnnouncements);
router.post('/:id/acknowledge', protect, acknowledgeAnnouncement);
router.post('/:id/poll/vote', protect, voteAnnouncementPoll);

// Protected Admin management routes
router.get('/admin/all', protect, requireAdmin, getAllAnnouncementsAdmin);
router.post('/admin', protect, requireAdmin, createAnnouncement);
router.post('/admin/:id/poll/close', protect, requireAdmin, toggleAnnouncementPollClosed);
router.put('/admin/:id', protect, requireAdmin, updateAnnouncement);
router.delete('/admin/:id', protect, requireAdmin, deleteAnnouncement);

module.exports = router;
