const express = require('express');
const router = express.Router();
const {
  getConversations,
  getOrCreatePrivateChat,
  togglePin,
  toggleArchive,
  toggleMute,
  deleteConversation,
  markAsRead
} = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getConversations);
router.post('/private', protect, getOrCreatePrivateChat);
router.post('/:id/pin', protect, togglePin);
router.post('/:id/archive', protect, toggleArchive);
router.post('/:id/mute', protect, toggleMute);
router.delete('/:id', protect, deleteConversation);
router.post('/:id/read', protect, markAsRead);

module.exports = router;
